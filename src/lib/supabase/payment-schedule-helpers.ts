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
 * 2. Identifies future payments that can be updated (pending/cancelled, not deferred/manual/etc.)
 * 3. Updates existing payments that match breakdown items
 * 4. Creates new payments for breakdown items without existing payments
 * 5. Cancels extra future payments that aren't in the breakdown
 *
 * @param loanId - The loan ID
 * @param breakdown - Array of payment breakdown items from recalculation
 * @param startDate - Optional: Only update payments on or after this date (ISO date string)
 * @returns Result object with success status, updated/inserted/cancelled counts, and any errors
 *
 * @example
 * ```typescript
 * const breakdown = recalculatePaymentSchedule({...}).recalculatedBreakdown
 * const result = await updateLoanPaymentsFromBreakdown(loanId, breakdown)
 * if (result.success) {
 *   console.log(`Updated ${result.updatedCount} payments, created ${result.insertedCount} new payments`)
 * }
 * ```
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

    // Match by index: after filtering preserved statuses, match payments to breakdown by position
    // First updateable payment = first breakdown item, second = second, etc.
    const paymentsToUpdate: Array<{ id: string; update: LoanPaymentUpdate }> =
      []
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
        // Update existing payment with breakdown data
        paymentsToUpdate.push({
          id: payment.id,
          update: {
            payment_date: breakdownItem.dueDate,
            amount: roundCurrency(breakdownItem.amount),
            interest: roundCurrency(breakdownItem.interest),
            principal: roundCurrency(breakdownItem.principal),
            remaining_balance: roundCurrency(breakdownItem.remainingBalance),
            payment_number: breakdownItem.paymentNumber,
            status: 'pending',
            notes: '' // Preserve existing notes
          }
        })
      } else if (payment && !breakdownItem) {
        // More payments than breakdown items - cancel extra payments
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
    // Update existing payments
    for (const { id, update } of paymentsToUpdate) {
      const { error: updateError } = await (
        supabase.from('loan_payments') as any
      )
        .update(update)
        .eq('id', id)

      if (updateError) {
        errors.push(`Failed to update payment ${id}: ${updateError.message}`)
        console.error(`Error updating payment ${id}:`, updateError)
      } else {
        updatedCount++
      }
    }

    // Cancel extra payments
    if (paymentsToCancel.length > 0) {
      const { error: cancelError } = await (
        supabase.from('loan_payments') as any
      )
        .delete()
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
