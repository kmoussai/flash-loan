/**
 * Notification event processor
 * 
 * This module processes individual notification events by:
 * 1. Finding the appropriate handler
 * 2. Executing the handler
 * 3. Handling errors and retries
 */

import type { NotificationEvent } from '../events/types'
import type { NotificationHandlerResult } from '../handlers/types'
import { getNotificationHandler } from '../handlers/registry'

/**
 * Process a single notification event
 * 
 * @param event - The notification event to process
 * @returns Result of processing the event
 */
export async function processNotificationEvent(
  event: NotificationEvent
): Promise<NotificationHandlerResult> {
  try {
    // Get the handler for this event type
    const handler = getNotificationHandler(event.type)

    if (!handler) {
      return {
        success: false,
        error: `No handler found for event type: ${event.type}`,
      }
    }

    // Execute the handler
    const result = await handler(event)

    if (!result.success) {
      console.error(
        `[processNotificationEvent] Handler failed for event ${event.id}:`,
        result.error
      )
    }

    return result
  } catch (error: any) {
    console.error(
      `[processNotificationEvent] Error processing event ${event.id}:`,
      error
    )
    return {
      success: false,
      error: error?.message || 'Failed to process notification event',
    }
  }
}

