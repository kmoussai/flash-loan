import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentInsert } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/loans/[id]/payments/manual
 * Create a manual payment and update the loan's remaining_balance
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: loanId } = params

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { payment_date, amount, notes, mark_loan_as_paid } = body

    // Validation
    if (!payment_date) {
      return NextResponse.json(
        { error: 'Payment date is required' },
        { status: 400 }
      )
    }

    const paymentAmount = Number(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      )
    }

    // Validate date format
    const paymentDate = new Date(payment_date)
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid payment date format' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    // Get the loan to check remaining balance, status, and get payment number
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, remaining_balance, status')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    const typedLoan = loan as { id: string; remaining_balance: number | null; status: string }
    const currentRemainingBalance = Number(typedLoan.remaining_balance || 0)

    // Check if payment amount exceeds remaining balance
    if (paymentAmount > currentRemainingBalance) {
      return NextResponse.json(
        { error: `Payment amount cannot exceed remaining balance of $${currentRemainingBalance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Get the max payment number for this loan
    const { data: existingPayments } = await supabase
      .from('loan_payments')
      .select('payment_number')
      .eq('loan_id', loanId)
      .order('payment_number', { ascending: false })
      .limit(1)

    const maxPaymentNumber = existingPayments && existingPayments.length > 0
      ? ((existingPayments[0] as { payment_number: number | null })?.payment_number || 0)
      : 0

    // Calculate new remaining balance
    const newRemainingBalance = Math.max(0, currentRemainingBalance - paymentAmount)

    // Determine if loan should be marked as completed
    const shouldMarkAsCompleted = mark_loan_as_paid === true && newRemainingBalance === 0

    // Create the manual payment
    const paymentInsert: LoanPaymentInsert = {
      loan_id: loanId,
      amount: paymentAmount,
      payment_date: paymentDate.toISOString(),
      status: 'manual',
      method: 'manual',
      payment_number: maxPaymentNumber + 1,
      notes: notes || `Manual payment created on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
    }

    // Prepare loan update
    const loanUpdate: { remaining_balance: number; status?: string } = {
      remaining_balance: newRemainingBalance
    }

    // Mark loan as completed if requested and balance is 0
    if (shouldMarkAsCompleted) {
      loanUpdate.status = 'completed'
    }

    // Use a transaction-like approach: update loan and create payment
    // First, update the loan's remaining balance (and status if needed)
    const { error: updateLoanError } = await (supabase
      .from('loans') as any)
      .update(loanUpdate)
      .eq('id', loanId)

    if (updateLoanError) {
      console.error('Error updating loan remaining balance:', updateLoanError)
      return NextResponse.json(
        { error: 'Failed to update loan remaining balance' },
        { status: 500 }
      )
    }

    // Then, create the payment
    const { data: newPayment, error: paymentError } = await (supabase
      .from('loan_payments') as any)
      .insert(paymentInsert)
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      // Try to revert the loan update
      await (supabase
        .from('loans') as any)
        .update({ 
          remaining_balance: currentRemainingBalance,
          status: typedLoan.status // Revert status as well
        })
        .eq('id', loanId)
      
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      )
    }

    const successMessage = shouldMarkAsCompleted
      ? `Manual payment of $${paymentAmount.toFixed(2)} created successfully. Loan marked as completed.`
      : `Manual payment of $${paymentAmount.toFixed(2)} created successfully. Remaining balance: $${newRemainingBalance.toFixed(2)}`

    return NextResponse.json({
      success: true,
      payment: newPayment,
      remaining_balance: newRemainingBalance,
      loan_status: shouldMarkAsCompleted ? 'completed' : typedLoan.status,
      message: successMessage
    })
  } catch (error: any) {
    console.error('Error creating manual payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

