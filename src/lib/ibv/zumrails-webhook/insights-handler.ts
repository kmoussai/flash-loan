/**
 * Handler for Zumrails Insights webhooks
 * 
 * NOTE: Currently not implemented - using User Connected webhook approach instead
 * This handler is kept for future use if Insights webhooks are needed
 */

import type { ZumrailsInsightsWebhook, ProcessWebhookResult } from './types'

export async function handleInsightsWebhook(
  webhook: ZumrailsInsightsWebhook
): Promise<ProcessWebhookResult> {
  // Insights webhook handling is not implemented right now
  // We're using the User Connected webhook approach instead
  console.log('[Zumrails Webhook] Insights webhook received (not implemented)', {
    event: webhook.Event,
    requestId: webhook.Data.RequestId,
    type: webhook.Type
  })

  return {
    processed: true,
    applicationId: null,
    updated: false,
    message: 'Insights webhook received but handler not implemented - using User Connected webhook approach instead'
  }
}
