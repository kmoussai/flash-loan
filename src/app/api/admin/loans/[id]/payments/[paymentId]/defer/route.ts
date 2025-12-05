import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentUpdate, LoanPayment, LoanPaymentInsert } from '@/src/lib/supabase/types'
import { Loan } from '@/src/types';

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/loans/[id]/payments/[paymentId]/defer
 * Defer a payment to the end of the schedule with optional fee
 * Sets current payment amount, interest, and principal to 0
 * Creates a new payment at the end with original amount (+ fee if applicable)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  try {
    const { id: loanId, paymentId } = params

    if (!loanId || !paymentId) {
      return NextResponse.json(
        { error: 'Loan ID and Payment ID are required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { move_to_end, fee_amount, add_fee_to_payment } = body

    if (!move_to_end) {
      return NextResponse.json(
        { error: 'move_to_end flag is required' },
        { status: 400 }
      )
    }

    const feeAmount = fee_amount ? Number(fee_amount) : 0
    if (isNaN(feeAmount) || feeAmount < 0) {
      return NextResponse.json(
        { error: 'Fee amount must be a positive number' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    // Get current loan to access remaining_balance
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('remaining_balance')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    const currentRemainingBalance = Number((loan as Loan).remaining_balance || 0)

    // Verify payment belongs to loan and get current payment data
    const { data: payment, error: fetchError } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('loan_id', loanId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found or does not belong to this loan' },
        { status: 404 }
      )
    }

    // Type assertion for payment
    const paymentData = payment as LoanPayment

    // Only allow deferring pending payments
    if (paymentData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending payments can be deferred' },
        { status: 400 }
      )
    }

    // Get all payments for this loan to find the last one
    const { data: allPayments, error: paymentsError } = await supabase
      .from('loan_payments')
      .select('id, payment_date, payment_number')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json(
        { error: 'Failed to fetch payment schedule' },
        { status: 500 }
      )
    }

    if (!allPayments || allPayments.length === 0) {
      return NextResponse.json(
        { error: 'No payments found for this loan' },
        { status: 404 }
      )
    }

    // Type assertion for payments
    const paymentsList = allPayments as Array<{
      id: string
      payment_date: string
      payment_number: number | null
    }>

    // Find the last payment date (excluding the current payment being deferred)
    const lastPayment = paymentsList.find(p => p.id !== paymentId) || paymentsList[0]
    const lastPaymentDate = new Date(lastPayment.payment_date)
    
    // Calculate new payment date (day after last payment)
    const newPaymentDate = new Date(lastPaymentDate)
    newPaymentDate.setDate(newPaymentDate.getDate() + 1)

    // Get max payment number
    const maxPaymentNumber = paymentsList.reduce((max, p) => {
      return Math.max(max, p.payment_number || 0)
    }, 0)

    const now = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Store original payment amount
    const originalAmount = Number(paymentData.amount)
    const originalInterest = Number(paymentData.interest || 0)
    const originalPrincipal = Number(paymentData.principal || 0)

    // Step 1: Set current payment amount, interest, and principal to 0, and status to deferred
    const updates: LoanPaymentUpdate = {
      amount: 0,
      interest: 0,
      principal: 0,
      status: 'deferred'
    }

    // Add deferral note - always include fee amount if there's a fee for cumulative fees calculation
    const feeNote = feeAmount > 0 ? `, deferral fee: ${feeAmount.toFixed(2)}` : ''
    const noteText = `Payment deferred. Original amount: ${originalAmount.toFixed(2)}${feeNote}.`
    const existingNotes = paymentData.notes || ''
    updates.notes = existingNotes
      ? `${existingNotes}\n${noteText}`
      : noteText

    // Update the current payment
    const { error: updateError } = await (supabase
      .from('loan_payments') as any)
      .update(updates)
      .eq('id', paymentId)

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update payment' },
        { status: 500 }
      )
    }

    // Step 2: Update loan remaining balance if there's a fee
    // The fee should always be added to remaining balance, regardless of add_fee_to_payment
    if (feeAmount > 0) {
      const newRemainingBalance = currentRemainingBalance + feeAmount
      const { error: updateLoanError } = await (supabase
        .from('loans') as any)
        .update({ remaining_balance: newRemainingBalance })
        .eq('id', loanId)

      if (updateLoanError) {
        console.error('Error updating loan remaining balance:', updateLoanError)
        // Try to revert the payment update
        await (supabase
          .from('loan_payments') as any)
          .update({
            amount: originalAmount,
            interest: originalInterest,
            principal: originalPrincipal,
            status: 'pending'
          })
          .eq('id', paymentId)
        
        return NextResponse.json(
          { error: 'Failed to update loan remaining balance' },
          { status: 500 }
        )
      }
    }

    // Step 3: Create new payment at the end with original amount (+ fee if add_fee_to_payment is true)
    const newPaymentAmount = originalAmount + (add_fee_to_payment && feeAmount > 0 ? feeAmount : 0)
    
    // Always include fee in notes for cumulative fees calculation, even if not added to payment amount
    const newPaymentNote = feeAmount > 0
      ? `Deferred payment from #${paymentData.payment_number || 'N/A'}${add_fee_to_payment ? ` (includes deferral fee of ${feeAmount.toFixed(2)} in amount)` : ` (deferral fee of ${feeAmount.toFixed(2)} added to loan balance)`}.`
      : `Deferred payment from #${paymentData.payment_number || 'N/A'}.`
    
    const newPaymentInsert: LoanPaymentInsert = {
      loan_id: loanId,
      amount: newPaymentAmount,
      interest: originalInterest,
      principal: originalPrincipal,
      payment_date: newPaymentDate.toISOString(),
      status: 'pending',
      method: null,
      payment_number: maxPaymentNumber + 1,
      notes: newPaymentNote
    }

    const { data: newPayment, error: insertError } = await (supabase
      .from('loan_payments') as any)
      .insert(newPaymentInsert)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating new payment:', insertError)
      // Try to revert the updates
      await (supabase
        .from('loan_payments') as any)
        .update({
          amount: originalAmount,
          interest: originalInterest,
          principal: originalPrincipal,
          status: 'pending'
        })
        .eq('id', paymentId)
      
      // Revert remaining balance if fee was added
      if (feeAmount > 0) {
        await (supabase
          .from('loans') as any)
          .update({ remaining_balance: currentRemainingBalance })
          .eq('id', loanId)
      }
      
      return NextResponse.json(
        { error: 'Failed to create deferred payment' },
        { status: 500 }
      )
    }

    const feeMessage = feeAmount > 0
      ? add_fee_to_payment
        ? ` Payment deferred to end. New payment amount: $${newPaymentAmount.toFixed(2)} (original + fee). Fee added to remaining balance.`
        : ` Payment deferred to end. New payment amount: $${newPaymentAmount.toFixed(2)}. Deferral fee of $${feeAmount.toFixed(2)} added to remaining balance.`
      : ` Payment deferred to end. New payment amount: $${newPaymentAmount.toFixed(2)}.`

    return NextResponse.json({
      success: true,
      payment: newPayment,
      message: feeMessage
    })
  } catch (error: any) {
    console.error('Error deferring payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

