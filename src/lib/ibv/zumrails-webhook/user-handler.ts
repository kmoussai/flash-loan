/**
 * Handler for Zumrails User/Customer webhooks
 */

import type { ZumrailsUserWebhook, ProcessWebhookResult } from './types'

export async function handleUserWebhook(
  webhook: ZumrailsUserWebhook
): Promise<ProcessWebhookResult> {
  // TODO: Implement User/Customer webhook handling
  console.log('[Zumrails Webhook] User webhook received (not implemented)', {
    type: webhook.Type,
    event: webhook.Event
  })

  return {
    processed: true,
    applicationId: null,
    updated: false,
    message: 'User webhook received but handler not yet implemented'
  }
}
