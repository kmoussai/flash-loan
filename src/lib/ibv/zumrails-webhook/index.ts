/**
 * Generic Zumrails Webhook Handler
 * Exposes type definitions, helpers, and the main dispatcher.
 */

import type {
  ZumrailsWebhook,
  ProcessWebhookResult,
  ZumrailsUserWebhook,
  ZumrailsInsightsWebhook,
  ZumrailsTransactionWebhook
} from './types'

export type {
  ZumrailsWebhook,
  ProcessWebhookResult,
  ZumrailsUserWebhook,
  ZumrailsInsightsWebhook,
  ZumrailsTransactionWebhook
} from './types'

export * from './helpers'

import { handleUserWebhook } from './user-handler'
import { handleInsightsWebhook } from './insights-handler'
import { handleTransactionWebhook } from './transaction-handler'

/**
 * Main webhook dispatcher
 * Routes webhooks to type-specific handlers based on webhook type
 */
export async function processZumrailsWebhook(
  webhook: ZumrailsWebhook
): Promise<ProcessWebhookResult> {
  console.log('[Zumrails Webhook] Dispatching webhook', {
    type: webhook.Type,
    event: webhook.Event,
    eventGeneratedAt: webhook.EventGeneratedAt
  })

  switch (webhook.Type) {
    case 'User':
    case 'Customer':
      return handleUserWebhook(webhook as ZumrailsUserWebhook)

    case 'Insights':
      return handleInsightsWebhook(webhook as ZumrailsInsightsWebhook)

    case 'Transaction':
      return handleTransactionWebhook(webhook as ZumrailsTransactionWebhook)

    default:
      console.log(
        `[Zumrails Webhook] Unhandled webhook type: ${webhook.Type}`,
        webhook
      )
      return {
        processed: true,
        applicationId: null,
        updated: false,
        message: `Webhook type ${webhook.Type} received but not processed`
      }
  }
}
