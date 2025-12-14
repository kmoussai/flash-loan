/**
 * Event emission system for notifications
 * 
 * This module provides the emitNotificationEvent function that business logic
 * should use to trigger notifications. Events are queued for processing by workers.
 */

import type { NotificationEvent } from './types'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

/**
 * Queue table name for pending notification events
 */
const NOTIFICATION_EVENTS_TABLE = 'notification_events'

/**
 * Interface for storing events in the database queue
 */
interface QueuedNotificationEvent {
  id: string
  event_data: NotificationEvent
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  max_attempts: number
  error_message: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Options for emitting a notification event
 */
export interface EmitNotificationEventOptions {
  /** Whether to process the event immediately (synchronous) */
  immediate?: boolean
  /** Maximum retry attempts if processing fails */
  maxAttempts?: number
  /** Custom event ID (auto-generated if not provided) */
  eventId?: string
}

/**
 * Emit a notification event to be processed by the notification system
 * 
 * This function queues the event for background processing. Business logic
 * should never send emails directly - always use this function.
 * 
 * @param event - The notification event to emit
 * @param options - Optional configuration for event emission
 * @returns Promise resolving to the queued event ID and success status
 * 
 * @example
 * ```ts
 * await emitNotificationEvent({
 *   id: generateId(),
 *   type: 'contract_sent',
 *   timestamp: new Date().toISOString(),
 *   category: 'contract_sent',
 *   metadata: { contractId: '...', loanApplicationId: '...' },
 *   recipient: {
 *     id: clientId,
 *     type: 'client',
 *     email: 'client@example.com',
 *     preferredLanguage: 'en',
 *     firstName: 'John'
 *   },
 *   sendEmail: true,
 *   createNotification: true
 * })
 * ```
 */
export async function emitNotificationEvent(
  event: NotificationEvent,
  options: EmitNotificationEventOptions = {}
): Promise<{ success: boolean; eventId: string; error?: string }> {
  const { immediate = false, maxAttempts = 3, eventId } = options

  try {
    // Generate event ID if not provided
    const finalEventId = eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Ensure event has required fields
    const enrichedEvent: NotificationEvent = {
      ...event,
      id: finalEventId,
      timestamp: event.timestamp || new Date().toISOString(),
      priority: event.priority || 'normal',
      sendEmail: event.sendEmail ?? true,
      createNotification: event.createNotification ?? true,
    }

    // If immediate processing is requested, process synchronously
    if (immediate) {
      const { processNotificationEvent } = await import('../workers/processor')
      const result = await processNotificationEvent(enrichedEvent)
      return {
        success: result.success,
        eventId: finalEventId,
        error: result.error,
      }
    }

    // Otherwise, queue the event for background processing
    const supabase = await createServerSupabaseAdminClient()

    // Check if table exists, if not, we'll use an in-memory queue or log
    // For now, we'll use a simple approach: store in a JSONB column or use a queue service
    // In production, you might want to use a proper queue (Redis, BullMQ, etc.)
    
    // For this implementation, we'll try to insert into a notification_events table
    // If it doesn't exist, we'll fall back to processing immediately
    const { data, error } = await supabase
      .from(NOTIFICATION_EVENTS_TABLE)
      .insert({
        id: finalEventId,
        event_data: enrichedEvent as any,
        status: 'pending',
        attempts: 0,
        max_attempts: maxAttempts,
        error_message: null,
        processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single()

    if (error) {
      // If table doesn't exist, process immediately as fallback
      console.warn(
        `[NotificationEvents] Table ${NOTIFICATION_EVENTS_TABLE} not found, processing immediately:`,
        error.message
      )
      
      const { processNotificationEvent } = await import('../workers/processor')
      const result = await processNotificationEvent(enrichedEvent)
      return {
        success: result.success,
        eventId: finalEventId,
        error: result.error,
      }
    }

    return {
      success: true,
      eventId: finalEventId,
    }
  } catch (error: any) {
    console.error('[emitNotificationEvent] Failed to emit event:', error)
    return {
      success: false,
      eventId: event.id || 'unknown',
      error: error?.message || 'Failed to emit notification event',
    }
  }
}

/**
 * Helper function to create a notification event with common defaults
 * 
 * @param type - The event type
 * @param recipient - Recipient information
 * @param metadata - Event-specific metadata
 * @param overrides - Optional overrides for event properties
 */
export function createNotificationEvent(
  type: NotificationEvent['type'],
  recipient: NotificationEvent['recipient'],
  metadata: NotificationEvent['metadata'],
  overrides?: Partial<NotificationEvent>
): NotificationEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    category: null, // Will be set by handlers
    metadata,
    recipient,
    priority: 'normal',
    sendEmail: true,
    createNotification: true,
    ...overrides,
  }
}

