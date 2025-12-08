import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import {
  LoanPaymentUpdate,
  LoanPayment,
  PaymentFrequency
} from '@/src/lib/supabase/types'
import { Loan } from '@/src/types'
import { parseLocalDate } from '@/src/lib/utils/date'
import { recalculatePaymentSchedule, roundCurrency } from '@/src/lib/loan'
import { updateLoanPaymentsFromBreakdown } from '@/src/lib/supabase/payment-schedule-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/loans/[id]/payments/[paymentId]/simulate-failed
 * Simulate a failed payment and recalculate the entire payment schedule
 *
 * When a payment fails:
 * 1. Mark the payment as 'failed'
 * 2. Calculate failed interest for that payment period
 * 3. Add origination fee (from contract terms)
 * 4. Calculate new principal = currentBalance + failedInterest + originationFee
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

    // Get contract to retrieve payment frequency and fees
    let paymentFrequency: PaymentFrequency = 'monthly' // Default
    let paymentAmount: number = 0
    let failedPaymentFee: number = 0

    if (loanId) {
      const { data: contract } = await supabase
        .from('loan_contracts')
        .select('contract_terms')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (contract && (contract as any).contract_terms) {
        const contractTerms = (contract as any).contract_terms
        paymentFrequency =
          (contractTerms.payment_frequency as PaymentFrequency) || 'monthly'
        paymentAmount = Number(contractTerms.payment_amount || 0)
        // Use failed_payment_fee from contract terms, fallback to 55 if not set
        failedPaymentFee =
          Number(contractTerms.fees?.failed_payment_fee || 0) || 55
      }
    }

    // Get all payments to find the failed payment and calculate remaining principal
    const { data: payments, error: paymentsError } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: true })

    if (paymentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      )
    }

    const paymentsList = (payments || []) as LoanPayment[]
    const failedPaymentIndex = paymentsList.findIndex(
      (p) => p.id === paymentId
    )

    if (failedPaymentIndex === -1) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const failedPayment = paymentsList[failedPaymentIndex]

    // Only allow simulating failure on pending payments
    if (failedPayment.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Cannot simulate failure on payment with status: ${failedPayment.status}. Only pending payments can be failed.`
        },
        { status: 400 }
      )
    }

    // Calculate remaining principal at the time of this payment
    // This is the balance before this payment would be applied
    let remainingPrincipal = currentRemainingBalance

    // If this is not the first payment, find the previous payment's remaining balance
    if (failedPaymentIndex > 0) {
      const previousPayment = paymentsList[failedPaymentIndex - 1]
      if (
        previousPayment.remaining_balance !== null &&
        previousPayment.remaining_balance !== undefined
      ) {
        remainingPrincipal = Number(previousPayment.remaining_balance)
      }
    }

    // Calculate failed payment interest (interest for this payment period)
    const config = {
      weekly: { paymentsPerYear: 52 },
      'bi-weekly': { paymentsPerYear: 26 },
      'twice-monthly': { paymentsPerYear: 24 },
      monthly: { paymentsPerYear: 12 }
    }[paymentFrequency] || { paymentsPerYear: 12 }

    const failedPaymentInterest = Number(failedPayment.interest || 0)

    // Calculate negative principal: -(fees + interest)
    const negativePrincipal = -(failedPaymentFee + failedPaymentInterest)

    // Calculate new principal: remainingPrincipal + failedInterest + originationFee
    const newPrincipal =
      remainingPrincipal + failedPaymentInterest + failedPaymentFee

     // Get the next payment date after the failed payment
    // Find the next pending payment, or calculate based on payment frequency
    let nextPaymentDate: string = failedPayment.payment_date
    
    // Look for the next pending payment after the failed one
    const nextPendingPayment = paymentsList.find(
      (p, index) => 
        index > failedPaymentIndex && 
        p.status === 'pending' &&
        p.payment_date > failedPayment.payment_date
    )
    
    if (nextPendingPayment) {
      nextPaymentDate = nextPendingPayment.payment_date
    } else {
      // Calculate next payment date based on payment frequency
      const { addDays, addMonths, addWeeks } = await import('date-fns')
      const failedDate = new Date(failedPayment.payment_date)
      
      switch (paymentFrequency) {
        case 'weekly':
          nextPaymentDate = addWeeks(failedDate, 1).toISOString().split('T')[0]
          break
        case 'bi-weekly':
          nextPaymentDate = addWeeks(failedDate, 2).toISOString().split('T')[0]
          break
        case 'twice-monthly':
          // For twice-monthly, add approximately 15 days
          nextPaymentDate = addDays(failedDate, 15).toISOString().split('T')[0]
          break
        case 'monthly':
        default:
          nextPaymentDate = addMonths(failedDate, 1).toISOString().split('T')[0]
          break
      }
    }

    // Recalculate payment schedule starting from the next payment date
    const recalculationResult = recalculatePaymentSchedule({
      newRemainingBalance: newPrincipal,
      paymentAmount: paymentAmount,
      paymentFrequency: paymentFrequency,
      interestRate: interestRate,
      firstPaymentDate: nextPaymentDate,
      maxPeriods: 1000
    })

    const recalculatedBreakdown = recalculationResult.recalculatedBreakdown

    // Start transaction: Update failed payment, update loan balance, update/insert future payments
    // Note: Supabase doesn't support transactions directly, so we'll do operations sequentially
    // and rollback manually if any fails

    // 1. Update the failed payment
    // Principal should be negative (fees + interest), interest = 0, amount = 0, remaining_balance = new principal
    const failedPaymentUpdate: LoanPaymentUpdate = {
      status: 'failed',
      amount: 0,
      principal: roundCurrency(negativePrincipal),
      interest: 0,
      remaining_balance: roundCurrency(newPrincipal),
      notes: `Simulated failed payment. Added interest: ${formatCurrency(
        failedPaymentInterest
      )}, Failed payment fee: ${formatCurrency(failedPaymentFee)}`,
      error_code: 'NSF'
    }

    const { error: updateFailedError } = await (
      supabase.from('loan_payments') as any
    )
      .update(failedPaymentUpdate)
      .eq('id', paymentId)

    if (updateFailedError) {
      console.error('Error updating failed payment:', updateFailedError)
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      )
    }

    // 2. Update loan remaining balance
    const { error: updateLoanError } = await (
      supabase.from('loans') as any
    )
      .update({
        remaining_balance: roundCurrency(newPrincipal),
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId)

    if (updateLoanError) {
      console.error('Error updating loan balance:', updateLoanError)
      // Try to rollback payment status
      await (supabase.from('loan_payments') as any)
        .update({ status: 'pending', notes: null, error_code: null })
        .eq('id', paymentId)
      return NextResponse.json(
        { error: 'Failed to update loan balance' },
        { status: 500 }
      )
    }

    // 3. Update existing future payments with recalculated values
    // Use the helper function which will automatically:
    // - Skip the failed payment (it's now in preserved statuses)
    // - Update future pending payments by index
    // - Create new payments as needed
    // - Cancel extra payments
    const updateResult = await updateLoanPaymentsFromBreakdown(
      loanId,
      recalculatedBreakdown,
      nextPaymentDate // Start from the next payment date after the failed payment
    )

    if (!updateResult.success && updateResult.errors.length > 0) {
      console.error('Error updating payments from breakdown:', updateResult.errors)
      // Don't fail the request, but log the errors
    }

    return NextResponse.json({
      success: true,
      message: 'Payment failed and schedule recalculated',
      failedPayment: {
        id: paymentId,
        interest: roundCurrency(failedPaymentInterest),
        fee: roundCurrency(failedPaymentFee),
        newPrincipal: roundCurrency(newPrincipal)
      },
      recalculatedBreakdown: recalculatedBreakdown
    })
  } catch (error: any) {
    console.error('Error simulating failed payment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2
  }).format(amount)
}

