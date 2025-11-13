import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createNotification } from '@/src/lib/supabase'
import type { LoanApplicationUpdate } from '@/src/lib/supabase/types'
import type { NotificationCategory } from '@/src/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/applications/[id]/approve
 * Approve a loan application (does NOT create loan - loan is created after contract is signed)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // Parse payload (loan amount is optional; defaults to application.loan_amount)
    let payload: any = {}
    try {
      payload = await request.json()
    } catch {
      payload = {}
    }

    // First, fetch the application details with client info
    const { data: application, error: appError } = await supabase
      .from('loan_applications')
      .select(`
        id, 
        loan_amount, 
        client_id, 
        application_status, 
        interest_rate,
        users:client_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      console.error('Error fetching application:', appError)
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Type assertion for selected fields
    const app = application as {
      id: string
      loan_amount: number
      client_id: string
      application_status: string
      interest_rate: number | null
      users?: {
        id: string
        first_name: string | null
        last_name: string | null
      } | null
    }

    // Check if application is already pre-approved
    if (app.application_status === 'pre_approved' || app.application_status === 'approved') {
      return NextResponse.json(
        { error: 'Application is already pre-approved' },
        { status: 400 }
      )
    }

    // Update application status to pre_approved and set approved_at timestamp
    const updateData: LoanApplicationUpdate = {
      application_status: 'pre_approved',
      approved_at: new Date().toISOString()
    }
    
    const { error: updateError } = await (supabase
      .from('loan_applications') as any)
      .update(updateData)
      .eq('id', applicationId)

    if (updateError) {
      console.error('Error updating application status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update application status', details: updateError.message },
        { status: 500 }
      )
    }

    // Create a pending loan immediately upon pre-approval
    const normalizeAmount = (raw: unknown, fallback: number) => {
      const n = Number(raw)
      if (!Number.isFinite(n) || n <= 0) return fallback
      return Math.round(n * 100) / 100
    }
    const principalAmount = normalizeAmount(payload?.loanAmount, app.loan_amount)
    const interestRate = Number.isFinite(app.interest_rate ?? NaN) ? (app.interest_rate as number) : 29
    const termMonths = 3

    const { data: createdLoan, error: loanError } = await (supabase
      .from('loans') as any)
      .insert({
        application_id: app.id,
        user_id: app.client_id,
        principal_amount: principalAmount,
        interest_rate: interestRate,
        term_months: termMonths,
        disbursement_date: null,
        due_date: null,
        remaining_balance: principalAmount,
        status: 'pending_disbursement'
      })
      .select('*')
      .single()

    if (loanError) {
      console.error('Error creating pending loan:', loanError)
      return NextResponse.json(
        { error: 'Failed to create loan', details: loanError.message },
        { status: 500 }
      )
    }

    // Create notification for client
    try {
      const clientInfo = app.users
      const clientFirstName = clientInfo?.first_name ?? ''
      const clientLastName = clientInfo?.last_name ?? ''
      const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ').trim() || 'Client'
      
      const loanAmountFormatted = new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
      }).format(principalAmount)

      await createNotification(
        {
          recipientId: app.client_id,
          recipientType: 'client',
          title: 'Loan application pre-approved',
          message: `Congratulations! Your loan application for ${loanAmountFormatted} has been pre-approved.`,
          category: 'application_pre_approved' as NotificationCategory,
          metadata: {
            type: 'application_event',
            loanApplicationId: app.id,
            clientId: app.client_id,
            status: 'pre_approved',
            submittedAt: null,
            preApprovedAt: new Date().toISOString()
          }
        },
        { client: supabase }
      )
    } catch (notificationError) {
      console.error('[POST /api/admin/applications/:id/approve] Failed to create client notification:', notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application pre-approved and pending loan created.',
      application: {
        id: applicationId,
        status: 'pre_approved'
      },
      loan: createdLoan
    })
  } catch (error: any) {
    console.error('Error in approve application API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
