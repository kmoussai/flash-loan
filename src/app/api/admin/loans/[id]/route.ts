import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/loans/[id]
 * Fetch loan details by ID (admin/staff only)
 * Returns loan with related application, user info, and payment history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loanId = params.id

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()
    const searchParams = request.nextUrl.searchParams
    const paymentStatusFilter = searchParams.get('status')

    // Fetch loan with related data
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        loan_number,
        application_id,
        user_id,
        principal_amount,
        interest_rate,
        term_months,
        disbursement_date,
        due_date,
        remaining_balance,
        status,
        crmStatus: crm_original_data->>status,
        created_at,
        updated_at,
        crmContractPath: crm_original_data->>pdfFile,
        loan_applications (
          id,
          loan_amount,
          application_status,
          income_source,
          created_at,
          submitted_at,
          approved_at
        ),
        users!loans_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          preferred_language
        ),
        loan_contracts (
          id,
          contract_number,
          contract_status,
          contract_version,
          contract_document_path,
          sent_at,
          sent_method,
          client_signed_at,
          contract_terms
        )
      `)
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      console.error('Error fetching loan:', loanError)
      return NextResponse.json(
        { error: 'Loan not found', details: loanError?.message },
        { status: 404 }
      )
    }

    const loanData = loan as any

    // Fetch payment history for this loan
    // By default, exclude cancelled payments unless explicitly requested via ?status=cancelled
    let paymentsQuery = supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)

    if (paymentStatusFilter) {
      paymentsQuery = paymentsQuery.eq('status', paymentStatusFilter)
    } else {
      paymentsQuery = paymentsQuery.neq('status', 'cancelled')
    }

    const { data: payments, error: paymentsError } = await paymentsQuery.order(
      'payment_date',
      { ascending: false }
    )

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      // Don't fail if payments can't be fetched, just log it
    }

    // Fetch payment schedule for this loan
    const { data: paymentSchedule, error: scheduleError } = await supabase
      .from('loan_payment_schedule')
      .select('*')
      .eq('loan_id', loanId)
      .order('scheduled_date', { ascending: true })

    if (scheduleError) {
      console.error('Error fetching payment schedule:', scheduleError)
      // Don't fail if schedule can't be fetched, just log it
    }

    // Calculate payment statistics
    const paymentsList = (payments || []) as any[]
    const totalPaid = paymentsList
      .filter((p: any) => p.status === 'confirmed')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)
    
    const totalPending = paymentsList
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)

    const totalFailed = paymentsList
      .filter((p: any) => p.status === 'failed')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)

    return NextResponse.json({
      loan: loanData,
      payments: paymentsList,
      paymentSchedule: paymentSchedule || [],
      statistics: {
        totalPaid,
        totalPending,
        totalFailed,
        totalPayments: paymentsList.length,
        confirmedPayments: paymentsList.filter((p: any) => p.status === 'confirmed').length,
        remainingBalance: loanData.remaining_balance,
        principalAmount: loanData.principal_amount
      }
    })
  } catch (error: any) {
    console.error('Error in admin loan details API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
