import type {
  LoanPayment,
  LoanPaymentUpdate,
  PaymentStatus,
  PaymentFrequency
} from '../types'
import { recalculatePaymentSchedule, roundCurrency } from '@/src/lib/loan'
import { updateLoanPaymentsFromBreakdown } from '../payment-schedule-helpers'
import { handleScheduleRecalculationForZumRails } from '@/src/lib/payment-providers/zumrails'
import { Loan } from '@/src/types/loan'

interface FailedPaymentRecalculationParams {
  supabase: any
  loan: Loan & { interest_rate: number | null; application_id: string | null }
  loanId: string
  payment: LoanPayment
  payments: LoanPayment[]
  paymentFrequency: PaymentFrequency
  paymentAmount: number
  failedPaymentFee: number
}

export async function applyFailedPaymentRecalculation({
  supabase,
  loan,
  loanId,
  payment,
  payments,
  paymentFrequency,
  paymentAmount,
  failedPaymentFee
}: FailedPaymentRecalculationParams): Promise<void> {
  const currentRemainingBalance = Number(loan.remaining_balance || 0)
  const interestRate = Number(loan.interest_rate || 29)

  // Find index of this payment in full payment list (ordered by payment_date ascending)
  const paymentsList = payments
  const failedPaymentIndex = paymentsList.findIndex((p) => p.id === payment.id)

  if (failedPaymentIndex === -1) {
    throw new Error('Failed payment not found in payments list')
  }

  // Remaining principal before this payment
  let remainingPrincipal = currentRemainingBalance
  if (failedPaymentIndex > 0) {
    const previousPayment = paymentsList[failedPaymentIndex - 1]
    if (
      previousPayment.remaining_balance !== null &&
      previousPayment.remaining_balance !== undefined
    ) {
      remainingPrincipal = Number(previousPayment.remaining_balance)
    }
  }

  // Use existing interest for this period if present
  const failedPaymentInterest = Number(payment.interest || 0)

  // Negative principal = -(fees + interest)
  const negativePrincipal = -(failedPaymentFee + failedPaymentInterest)

  // New principal = remainingPrincipal + failedInterest + failedPaymentFee
  const newPrincipal =
    remainingPrincipal + failedPaymentInterest + failedPaymentFee

  // Determine next payment date after the failed one
  let nextPaymentDate: string = payment.payment_date

  const nextPendingPayment = paymentsList.find(
    (p, index) =>
      index > failedPaymentIndex &&
      p.status === 'pending' &&
      p.payment_date > payment.payment_date
  )

  if (nextPendingPayment) {
    nextPaymentDate = nextPendingPayment.payment_date
  } else {
    const { addDays, addMonths, addWeeks } = await import('date-fns')
    const failedDate = new Date(payment.payment_date)

    switch (paymentFrequency) {
      case 'weekly':
        nextPaymentDate = addWeeks(failedDate, 1).toISOString().split('T')[0]
        break
      case 'bi-weekly':
        nextPaymentDate = addWeeks(failedDate, 2).toISOString().split('T')[0]
        break
      case 'twice-monthly':
        nextPaymentDate = addDays(failedDate, 15).toISOString().split('T')[0]
        break
      case 'monthly':
      default:
        nextPaymentDate = addMonths(failedDate, 1).toISOString().split('T')[0]
        break
    }
  }

  // Recalculate schedule with new principal from next payment date
  const recalculationResult = recalculatePaymentSchedule({
    newRemainingBalance: newPrincipal,
    paymentAmount: paymentAmount,
    paymentFrequency,
    interestRate,
    firstPaymentDate: nextPaymentDate,
    maxPeriods: 1000
  })

  const recalculatedBreakdown = recalculationResult.recalculatedBreakdown

  // 1. Update the failed payment row
  const failedPaymentUpdate: LoanPaymentUpdate = {
    status: 'failed',
    amount: 0,
    principal: roundCurrency(negativePrincipal),
    interest: 0,
    remaining_balance: roundCurrency(newPrincipal),
    notes: `Failed payment. Added interest: ${roundCurrency(
      failedPaymentInterest
    )}, Failed payment fee: ${roundCurrency(failedPaymentFee)}`,
    error_code: 'NSF'
  }

  const { error: updateFailedError } = await (
    supabase.from('loan_payments') as any
  )
    .update(failedPaymentUpdate)
    .eq('id', payment.id)

  if (updateFailedError) {
    console.error('[LoanPayments] Error updating failed payment:', updateFailedError)
    throw updateFailedError
  }

  // 2. Update loan remaining balance
  const { error: updateLoanError } = await (supabase.from('loans') as any)
    .update({
      remaining_balance: roundCurrency(newPrincipal),
      updated_at: new Date().toISOString()
    })
    .eq('id', loanId)

  if (updateLoanError) {
    console.error('[LoanPayments] Error updating loan balance:', updateLoanError)
    // Try to rollback payment status
    await (supabase.from('loan_payments') as any)
      .update({ status: 'pending', notes: null, error_code: null })
      .eq('id', payment.id)
    throw updateLoanError
  }

  // 3. Update future payments from breakdown
  const updateResult = await updateLoanPaymentsFromBreakdown(
    loanId,
    recalculatedBreakdown,
    nextPaymentDate
  )

  if (!updateResult.success && updateResult.errors.length > 0) {
    console.error(
      '[LoanPayments] Error updating payments from breakdown:',
      updateResult.errors
    )
  }

  // 4. Handle ZumRails schedule recalculation (non-blocking)
  handleScheduleRecalculationForZumRails({
    loanId,
    reason: `Payment schedule recalculated after failed payment ${payment.id}. Added interest: ${roundCurrency(
      failedPaymentInterest
    ).toFixed(2)}, fee: ${roundCurrency(failedPaymentFee).toFixed(2)}`
  }).catch((err: any) => {
    console.error(
      '[LoanPayments] Error handling ZumRails transactions after failed payment:',
      err
    )
  })
}

export async function applySuccessfulPaymentEffects(
  supabase: any,
  loan: Loan,
  payment: LoanPayment
): Promise<void> {
  // If remaining_balance is already tracked on the payment, use that
  if (payment.remaining_balance !== null && payment.remaining_balance !== undefined) {
    const { error } = await (supabase.from('loans') as any)
      .update({
        remaining_balance: roundCurrency(Number(payment.remaining_balance)),
        updated_at: new Date().toISOString()
      })
      .eq('id', loan.id)

    if (error) {
      console.error(
        '[LoanPayments] Error updating loan balance from payment.remaining_balance:',
        error
      )
    }
    return
  }

  // Fallback: subtract payment.amount from remaining_balance, not below 0
  const currentRemaining = Number(loan.remaining_balance || 0)
  const newRemaining = roundCurrency(
    Math.max(0, currentRemaining - Number(payment.amount || 0))
  )

  const { error } = await (supabase.from('loans') as any)
    .update({
      remaining_balance: newRemaining,
      updated_at: new Date().toISOString()
    })
    .eq('id', loan.id)

  if (error) {
    console.error(
      '[LoanPayments] Error updating loan remaining balance after successful payment:',
      error
    )
  }
}

