/**
 * Handler for Zumrails Transaction webhooks
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { updateLoanPaymentStatusAndEffects } from '@/src/lib/supabase/loan-payment-status'
import type {
  ZumRailsTransactionStatus,
  ZumRailsProviderData
} from '@/src/lib/payment-providers/zumrails'
import type { ZumrailsTransactionWebhook, ProcessWebhookResult } from './types'

/**
 * Map ZumRails transaction status to our internal payment_transactions.status
 */
function mapZumrailsStatusToInternal(status?: string): {
  internalStatus?: string
  providerStatus?: ZumRailsTransactionStatus
} {
  if (!status) {
    return { internalStatus: undefined, providerStatus: undefined }
  }

  const normalized = status as string

  switch (normalized) {
    case 'Completed':
      return { internalStatus: 'completed', providerStatus: 'Completed' }
    case 'Failed':
      return { internalStatus: 'failed', providerStatus: 'Failed' }
    case 'Cancelled':
      return { internalStatus: 'cancelled', providerStatus: 'Cancelled' }
    case 'InProgress':
    case 'InReview':
      return { internalStatus: 'processing', providerStatus: 'InProgress' }
    case 'Scheduled':
      return { internalStatus: 'pending', providerStatus: 'Scheduled' }
    default:
      return {
        internalStatus: undefined,
        providerStatus: normalized as ZumRailsTransactionStatus
      }
  }
}

/**
 * Handle Transaction webhook
 * Updates payment_transactions rows for ZumRails transactions
 */
export async function handleTransactionWebhook(
  webhook: ZumrailsTransactionWebhook
): Promise<ProcessWebhookResult> {
  const data = webhook.Data
  const event = webhook.Event

  const transactionId: string | null = data.Id || null

  if (!transactionId) {
    console.warn(
      '[Zumrails Webhook] Transaction webhook without TransactionId',
      { event, data }
    )
    return {
      processed: false,
      applicationId: null,
      updated: false,
      message: 'No TransactionId found in transaction webhook payload'
    }
  }

  const supabase = createServerSupabaseAdminClient()

  const { data: transactions, error } = await (supabase as any)
    .from('payment_transactions')
    .select('id, loan_id, loan_payment_id, status, provider_data')
    .eq('provider', 'zumrails')
    .eq('provider_data->>transaction_id', transactionId)

  if (error) {
    console.error(
      '[Zumrails Webhook] Error fetching payment transactions for TransactionId',
      { transactionId, error }
    )
    return {
      processed: false,
      applicationId: null,
      updated: false,
      message: `Error fetching payment transactions for TransactionId ${transactionId}: ${error.message}`
    }
  }

  if (!transactions || transactions.length === 0) {
    console.warn(
      '[Zumrails Webhook] No matching payment_transactions found for TransactionId',
      { transactionId, event }
    )
    return {
      processed: true,
      applicationId: null,
      updated: false,
      message: `No matching payment_transactions found for TransactionId ${transactionId}`
    }
  }

  const rawStatus: string | undefined = data.TransactionStatus as
    | string
    | undefined

  const { internalStatus, providerStatus } =
    mapZumrailsStatusToInternal(rawStatus)

  const now = new Date().toISOString()

  for (const tx of transactions as Array<{
    id: string
    loan_id: string | null
    loan_payment_id: string | null
    status: string
    provider_data: any
  }>) {
    try {
      const currentProviderData = (tx.provider_data ||
        {}) as ZumRailsProviderData

      const updatedProviderData: ZumRailsProviderData = {
        ...currentProviderData,
        transaction_status:
          (providerStatus as ZumRailsTransactionStatus) ??
          currentProviderData.transaction_status,
        raw_response: {
          ...((currentProviderData.raw_response as any) || {}),
          last_webhook: data as any
        }
      }

      const updatePayload: any = {
        provider_data: updatedProviderData,
        updated_at: now
      }

      if (internalStatus) {
        updatePayload.status = internalStatus
      }

      const { error: updateError } = await (
        supabase.from('payment_transactions') as any
      )
        .update(updatePayload)
        .eq('id', tx.id)

      if (updateError) {
        console.error(
          '[Zumrails Webhook] Failed to update payment_transaction',
          { transactionId, paymentTransactionId: tx.id, error: updateError }
        )
      } else {
        console.log(
          '[Zumrails Webhook] Updated payment_transaction from transaction webhook',
          { transactionId, paymentTransactionId: tx.id, status: internalStatus }
        )
      }

      // If this transaction is linked to a loan payment, update the loan payment status
      if (tx.loan_id && tx.loan_payment_id && internalStatus) {
        let newPaymentStatus: 'confirmed' | 'paid' | 'failed' | 'cancelled' | undefined

        if (internalStatus === 'completed') {
          // Treat successful collection as a confirmed payment
          newPaymentStatus = 'confirmed'
        } else if (internalStatus === 'failed') {
          newPaymentStatus = 'failed'
        } else if (internalStatus === 'cancelled') {
          newPaymentStatus = 'cancelled'
        }

        if (newPaymentStatus) {
          const result = await updateLoanPaymentStatusAndEffects({
            loanId: tx.loan_id,
            paymentId: tx.loan_payment_id,
            newStatus: newPaymentStatus
          })

          if (!result.success) {
            console.error(
              '[Zumrails Webhook] Failed to update loan_payment via helper from transaction webhook',
              {
                loanId: tx.loan_id,
                loanPaymentId: tx.loan_payment_id,
                newStatus: newPaymentStatus,
                error: result.error
              }
            )
          } else {
            console.log(
              '[Zumrails Webhook] Updated loan_payment via helper from transaction webhook',
              {
                loanId: tx.loan_id,
                loanPaymentId: tx.loan_payment_id,
                newStatus: newPaymentStatus
              }
            )
          }
        }
      }
    } catch (updateErr: any) {
      console.error(
        '[Zumrails Webhook] Error updating payment_transaction from transaction webhook',
        { transactionId, error: updateErr }
      )
    }
  }

  return {
    processed: true,
    applicationId: null,
    updated: true,
    message: `Updated ${transactions.length} payment_transactions for TransactionId ${transactionId}`
  }
}
