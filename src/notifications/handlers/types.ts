/**
 * Handler types for notification processing
 */

import type { NotificationEvent } from '../events/types'
import type { SendEmailResult } from '../providers/types'

/**
 * Result of processing a notification event
 */
export interface NotificationHandlerResult {
  /** Whether processing was successful */
  success: boolean
  /** Error message if processing failed */
  error?: string
  /** Email send result (if email was sent) */
  emailResult?: SendEmailResult
  /** Database notification ID (if notification was created) */
  notificationId?: string
}

/**
 * Handler function signature
 * 
 * Handlers are responsible for:
 * 1. Mapping events to email templates
 * 2. Sending emails via providers
 * 3. Creating database notifications
 */
export type NotificationHandler = (
  event: NotificationEvent
) => Promise<NotificationHandlerResult>

