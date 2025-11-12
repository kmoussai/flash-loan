import { NextRequest, NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createServerSupabaseAdminClient
} from '@/src/lib/supabase/server'
import { createNotification } from '@/src/lib/supabase'
import type { NotificationCategory } from '@/src/types'
import { buildContractTermsFromApplication } from '@/src/lib/contracts/terms'
import type { PaymentFrequency } from '@/src/types'

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
          id,
          loan_application_id,
          contract_status,
          client_signed_at,
          loan_applications!inner (
            id,
            client_id
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
    const device = typeof body?.signedFromDevice === 'string' ? body.signedFromDevice : undefined

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'Unknown'
    const userAgent = request.headers.get('user-agent') ?? 'Unknown'
    const signedAt = new Date().toISOString()

    const { data: updated, error: updateError } = await (adminClient as any)
      .from('loan_contracts')
      .update({
        contract_status: 'signed',
        client_signed_at: signedAt,
        client_signature_data: {
          signature_method: signatureMethod,
          ip_address: ip,
          user_agent: userAgent,
          signature_timestamp: signedAt,
          signed_from_device: device ?? null
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

        const { error: loanError } = await (adminClient as any)
          .from('loans')
          .update({
            payment_schedule: schedule,
            disbursement_date: updatedContract.loan?.disbursement_date ?? signedAt,
            due_date: lastDue?.due_date ?? updatedContract.loan?.due_date ?? null,
            remaining_balance:
              updatedContract.loan?.remaining_balance ?? principalAmount
          })
          .eq('id', updatedContract.loan.id)

        if (loanError) {
          console.error(
            '[POST /api/user/contracts/:id/sign] Failed to update loan schedule:',
            loanError
          )
        }
      }
    } catch (paymentError) {
      console.error('[POST /api/user/contracts/:id/sign] Failed to prepare payment schedule:', paymentError)
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

