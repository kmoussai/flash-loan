import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentUpdate, LoanPayment, LoanPaymentInsert } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/loans/[id]/payments/[paymentId]/defer
 * Defer a payment to a new date with optional fee
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
    const { new_payment_date, fee_amount, charge_fee_immediately } = body

    if (!new_payment_date) {
      return NextResponse.json(
        { error: 'New payment date is required' },
        { status: 400 }
      )
    }

    // Validate date format
    const newDate = new Date(new_payment_date)
    if (isNaN(newDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid payment date format' },
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

    const updates: LoanPaymentUpdate = {}
    const now = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Update payment date
    updates.payment_date = newDate.toISOString()

    // Handle fee based on option
    if (feeAmount > 0) {
      if (charge_fee_immediately) {
        // Add fee to current payment amount
        updates.amount = Number(paymentData.amount) + feeAmount
        const noteText = `[${now}] Payment deferred to ${newDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}. Deferral fee of ${feeAmount.toFixed(2)} charged immediately.`
        const existingNotes = paymentData.notes || ''
        updates.notes = existingNotes
          ? `${existingNotes}\n${noteText}`
          : noteText
      } else {
        // Create a separate fee payment entry at the end
        // First, get all payments for this loan to find the last one
        const { data: allPayments, error: paymentsError } = await supabase
          .from('loan_payments')
          .select('id, payment_date, payment_number')
          .eq('loan_id', loanId)
          .order('payment_date', { ascending: false })

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError)
        } else if (allPayments && allPayments.length > 0) {
          // Type assertion for payments
          const paymentsList = allPayments as Array<{
            id: string
            payment_date: string
            payment_number: number | null
          }>

          // Find the last payment date
          const lastPayment = paymentsList[0]
          const lastPaymentDate = new Date(lastPayment.payment_date)
          
          // Create a new payment entry for the fee
          const feePaymentDate = new Date(lastPaymentDate)
          feePaymentDate.setDate(feePaymentDate.getDate() + 1) // Day after last payment

          const maxPaymentNumber = paymentsList.reduce((max, p) => {
            return Math.max(max, p.payment_number || 0)
          }, 0)

          const feePaymentInsert: LoanPaymentInsert = {
            loan_id: loanId,
            amount: feeAmount,
            payment_date: feePaymentDate.toISOString(),
            status: 'pending',
            method: null,
            payment_number: maxPaymentNumber + 1,
            notes: `[${now}] Deferral fee for payment #${paymentData.payment_number || 'N/A'} deferred to ${newDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
          }

          const { error: feePaymentError } = await (supabase
            .from('loan_payments') as any)
            .insert(feePaymentInsert)

          if (feePaymentError) {
            console.error('Error creating fee payment:', feePaymentError)
            return NextResponse.json(
              { error: 'Failed to create fee payment entry' },
              { status: 500 }
            )
          }
        }

        // Add note to original payment
        const noteText = `[${now}] Payment deferred to ${newDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}. Deferral fee of ${feeAmount.toFixed(2)} will be charged at the end.`
        const existingNotes = paymentData.notes || ''
        updates.notes = existingNotes
          ? `${existingNotes}\n${noteText}`
          : noteText
      }
    } else {
      // No fee, just add deferral note
      const noteText = `[${now}] Payment deferred to ${newDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}.`
      const existingNotes = paymentData.notes || ''
      updates.notes = existingNotes
        ? `${existingNotes}\n${noteText}`
        : noteText
    }

    // Update the payment
    const { data: updatedPayment, error: updateError } = await (supabase
      .from('loan_payments') as any)
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to defer payment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: charge_fee_immediately
        ? `Payment deferred. Fee of $${feeAmount.toFixed(2)} charged immediately.`
        : `Payment deferred. Fee of $${feeAmount.toFixed(2)} will be charged at the end.`
    })
  } catch (error: any) {
    console.error('Error deferring payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

