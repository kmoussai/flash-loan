/**
 * Schedule Recalculation Handler for ZumRails
 * 
 * Handles ZumRails transactions when payment schedules are recalculated.
 * 
 * When a payment schedule is recalculated (defer, manual payment, modify loan):
 * 1. Cancel all existing ZumRails transactions for the loan that are cancellable
 * 2. After schedule update, create new transactions for payments without transactions
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { syncLoanPaymentsToZumRails } from './loan-payment-sync'
import { cancelZumRailsTransaction } from './transactions'
import type { ZumRailsTransactionStatus } from './types'

interface CancellableTransaction {
  id: string
  loan_payment_id: string | null
  provider_data: {
    transaction_status?: ZumRailsTransactionStatus
    transaction_id?: string
  }
}

/**
 * Check if a ZumRails transaction status is cancellable
 */
function isCancellableStatus(status: ZumRailsTransactionStatus | undefined): boolean {
  if (!status) return false
  return status === 'Scheduled' || status === 'InProgress' || status === 'Pending Cancellation'
}

/**
 * Cancel all cancellable ZumRails transactions for a loan
 */
export async function cancelLoanZumRailsTransactions(
  loanId: string,
  reason: string
): Promise<{
  success: boolean
  cancelled: number
  errors: string[]
  cancelledTransactionIds: string[]
}> {
  const supabase = createServerSupabaseAdminClient()
  const result = {
    success: true,
    cancelled: 0,
    errors: [] as string[],
    cancelledTransactionIds: [] as string[]
  }

  try {
    // Get all ZumRails transactions for this loan
    const { data: transactions, error } = await supabase
      .from('payment_transactions')
      .select('id, loan_payment_id, provider_data')
      .eq('loan_id', loanId)
      .eq('provider', 'zumrails')
      .in('status', ['initiated', 'pending', 'processing'])

    if (error) {
      result.success = false
      result.errors.push(`Failed to fetch transactions: ${error.message}`)
      return result
    }

    if (!transactions || transactions.length === 0) {
      return result // No transactions to cancel
    }

    // Filter to only cancellable transactions
    const cancellableTransactions = (transactions as CancellableTransaction[]).filter(
      (tx) => {
        const status = tx.provider_data?.transaction_status as ZumRailsTransactionStatus | undefined
        return isCancellableStatus(status)
      }
    )

    // Cancel each transaction
    for (const transaction of cancellableTransactions) {
      try {
        // Get ZumRails transaction ID from the transaction we already have
        const providerData = transaction.provider_data as any
        const zumRailsTransactionId = providerData?.transaction_id

        // Step 1: Attempt to cancel the transaction in ZumRails API
        if (zumRailsTransactionId) {
          try {
            const cancelResult = await cancelZumRailsTransaction(zumRailsTransactionId)
            
            if (!cancelResult.success) {
              // Log warning but continue - we'll still mark it as cancelled in our DB
              console.warn(
                `[ScheduleRecalculation] Failed to cancel ZumRails transaction ${zumRailsTransactionId}: ${cancelResult.message}`
              )
              // Continue to mark as cancelled in our database anyway
            } else {
              console.log(
                `[ScheduleRecalculation] Successfully cancelled ZumRails transaction ${zumRailsTransactionId}`
              )
            }
          } catch (apiError: any) {
            console.warn(
              `[ScheduleRecalculation] Error calling ZumRails cancel API for ${zumRailsTransactionId}: ${apiError.message}`
            )
            // Continue to mark as cancelled in our database anyway
          }
        } else {
          console.warn(
            `[ScheduleRecalculation] No ZumRails transaction_id found for payment_transaction ${transaction.id}`
          )
        }

        // Step 2: Mark as cancelled in our database
        const updatedProviderData = {
          ...providerData,
          transaction_status: 'Cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        }

        const { error: updateError } = await (supabase
          .from('payment_transactions') as any)
          .update({
            status: 'cancelled',
            provider_data: updatedProviderData
          })
          .eq('id', transaction.id)

        if (updateError) {
          result.errors.push(
            `Failed to update transaction ${transaction.id} in database: ${updateError.message}`
          )
        } else {
          result.cancelled++
          result.cancelledTransactionIds.push(transaction.id)
        }
      } catch (error: any) {
        result.errors.push(
          `Error cancelling transaction ${transaction.id}: ${error.message}`
        )
      }
    }

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  } catch (error: any) {
    result.success = false
    result.errors.push(`Unexpected error: ${error.message}`)
    return result
  }
}

/**
 * Handle ZumRails transactions when payment schedule is recalculated
 * 
 * This function:
 * 1. Cancels all cancellable ZumRails transactions for the loan
 * 2. Creates new transactions for payments that don't have transactions
 * 
 * @param loanId - The loan ID
 * @param reason - Reason for recalculation (e.g., "Payment deferred", "Manual payment recorded", "Loan modified")
 * @param options - Additional options
 * @returns Result with cancellation and creation statistics
 */
export async function handleScheduleRecalculationForZumRails(params: {
  loanId: string
  reason: string
  options?: {
    limit?: number
    walletId?: string
  }
}): Promise<{
  success: boolean
  cancelled: {
    count: number
    transactionIds: string[]
    errors: string[]
  }
  created: {
    processed: number
    created: number
    failed: number
    errors: Array<{ loanPaymentId: string; error: string }>
  }
}> {
  const { loanId, reason, options = {} } = params

  // Step 1: Cancel existing cancellable transactions
  const cancelResult = await cancelLoanZumRailsTransactions(loanId, reason)

  // Step 2: Create new transactions for payments without transactions
  // Use the sync function which will only create transactions for payments that don't have them
  // Filter by loanId to only sync payments for this specific loan
  const syncResult = await syncLoanPaymentsToZumRails({
    limit: options.limit || 100,
    walletId: options.walletId,
    loanId: loanId
  })

  return {
    success: cancelResult.success && syncResult.success,
    cancelled: {
      count: cancelResult.cancelled,
      transactionIds: cancelResult.cancelledTransactionIds,
      errors: cancelResult.errors
    },
    created: {
      processed: syncResult.processed,
      created: syncResult.created,
      failed: syncResult.failed,
      errors: syncResult.errors
    }
  }
}
