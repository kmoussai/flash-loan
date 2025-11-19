import { NextRequest, NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createServerSupabaseAdminClient
} from '@/src/lib/supabase/server'
import { createNotification } from '@/src/lib/supabase'
import type { NotificationCategory } from '@/src/types'
import { buildContractTermsFromApplication } from '@/src/lib/contracts/terms'
import type { PaymentFrequency } from '@/src/types'
import { createAcceptPayCustomer } from '@/src/lib/supabase/accept-pay-helpers'
import {
  generateSignedContractPDF,
  generateComplianceMetadata
} from '@/src/lib/contracts/html-to-pdf'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id
    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    const adminClient = createServerSupabaseAdminClient()
    const { data: contractRow, error: contractError } = await adminClient
      .from('loan_contracts' as any)
      .select(
        `
          *,
          loan_applications!inner (
            id,
            client_id
          ),
          loan:loans (
            id,
            loan_number,
            principal_amount,
            interest_rate,
            term_months,
            disbursement_date,
            due_date,
            remaining_balance,
            status
          )
        `
      )
      .eq('id', contractId)
      .maybeSingle()

    if (contractError || !contractRow) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    const application = (contractRow as any).loan_applications
    if (!application || application.client_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this contract' },
        { status: 403 }
      )
    }

    if ((contractRow as any).client_signed_at) {
      return NextResponse.json(
        { error: 'Contract already signed' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const signatureMethod =
      typeof body?.signatureMethod === 'string'
        ? body.signatureMethod
        : 'click_to_sign'
    const signatureName =
      typeof body?.signatureName === 'string' && body.signatureName.trim()
        ? body.signatureName.trim()
        : null
    const device = typeof body?.signedFromDevice === 'string' ? body.signedFromDevice : undefined

    if (!signatureName) {
      return NextResponse.json(
        { error: 'Signature name is required' },
        { status: 400 }
      )
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'Unknown'
    const userAgent = request.headers.get('user-agent') ?? 'Unknown'
    const signedAt = new Date().toISOString()

    // Generate signed PDF
    let pdfResult: Awaited<ReturnType<typeof generateSignedContractPDF>> | null = null
    let signedDocumentPath: string | null = null

    try {
      pdfResult = await generateSignedContractPDF(
        contractRow as any,
        signatureName,
        signedAt
      )

      // Upload PDF to Supabase storage
      // Convert Uint8Array to Buffer for proper upload
      const pdfBuffer = Buffer.from(pdfResult.pdfBytes)
      
      const bucket = adminClient.storage.from('contracts')
      const { error: uploadError, data: uploadData } = await bucket.upload(
        pdfResult.filePath,
        pdfBuffer,
        {
          contentType: 'application/pdf',
          upsert: false,
          cacheControl: '3600'
        }
      )

      if (uploadError) {
        console.error(
          '[POST /api/user/contracts/:id/sign] Failed to upload signed PDF:',
          uploadError
        )
        // Continue even if upload fails - we'll still save the hash
      } else {
        // Store the file path (without bucket prefix, as bucket is implicit)
        signedDocumentPath = pdfResult.filePath
      }
    } catch (pdfError) {
      console.error(
        '[POST /api/user/contracts/:id/sign] Failed to generate signed PDF:',
        pdfError
      )
      // Continue with signing even if PDF generation fails
      // The contract can be signed without PDF, but PDF is preferred
    }

    // Generate compliance metadata
    const complianceMetadata = pdfResult
      ? generateComplianceMetadata(
          contractRow as any,
          signatureName,
          signedAt,
          ip,
          userAgent,
          pdfResult.hash
        )
      : null

    const { data: updated, error: updateError } = await (adminClient as any)
      .from('loan_contracts')
      .update({
        contract_status: 'signed',
        client_signed_at: signedAt,
        contract_document_path: signedDocumentPath || undefined,
        client_signature_data: {
          signature_method: signatureMethod,
          signature_name: signatureName,
          ip_address: ip,
          user_agent: userAgent,
          signature_timestamp: signedAt,
          signed_from_device: device ?? null,
          pdf_hash: pdfResult?.hash || null,
          compliance_metadata: complianceMetadata || null
        }
      })
      .eq('id', contractId)
      .select(`
        *,
        loan_applications!inner (
          id,
          application_status,
          loan_amount,
          client_id,
          assigned_to,
          users:client_id (
            id,
            first_name,
            last_name
          )
        ),
        loan:loans (
          id,
          principal_amount,
          disbursement_date,
          due_date,
          remaining_balance
        )
      `)
      .single()

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to sign contract' },
        { status: 500 }
      )
    }

    try {
      const updatedContract = updated as any
      // Payment schedule is stored in contract_terms.payment_schedule (source of truth)
      const contractTerms = updatedContract.contract_terms as {
        payment_schedule?: Array<{
          due_date: string
          amount: number
          principal?: number
          interest?: number
        }>
        payment_frequency?: PaymentFrequency
      } | null
      const schedule = contractTerms?.payment_schedule ?? []

      if (updatedContract.loan && schedule.length > 0) {
        const lastDue = schedule[schedule.length - 1]
        const principalAmount =
          Number(updatedContract.loan?.principal_amount) ||
          Number(updatedContract.contract_terms?.principal_amount) ||
          null

        // Update loan basic fields
        // Note: payment_schedule is stored in contract_terms.payment_schedule, not in loans table
        const { error: loanError } = await (adminClient as any)
          .from('loans')
          .update({
            disbursement_date: updatedContract.loan?.disbursement_date ?? signedAt,
            due_date: lastDue?.due_date ?? updatedContract.loan?.due_date ?? null,
            remaining_balance:
              updatedContract.loan?.remaining_balance ?? principalAmount
          })
          .eq('id', updatedContract.loan.id)

        if (loanError) {
          console.error(
            '[POST /api/user/contracts/:id/sign] Failed to update loan:',
            loanError
          )
        }

        // Populate payment schedule to loan_payment_schedule table for payment processing/tracking
        // This creates individual records for each scheduled payment
        if (schedule.length > 0) {
          try {
            // Format dates properly (ensure YYYY-MM-DD format for date type)
            const scheduleEntries = schedule.map((item: any, index: number) => {
              // Extract date part if it's a full ISO timestamp
              let scheduledDate = item.due_date
              if (scheduledDate && scheduledDate.includes('T')) {
                scheduledDate = scheduledDate.split('T')[0]
              }

              return {
                loan_id: updatedContract.loan.id,
                scheduled_date: scheduledDate,
                amount: Number(item.amount) || 0,
                payment_number: index + 1,
                status: 'pending' as const
              }
            })

            // Delete existing schedule entries for this loan (if any) to avoid duplicates
            const { error: deleteError } = await (adminClient as any)
              .from('loan_payment_schedule')
              .delete()
              .eq('loan_id', updatedContract.loan.id)

            if (deleteError) {
              console.warn(
                '[POST /api/user/contracts/:id/sign] Could not delete existing payment schedule entries:',
                deleteError
              )
            }

            // Insert new schedule entries
            const { data: insertedSchedule, error: scheduleError } = await (adminClient as any)
              .from('loan_payment_schedule')
              .insert(scheduleEntries)
              .select()

            if (scheduleError) {
              console.error(
                '[POST /api/user/contracts/:id/sign] Failed to populate payment schedule to loan_payment_schedule table:',
                scheduleError
              )
              // Log but don't fail - contract_terms.payment_schedule is the source of truth
            } else {
              console.log(
                `[POST /api/user/contracts/:id/sign] Successfully populated ${insertedSchedule?.length || scheduleEntries.length} payment schedule entries for loan ${updatedContract.loan.id}`
              )
            }
          } catch (scheduleSyncError: any) {
            // Non-critical error - payment schedule is in contract_terms
            console.error(
              '[POST /api/user/contracts/:id/sign] Error populating payment schedule to loan_payment_schedule table:',
              scheduleSyncError?.message || scheduleSyncError
            )
          }
        } else {
          console.warn(
            '[POST /api/user/contracts/:id/sign] No payment schedule found in contract_terms for loan',
            updatedContract.loan.id
          )
        }
      }
    } catch (paymentError) {
      console.error('[POST /api/user/contracts/:id/sign] Failed to prepare payment schedule:', paymentError)
      // Don't fail the request - payment schedule is stored in contract_terms.payment_schedule
    }

    try {
      const notificationMetadata = {
        type: 'contract_event' as const,
        contractId: updated.id,
        loanApplicationId: updated.loan_application_id,
        contractNumber: updated.contract_number ?? null,
        sentAt: updated.sent_at ?? null,
        viewedAt: null,
        signedAt,
        event: 'signed' as const
      }

      await createNotification(
        {
          recipientId: user.id,
          recipientType: 'client',
          title: 'Contract signed successfully',
          message: 'Thank you! We have received your signed contract.',
          category: 'contract_signed' as NotificationCategory,
          metadata: notificationMetadata
        },
        { client: adminClient }
      )
    } catch (notificationError) {
      console.error('[POST /api/user/contracts/:id/sign] Failed to create client notification:', notificationError)
    }

    // Notify staff that contract was signed
    try {
      const updatedContract = updated as any
      const application = updatedContract.loan_applications
      const clientInfo = application?.users

      // Fetch all staff members
      const staffRecipients = new Set<string>()
      const { data: adminStaff } = await (adminClient as any)
        .from('staff')
        .select('id, role')
        .in('role', ['admin', 'support'])

      adminStaff?.forEach((staff: { id: string } | null) => {
        if (staff?.id) {
          staffRecipients.add(staff.id)
        }
      })

      // Also add assigned staff if available
      if (application?.assigned_to) {
        staffRecipients.add(application.assigned_to)
      }

      if (staffRecipients.size > 0) {
        const clientFirstName = clientInfo?.first_name ?? ''
        const clientLastName = clientInfo?.last_name ?? ''
        const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ').trim()

        const contractNumber = updatedContract.contract_number
          ? `Contract #${updatedContract.contract_number}`
          : 'A contract'

        await Promise.all(
          Array.from(staffRecipients).map(staffId =>
            createNotification(
              {
                recipientId: staffId,
                recipientType: 'staff',
                title: 'Contract signed',
                message: clientName
                  ? `${clientName} signed ${contractNumber.toLowerCase()}.`
                  : `${contractNumber} has been signed by a client.`,
                category: 'contract_signed' as NotificationCategory,
                metadata: {
                  type: 'contract_event' as const,
                  contractId: updatedContract.id,
                  loanApplicationId: application?.id,
                  contractNumber: updatedContract.contract_number ?? null,
                  sentAt: updatedContract.sent_at ?? null,
                  viewedAt: null,
                  signedAt,
                  event: 'signed' as const
                }
              },
              { client: adminClient }
            )
          )
        )
      }
    } catch (staffNotificationError) {
      console.error('[POST /api/user/contracts/:id/sign] Failed to create staff notification:', staffNotificationError)
    }

    // Create Accept Pay customer when contract is signed
    try {
      const updatedContract = updated as any
      const application = updatedContract.loan_applications
      const clientId = application?.client_id

      if (clientId) {
        const customerResult = await createAcceptPayCustomer(clientId, true)
        if (!customerResult.success) {
          console.warn(
            `[POST /api/user/contracts/:id/sign] Failed to create Accept Pay customer for user ${clientId}:`,
            customerResult.error
          )
          // Don't fail the request if Accept Pay customer creation fails
          // This can be retried later
        }
      }
    } catch (acceptPayError) {
      console.error('[POST /api/user/contracts/:id/sign] Error creating Accept Pay customer:', acceptPayError)
      // Don't fail the request if Accept Pay customer creation fails
    }

    return NextResponse.json({
      success: true,
      contract: updated
    })
  } catch (error: any) {
    console.error('[POST /api/user/contracts/:id/sign] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

