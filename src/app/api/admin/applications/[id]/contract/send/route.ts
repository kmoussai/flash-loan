/**
 * API Route: Send Contract
 *
 * POST /api/admin/applications/[id]/contract/send
 *
 * Sends a contract to the client (marks as sent)
 * Automatically signs the contract with staff signature when sending (updates database only, no PDF generation)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getContractByApplicationId,
  getContractById,
  sendContract
} from '@/src/lib/supabase/contract-helpers'
import {
  createServerSupabaseClient,
  createServerSupabaseAdminClient
} from '@/src/lib/supabase/server'
import { generateContractSentEmail } from '@/src/lib/email/templates/contract-sent'
import { sendEmail } from '@/src/lib/email/smtp'
import { getAppUrl } from '@/src/lib/config'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; contract_id: string } }
) {
  try {
    const applicationId = params.id
    const contractId = params.contract_id

    if (!applicationId && !contractId) {
      return NextResponse.json(
        { error: 'Params ID is required' },
        { status: 400 }
      )
    }

    // Verify staff authentication
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

    // Verify user is staff
    const adminClient = createServerSupabaseAdminClient()
    const { data: staffData, error: staffError } = await (adminClient as any)
      .from('staff')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Forbidden: Staff access required' },
        { status: 403 }
      )
    }

    const staffId = (staffData as any).id

    const body = await request.json()
    const { method = 'email' } = body

    if (!['email', 'sms', 'portal'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid send method. Must be email, sms, or portal' },
        { status: 400 }
      )
    }

    // Get contract with full details
    const contractResult = contractId
      ? await getContractById(contractId)
      : await getContractByApplicationId(applicationId, true)

    if (!contractResult.success || !contractResult.data) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const contract = contractResult.data

    // Check if contract is already signed by staff
    if (!contract.staff_signed_at) {
      // Sign contract with staff signature - only update database fields
      const signedAt = new Date().toISOString()

      // Update contract with staff signature (no PDF generation needed)
      const { error: updateError } = await (adminClient as any)
        .from('loan_contracts')
        .update({
          staff_signed_at: signedAt,
          staff_signature_id: staffId
        })
        .eq('id', contract.id)

      if (updateError) {
        console.error(
          '[POST /api/admin/applications/:id/contract/send] Failed to update contract with staff signature:',
          updateError
        )
        return NextResponse.json(
          {
            error: 'Failed to save staff signature',
            details: updateError.message
          },
          { status: 500 }
        )
      }

      console.log(
        `[POST /api/admin/applications/:id/contract/send] Contract signed by staff ${staffId} at ${signedAt}`
      )
    } else {
      console.log(
        '[POST /api/admin/applications/:id/contract/send] Contract already signed by staff, proceeding to send'
      )
    }

    // If sending via email, fetch client information and send email notification
    if (method === 'email') {
      // Get application with client information
      const { data: applicationData, error: appError } = await (
        adminClient as any
      )
        .from('loan_applications')
        .select(
          `
          id,
          loan_amount,
          users!loan_applications_client_id_fkey (
            id,
            first_name,
            last_name,
            email,
            preferred_language
          )
        `
        )
        .eq('id', applicationId)
        .single()

      if (appError || !applicationData) {
        console.error(
          '[POST /api/admin/applications/:id/contract/send] Failed to fetch application data:',
          appError
        )
        // Continue with marking as sent even if email fails
      } else {
        const client = (applicationData as any).users
        if (client && client.email) {
          const preferredLanguage = (client.preferred_language || 'en') as
            | 'en'
            | 'fr'
          const dashboardUrl = `${getAppUrl()}/${preferredLanguage}/client/dashboard?section=contracts`

          // Generate email
          const emailData = generateContractSentEmail({
            firstName: client.first_name || 'Client',
            lastName: client.last_name || '',
            email: client.email,
            contractNumber: contract.contract_number
              ? String(contract.contract_number)
              : null,
            loanAmount: applicationData.loan_amount,
            dashboardUrl,
            preferredLanguage,
            expiresAt: contract.expires_at || null
          })

          // Send email
          const emailResult = await sendEmail({
            to: client.email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text
          })

          if (!emailResult.success) {
            console.error(
              '[POST /api/admin/applications/:id/contract/send] Failed to send email:',
              emailResult.error
            )
            // Continue with marking as sent even if email fails
          } else {
            console.log(
              `[POST /api/admin/applications/:id/contract/send] Contract notification email sent to ${client.email}`
            )
          }
        } else {
          console.warn(
            '[POST /api/admin/applications/:id/contract/send] No client email found, skipping email notification'
          )
        }
      }
    }

    // Now send the contract (mark as sent)
    const sendResult = await sendContract(
      contract.id,
      method as 'email' | 'sms' | 'portal',
      true
    )

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send contract' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      contract: sendResult.data
    })
  } catch (error: any) {
    console.error('Error sending contract:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
