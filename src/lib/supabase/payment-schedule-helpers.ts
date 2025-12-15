// Payment schedule helper functions for loan payments

import { createServerSupabaseAdminClient } from './server'
import {
  LoanPayment,
  LoanPaymentInsert,
  LoanPaymentUpdate,
  PaymentStatus
} from './types'
import { PaymentBreakdown } from '@/src/lib/loan'
import { roundCurrency } from '@/src/lib/loan'
import { parseLocalDate } from '@/src/lib/utils/date'

/**
 * Statuses that should be preserved (not updated) during schedule recalculation
 */
const PRESERVED_STATUSES: PaymentStatus[] = [
  'deferred',
  'manual',
  'paid',
  'confirmed',
  'failed',
  'rejected',
  'rebate'
]

/**
 * Statuses that represent future payments that can be updated
 */
const UPDATEABLE_STATUSES: PaymentStatus[] = ['pending', 'cancelled']

/**
 * Update loan payments from a payment breakdown
 *
 * This function:
 * 1. Fetches all existing payments for the loan
 * 2. Identifies future payments that can be changed (pending/cancelled, not deferred/manual/etc.)
 * 3. Cancels those existing future payments (keeps their rows for history & webhooks)
 * 4. Inserts NEW payment rows based on the recalculated breakdown
 * 5. Leaves past and preserved-status payments (paid/confirmed/failed/etc.) untouched
 *
 * Important: we never update existing future payments in-place. Instead we:
 * - Mark them as cancelled
 * - Insert new rows with the recalculated schedule
 *
 * This avoids reusing payment IDs, which is important for webhook matching
 * (ZumRails transactions store loan_payment_id and expect it not to change semantics).
 *
 * @param loanId - The loan ID
 * @param breakdown - Array of payment breakdown items from recalculation
 * @param startDate - Optional: Only update payments on or after this date (ISO date string)
 * @returns Result object with success status, updated/inserted/cancelled counts, and any errors
 */
