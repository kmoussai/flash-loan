import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserType } from '@/src/lib/supabase/db-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/loans/[id]
 * Fetch loan details by ID for authenticated user (clients see only their own loans)
 * Returns loan with related application and payment history
 * RLS ensures users can only access their own loans
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

    const supabase = await createServerSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    // Check if user is a client
    const userType = await getUserType(user.id, true)
    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only. Use /api/admin/loans/[id] for admin access.' },
        { status: 403 }
      )
    }

    // Fetch loan with related data
    // RLS policy ensures users only see their own loans
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        application_id,
        principal_amount,
        interest_rate,
        term_months,
        disbursement_date,
        due_date,
        remaining_balance,
        status,
        created_at,
        updated_at,
        loan_applications (
          id,
          loan_amount,
          application_status
        )
      `)
      .eq('id', loanId)
      .eq('user_id', user.id) // Extra safety check
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
    // RLS ensures users only see payments for their own loans
    const { data: payments, error: paymentsError } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      // Don't fail if payments can't be fetched, just log it
    }

    // Calculate payment statistics
    const paymentsList = (payments || []) as any[]
    const totalPaid = paymentsList
      .filter((p: any) => p.status === 'confirmed')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)
    
    const totalPending = paymentsList
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)

    const nextPaymentDue = paymentsList
      .filter((p: any) => p.status === 'pending')
      .sort((a: any, b: any) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())[0]

    return NextResponse.json({
      loan: loanData,
      payments: paymentsList,
      statistics: {
        totalPaid,
        totalPending,
        totalPayments: paymentsList.length,
        confirmedPayments: paymentsList.filter((p: any) => p.status === 'confirmed').length,
        remainingBalance: loanData.remaining_balance,
        principalAmount: loanData.principal_amount,
        nextPaymentDue: nextPaymentDue || null
      }
    })
  } catch (error: any) {
    console.error('Error in user loan details API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
