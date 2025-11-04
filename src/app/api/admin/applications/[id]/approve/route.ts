import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import type { LoanInsert, LoanApplicationUpdate } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/applications/[id]/approve
 * Approve a loan application and create a loan record
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

    // First, fetch the application details
    const { data: application, error: appError } = await supabase
      .from('loan_applications')
      .select('id, loan_amount, client_id, application_status')
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
    }

    // Check if application is already approved
    if (app.application_status === 'approved') {
      return NextResponse.json(
        { error: 'Application is already approved' },
        { status: 400 }
      )
    }

    // Check if a loan already exists for this application
    const { data: existingLoan } = await supabase
      .from('loans')
      .select('id')
      .eq('application_id', applicationId)
      .single()

    if (existingLoan) {
      return NextResponse.json(
        { error: 'A loan already exists for this application' },
        { status: 400 }
      )
    }

    // Default values for loan terms (these can be configured or passed as request body)
    // For now, using defaults:
    // - Interest rate: 29% APR (as mentioned in the project)
    // - Term: 6 months (180 days / 30 days per month)
    const interestRate = 29.0 // 29% APR
    const termMonths = 6 // Default 6 months

    // Create the loan record
    const loanData: LoanInsert = {
      application_id: applicationId,
      user_id: app.client_id,
      principal_amount: app.loan_amount,
      interest_rate: interestRate,
      term_months: termMonths,
      remaining_balance: app.loan_amount,
      status: 'pending_disbursement'
    }
    
    const { data: loan, error: loanError } = await (supabase
      .from('loans') as any)
      .insert(loanData)
      .select()
      .single()

    if (loanError) {
      console.error('Error creating loan:', loanError)
      return NextResponse.json(
        { error: 'Failed to create loan', details: loanError.message },
        { status: 500 }
      )
    }

    if (!loan) {
      return NextResponse.json(
        { error: 'Failed to create loan - no data returned' },
        { status: 500 }
      )
    }

    // Update application status to approved and set approved_at timestamp
    const updateData: LoanApplicationUpdate = {
      application_status: 'approved',
      approved_at: new Date().toISOString()
    }
    
    const { error: updateError } = await (supabase
      .from('loan_applications') as any)
      .update(updateData)
      .eq('id', applicationId)

    if (updateError) {
      console.error('Error updating application status:', updateError)
      
      // Note: In production, use a database transaction to ensure atomicity
      // For now, we return an error and log the issue
      // The loan record exists but application status wasn't updated
      console.error('CRITICAL: Loan created but application status update failed. Loan ID:', loan.id)

      return NextResponse.json(
        { error: 'Failed to update application status', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Application approved and loan created successfully',
      loan: loan,
      application: {
        id: applicationId,
        status: 'approved'
      }
    })
  } catch (error: any) {
    console.error('Error in approve application API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
