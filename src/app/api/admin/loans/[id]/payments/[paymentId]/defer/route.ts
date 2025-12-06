import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import {
  LoanPaymentUpdate,
  LoanPayment,
  LoanPaymentInsert,
  PaymentFrequency
} from '@/src/lib/supabase/types'
import { Loan } from '@/src/types'
import { parseLocalDate } from '@/src/lib/utils/date'
import { calculateBreakdownUntilZero } from '@/src/lib/loan'
import { roundCurrency } from '@/src/lib/loan'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/loans/[id]/payments/[paymentId]/defer
 * Defer a payment and recalculate the entire payment schedule
 *
 * When a payment is deferred:
 * 1. Mark the deferred payment as 'deferred' with amount/interest/principal = 0
 * 2. Calculate remaining principal at deferral moment
 * 3. Calculate deferred interest for the deferred period
 * 4. Add deferral fee (if any)
 * 5. Recalculate payment schedule with new principal until balance reaches 0
 * 6. Update all future pending payments with recalculated values
 * 7. Insert new payments if schedule requires more periods
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
    const { fee_amount } = body

    const feeAmount = fee_amount ? Number(fee_amount) : 0
    if (isNaN(feeAmount) || feeAmount < 0) {
      return NextResponse.json(
        { error: 'Fee amount must be a positive number' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    // Get loan details including interest_rate
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, remaining_balance, interest_rate, application_id')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const loanData = loan as Loan & {
      interest_rate: number | null
      application_id: string | null
    }
    const currentRemainingBalance = Number(loanData.remaining_balance || 0)
    const interestRate = Number(loanData.interest_rate || 29) // Default to 29% if not set

    // Get contract to retrieve payment frequency
    let paymentFrequency: PaymentFrequency = 'monthly' // Default
    let paymentAmount: number = 0

    if (loanData.application_id) {
      const { data: contract } = await supabase
        .from('loan_contracts')
        .select('contract_terms')
        .eq('loan_application_id', loanData.application_id)
        .order('contract_version', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (contract) {
        const contractData = contract as { contract_terms: any }
        if (contractData.contract_terms) {
          const terms = contractData.contract_terms
          if (terms.payment_frequency) {
            paymentFrequency = terms.payment_frequency as PaymentFrequency
          }
          if (terms.payment_amount) {
            paymentAmount = Number(terms.payment_amount)
          }
        }
      }
    }

    // If we couldn't get payment amount from contract, get it from the first payment
    if (paymentAmount === 0) {
      const { data: firstPayment } = await supabase
        .from('loan_payments')
        .select('amount')
        .eq('loan_id', loanId)
        .order('payment_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstPayment) {
        const paymentData = firstPayment as { amount: number }
        if (paymentData.amount) {
          paymentAmount = Number(paymentData.amount)
        }
      }
    }

    if (paymentAmount === 0) {
      return NextResponse.json(
        {
          error:
            'Could not determine payment amount. Please ensure loan has a contract or payments.'
        },
        { status: 400 }
      )
    }

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

    const paymentData = payment as LoanPayment

    // Only allow deferring pending payments
    if (paymentData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending payments can be deferred' },
        { status: 400 }
      )
    }

    // Get all payments for this loan, ordered by payment_date
    const { data: allPayments, error: paymentsError } = await supabase
      .from('loan_payments')
      .select(
        'id, payment_date, payment_number, status, amount, interest, principal, remaining_balance'
      )
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: true })

    type PaymentRow = {
      id: string
      payment_date: string
      payment_number: number | null
      status: string
      amount: number
      interest: number | null
      principal: number | null
      remaining_balance: number | null
    }

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
    const paymentsList = (allPayments || []) as PaymentRow[]

    // Find the deferred payment index
    const deferredPaymentIndex = paymentsList.findIndex(p => p.id === paymentId)
    if (deferredPaymentIndex === -1) {
      return NextResponse.json(
        { error: 'Deferred payment not found in schedule' },
        { status: 404 }
      )
    }

    // Get all payments before the deferred payment (already paid or confirmed)
    const paymentsBeforeDeferral = paymentsList.slice(0, deferredPaymentIndex)

    // Calculate remaining principal at the moment of deferral
    // This is the balance after all previous payments have been applied
    let remainingPrincipal = currentRemainingBalance

    // Subtract principal from all confirmed/paid payments before the deferred one
    for (const prevPayment of paymentsBeforeDeferral) {
      if (prevPayment.status === 'paid' || prevPayment.status === 'confirmed') {
        const principalPaid = Number(prevPayment.principal || 0)
        remainingPrincipal = Math.max(0, remainingPrincipal - principalPaid)
      }
    }

    // Calculate deferred interest for the deferred payment period
    // Interest = remainingPrincipal * periodicRate
    const config = {
      weekly: { paymentsPerYear: 52 },
      'bi-weekly': { paymentsPerYear: 26 },
      'twice-monthly': { paymentsPerYear: 24 },
      monthly: { paymentsPerYear: 12 }
    }[paymentFrequency] || { paymentsPerYear: 12 }

    const periodicRate = interestRate / 100 / config.paymentsPerYear
    const deferredInterest = remainingPrincipal * periodicRate

    // Calculate new principal: remainingPrincipal + deferredInterest + deferralFee
    const newPrincipal = remainingPrincipal + deferredInterest + feeAmount

    // Get the deferred payment's date as the first payment date for recalculation
    const deferredPaymentDate = parseLocalDate(paymentData.payment_date)
    const firstPaymentDateStr = deferredPaymentDate.toISOString().split('T')[0]

    // Recalculate payment schedule with new principal
    const recalculatedBreakdown = calculateBreakdownUntilZero({
      startingBalance: newPrincipal,
      paymentAmount: paymentAmount,
      paymentFrequency: paymentFrequency,
      interestRate: interestRate,
      firstPaymentDate: firstPaymentDateStr,
      maxPeriods: 1000
    })

    if (recalculatedBreakdown.length === 0) {
      return NextResponse.json(
        { error: 'Failed to recalculate payment schedule' },
        { status: 500 }
      )
    }

    // Get all future pending payments (including the deferred one)
    const futurePayments = paymentsList
      .slice(deferredPaymentIndex)
      .filter(p => p.status === 'pending')

    // Step 1: Mark the deferred payment as deferred
    const deferredPaymentUpdate: LoanPaymentUpdate = {
      amount: 0,
      interest: 0,
      principal: 0,
      status: 'deferred',
      notes: `Payment deferred. Original amount: ${Number(paymentData.amount).toFixed(2)}, interest: ${Number(paymentData.interest || 0).toFixed(2)}, principal: ${Number(paymentData.principal || 0).toFixed(2)}.${feeAmount > 0 ? ` Deferral fee: ${feeAmount.toFixed(2)}.` : ''}`
    }

    const { error: updateDeferredError } = await (
      supabase.from('loan_payments') as any
    )
      .update(deferredPaymentUpdate)
      .eq('id', paymentId)

    if (updateDeferredError) {
      console.error('Error updating deferred payment:', updateDeferredError)
      return NextResponse.json(
        { error: 'Failed to update deferred payment' },
        { status: 500 }
      )
    }

    // Step 2: Update loan remaining balance with new principal (includes deferred interest + fee)
    const { error: updateLoanError } = await (supabase.from('loans') as any)
      .update({ remaining_balance: newPrincipal })
      .eq('id', loanId)

    if (updateLoanError) {
      console.error('Error updating loan remaining balance:', updateLoanError)
      // Try to revert the payment update
      await (supabase.from('loan_payments') as any)
        .update({
          amount: paymentData.amount,
          interest: paymentData.interest,
          principal: paymentData.principal,
          status: 'pending',
          notes: paymentData.notes
        })
        .eq('id', paymentId)

      return NextResponse.json(
        { error: 'Failed to update loan remaining balance' },
        { status: 500 }
      )
    }

    // Step 3: Update existing future payments with recalculated values
    const paymentsToUpdate: Array<{ id: string; update: LoanPaymentUpdate }> =
      []
    const paymentsToInsert: LoanPaymentInsert[] = []

    // Map existing future payments to recalculated breakdown
    for (
      let i = 0;
      i < Math.max(futurePayments.length, recalculatedBreakdown.length);
      i++
    ) {
      const breakdownItem = recalculatedBreakdown[i]

      if (!breakdownItem) {
        // More existing payments than recalculated - mark extra as cancelled
        if (i < futurePayments.length) {
          const existingPayment = futurePayments[i]
          if (existingPayment.id !== paymentId) {
            paymentsToUpdate.push({
              id: existingPayment.id,
              update: {
                status: 'cancelled',
                notes:
                  'Payment cancelled due to schedule recalculation after deferral.'
              }
            })
          }
        }
        continue
      }

      if (i < futurePayments.length) {
        // Update existing payment
        const existingPayment = futurePayments[i]

        // Skip the deferred payment (already updated)
        if (existingPayment.id === paymentId) {
          continue
        }

        paymentsToUpdate.push({
          id: existingPayment.id,
          update: {
            payment_date: breakdownItem.dueDate,
            amount: roundCurrency(breakdownItem.amount),
            interest: roundCurrency(breakdownItem.interest),
            principal: roundCurrency(breakdownItem.principal),
            remaining_balance: roundCurrency(breakdownItem.remainingBalance),
            status: 'pending'
          }
        })
      } else {
        // Insert new payment
        paymentsToInsert.push({
          loan_id: loanId,
          payment_date: breakdownItem.dueDate,
          amount: roundCurrency(breakdownItem.amount),
          interest: roundCurrency(breakdownItem.interest),
          principal: roundCurrency(breakdownItem.principal),
          remaining_balance: roundCurrency(breakdownItem.remainingBalance),
          payment_number: breakdownItem.paymentNumber,
          status: 'pending',
          notes: 'new payment'
        })
      }
    }

    // Update existing payments
    for (const { id, update } of paymentsToUpdate) {
      const { error: updateError } = await (
        supabase.from('loan_payments') as any
      )
        .update(update)
        .eq('id', id)

      if (updateError) {
        console.error(`Error updating payment ${id}:`, updateError)
        // Continue with other updates even if one fails
      }
    }

    // Insert new payments if needed
    if (paymentsToInsert.length > 0) {
      const { error: insertError } = await (
        supabase.from('loan_payments') as any
      ).insert(paymentsToInsert)

      if (insertError) {
        console.error('Error inserting new payments:', insertError)
        return NextResponse.json(
          { error: 'Failed to create new payments' },
          { status: 500 }
        )
      }
    }

    // Get updated payment schedule to return
    const { data: updatedPayments } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: true })

    const feeMessage =
      feeAmount > 0
        ? ` Payment deferred. Deferral fee of $${feeAmount.toFixed(2)} added to loan balance. Schedule recalculated.`
        : ` Payment deferred. Schedule recalculated.`

    return NextResponse.json({
      success: true,
      message: feeMessage,
      deferredPayment: {
        id: paymentId,
        status: 'deferred',
        amount: 0,
        interest: 0,
        principal: 0
      },
      recalculatedSchedule: recalculatedBreakdown,
      updatedPayments: updatedPayments || [],
      newPrincipal: roundCurrency(newPrincipal),
      deferredInterest: roundCurrency(deferredInterest)
    })
  } catch (error: any) {
    console.error('Error deferring payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