export async function updateLoanPaymentsFromBreakdown(
  loanId: string,
  breakdown: PaymentBreakdown[],
  startDate?: string
): Promise<{
  success: boolean
  updatedCount: number
  insertedCount: number
  cancelledCount: number
  errors: string[]
}> {
  const errors: string[] = []
  let updatedCount = 0
  let insertedCount = 0
  let cancelledCount = 0

  try {
    if (!loanId) {
      return {
        success: false,
        updatedCount: 0,
        insertedCount: 0,
        cancelledCount: 0,
        errors: ['Loan ID is required']
      }
    }

    if (!breakdown || breakdown.length === 0) {
      return {
        success: false,
        updatedCount: 0,
        insertedCount: 0,
        cancelledCount: 0,
        errors: ['Breakdown array is required and cannot be empty']
      }
    }

    const supabase = await createServerSupabaseAdminClient()

    // Parse start date if provided
    const startDateObj = startDate ? parseLocalDate(startDate) : null
    const startDateStr = startDateObj
      ? startDateObj.toISOString().split('T')[0]
      : null

    // Get all existing payments for this loan, ordered by payment date
    const { data: allPayments, error: fetchError } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: true })

    if (fetchError) {
      return {
        success: false,
        updatedCount: 0,
        insertedCount: 0,
        cancelledCount: 0,
        errors: [`Failed to fetch existing payments: ${fetchError.message}`]
      }
    }

    const existingPayments = (allPayments || []) as LoanPayment[]

    // Filter to future payments that can be updated
    // These are payments that:
    // 1. Are on or after the start date (if provided)
    // 2. Have an updateable status (pending/cancelled)
    // 3. Are NOT in preserved statuses (deferred/manual/paid/etc.)
    const futureUpdateablePayments = existingPayments.filter(payment => {
      // Check date filter
      if (startDateStr) {
        const paymentDate = parseLocalDate(payment.payment_date)
          .toISOString()
          .split('T')[0]
        if (paymentDate < startDateStr) {
          return false
        }
      }

      // Check status - must be updateable and not preserved
      const status = payment.status as PaymentStatus
      return (
        UPDATEABLE_STATUSES.includes(status) &&
        !PRESERVED_STATUSES.includes(status)
      )
    })

    // Match by index: after filtering preserved statuses, match payments to breakdown by position.
    // Instead of updating in place, we will cancel matched payments and insert new ones.
    const paymentsToCancel: string[] = []
    const paymentsToInsert: LoanPaymentInsert[] = []

    // Match payments to breakdown items by index
    const maxLength = Math.max(
      futureUpdateablePayments.length,
      breakdown.length
    )

    for (let i = 0; i < maxLength; i++) {
      const payment = futureUpdateablePayments[i]
      const breakdownItem = breakdown[i]

      if (payment && breakdownItem) {
        // Existing payment will be cancelled and replaced with a new one
        paymentsToCancel.push(payment.id)
        paymentsToInsert.push({
          loan_id: loanId,
          payment_date: breakdownItem.dueDate,
          amount: roundCurrency(breakdownItem.amount),
          interest: roundCurrency(breakdownItem.interest),
          principal: roundCurrency(breakdownItem.principal),
          remaining_balance: roundCurrency(breakdownItem.remainingBalance),
          payment_number: breakdownItem.paymentNumber,
          status: 'pending',
          notes: 'Recalculated payment (replaces previous scheduled payment)'
        })
      } else if (payment && !breakdownItem) {
        // More payments than breakdown items - cancel extra payments (but keep rows)
        paymentsToCancel.push(payment.id)
      } else if (!payment && breakdownItem) {
        // More breakdown items than payments - insert new payments
        paymentsToInsert.push({
          loan_id: loanId,
          payment_date: breakdownItem.dueDate,
          amount: roundCurrency(breakdownItem.amount),
          interest: roundCurrency(breakdownItem.interest),
          principal: roundCurrency(breakdownItem.principal),
          remaining_balance: roundCurrency(breakdownItem.remainingBalance),
          payment_number: breakdownItem.paymentNumber,
          status: 'pending',
          notes: 'New payment'
        })
      }
    }

    // Execute updates in batches

    // Cancel existing future payments (mark as cancelled, do not delete rows)
    if (paymentsToCancel.length > 0) {
      const { error: cancelError } = await (
        supabase.from('loan_payments') as any
      )
        .update({ status: 'cancelled' })
        .in('id', paymentsToCancel)

      if (cancelError) {
        errors.push(`Failed to cancel payments: ${cancelError.message}`)
        console.error('Error cancelling payments:', cancelError)
      } else {
        cancelledCount = paymentsToCancel.length
      }
    }

    // Insert new payments
    if (paymentsToInsert.length > 0) {
      const { error: insertError } = await (
        supabase.from('loan_payments') as any
      ).insert(paymentsToInsert)

      if (insertError) {
        errors.push(`Failed to insert new payments: ${insertError.message}`)
        console.error('Error inserting new payments:', insertError)
      } else {
        insertedCount = paymentsToInsert.length
      }
    }

    // Return result
    const success = errors.length === 0

    return {
      success,
      updatedCount,
      insertedCount,
      cancelledCount,
      errors
    }
  } catch (error: any) {
    console.error('Error updating loan payments from breakdown:', error)
    return {
      success: false,
      updatedCount,
      insertedCount,
      cancelledCount,
      errors: [
        ...errors,
        `Unexpected error: ${error.message || 'Unknown error'}`
      ]
    }
  }
}

/**
 * Get future updateable payments for a loan
 *
 * Helper function to fetch payments that can be updated during schedule recalculation
 *
 * @param loanId - The loan ID
 * @param startDate - Optional: Only get payments on or after this date (ISO date string)
 * @returns Array of updateable payments
 */
export async function getFutureUpdateablePayments(
  loanId: string,
  startDate?: string
): Promise<LoanPayment[]> {
  try {
    const supabase = await createServerSupabaseAdminClient()

    const startDateObj = startDate ? parseLocalDate(startDate) : null
    const startDateStr = startDateObj
      ? startDateObj.toISOString().split('T')[0]
      : null

    let query = supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .in('status', UPDATEABLE_STATUSES)
      .order('payment_date', { ascending: true })

    if (startDateStr) {
      query = query.gte('payment_date', startDateStr)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching future updateable payments:', error)
      return []
    }

    const payments = (data || []) as LoanPayment[]

    // Filter out preserved statuses (double-check)
    return payments.filter(
      payment => !PRESERVED_STATUSES.includes(payment.status as PaymentStatus)
    )
  } catch (error: any) {
    console.error('Error getting future updateable payments:', error)
    return []
  }
}
