import { Loan } from '@/src/types/loan'
import { createServerSupabaseAdminClient } from '../server'
import type {
  LoanPayment,
  PaymentStatus,
  PaymentFrequency
} from '../types'
import { applyFailedPaymentRecalculation, applySuccessfulPaymentEffects } from './helpers'

export interface UpdateLoanPaymentStatusParams {
  loanId: string
  paymentId: string
  newStatus: PaymentStatus
  /**
   * Optional: when called from admin APIs that already know these values
   */
  paymentFrequencyOverride?: PaymentFrequency
  failedPaymentFeeOverride?: number
}

export interface UpdateLoanPaymentStatusResult {
  success: boolean
  error?: string
}

/**
 * Central helper to update a loan payment status and trigger side effects.
 *
 * Behaviour:
 * - When status becomes 'confirmed' or 'paid':
 *   - Update loan.remaining_balance using the payment row (remaining_balance if present, else amount).
 * - When status becomes 'failed':
 *   - Recalculate schedule with fees and update future payments, using the same rules
 *     as the simulate-failed endpoint.
 */
export async function updateLoanPaymentStatusAndEffects(
  params: UpdateLoanPaymentStatusParams
): Promise<UpdateLoanPaymentStatusResult> {
  const { loanId, paymentId, newStatus, paymentFrequencyOverride, failedPaymentFeeOverride } =
    params

  try {
    const supabase = await createServerSupabaseAdminClient()

    // Fetch loan + payment + all payments for recalculation if needed
    const [{ data: loanData, error: loanError }, { data: paymentData, error: paymentError }] =
      await Promise.all([
        supabase
          .from('loans')
          .select('id, remaining_balance, interest_rate, application_id')
          .eq('id', loanId)
          .single(),
        supabase
          .from('loan_payments')
          .select('*')
          .eq('id', paymentId)
          .maybeSingle()
      ])

    if (loanError || !loanData) {
      console.error('[LoanPayments] Loan not found for updateLoanPaymentStatusAndEffects', {
        loanId,
        error: loanError
      })
      return { success: false, error: 'Loan not found' }
    }

    if (paymentError || !paymentData) {
      console.error(
        '[LoanPayments] Payment not found for updateLoanPaymentStatusAndEffects',
        { paymentId, error: paymentError }
      )
      return { success: false, error: 'Payment not found' }
    }

    const loan = loanData as Loan & {
      interest_rate: number | null
      application_id: string | null
    }
    const payment = paymentData as LoanPayment

    // Idempotency guard: if payment is already in the desired status, do nothing.
    // This prevents running recalculation or balance updates multiple times for the same status
    // (e.g. multiple webhooks for the same failed payment).
    if (payment.status === newStatus) {
      console.log(
        '[LoanPayments] Skipping updateLoanPaymentStatusAndEffects - status already set',
        { loanId, paymentId, status: payment.status }
      )
      return { success: true }
    }

    // 1. Update payment status
    const { error: statusUpdateError } = await (supabase
      .from('loan_payments') as any)
      .update({ status: newStatus })
      .eq('id', paymentId)

    if (statusUpdateError) {
      console.error(
        '[LoanPayments] Error updating payment status in updateLoanPaymentStatusAndEffects',
        { paymentId, newStatus, error: statusUpdateError }
      )
      return { success: false, error: 'Failed to update payment status' }
    }

    // 2. Trigger side effects based on new status
    if (newStatus === 'confirmed' || newStatus === 'paid') {
      await applySuccessfulPaymentEffects(supabase, loan, payment)
    } else if (newStatus === 'failed') {
      // Load extra data needed for failed-payment recalculation
      // Get contract for payment frequency and fees
      let paymentFrequency: PaymentFrequency = paymentFrequencyOverride || 'monthly'
      let paymentAmount = Number(payment.amount || 0)
      let failedPaymentFee = failedPaymentFeeOverride ?? 0

      if (loan.id) {
        const { data: contract } = await supabase
          .from('loan_contracts')
          .select('contract_terms')
          .eq('loan_id', loan.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (contract && (contract as any).contract_terms) {
          const contractTerms = (contract as any).contract_terms
          paymentFrequency =
            (contractTerms.payment_frequency as PaymentFrequency) || paymentFrequency
          paymentAmount = Number(contractTerms.payment_amount || paymentAmount || 0)
          failedPaymentFee =
            (failedPaymentFeeOverride ??
              Number(contractTerms.fees?.failed_payment_fee || 0)) || 55
        }
      }

      // Get all payments for this loan for index/remaining-balance calculations
      const { data: allPayments, error: paymentsError } = await supabase
        .from('loan_payments')
        .select('*')
        .eq('loan_id', loanId)
        .order('payment_date', { ascending: true })

      if (paymentsError) {
        console.error(
          '[LoanPayments] Error fetching payments for failed recalculation:',
          paymentsError
        )
        return { success: false, error: 'Failed to fetch payments for recalculation' }
      }

      await applyFailedPaymentRecalculation({
        supabase,
        loan,
        loanId,
        payment,
        payments: (allPayments || []) as LoanPayment[],
        paymentFrequency,
        paymentAmount,
        failedPaymentFee
      })
    }

    return { success: true }
  } catch (err: any) {
    console.error(
      '[LoanPayments] Error in updateLoanPaymentStatusAndEffects:',
      err?.message || err
    )
    return { success: false, error: err?.message || 'Unknown error' }
  }
}

