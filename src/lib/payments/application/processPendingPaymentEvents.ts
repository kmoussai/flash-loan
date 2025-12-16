/**
 * Process Pending Payment Events
 * 
 * Simple utility to process pending events from the outbox.
 * Can be called manually, via cron, or on app startup.
 */

import { PaymentEventRepository } from '../infrastructure/repositories/PaymentEventRepository'
import { EventBus } from '../events/EventBus'
import { PaymentDomainEvent } from '../domain/PaymentEvents'

export interface ProcessPendingEventsResult {
  processed: number
  failed: number
  errors: Array<{ eventId: string; error: string }>
}

/**
 * Process pending payment events from the outbox
 * 
 * @param eventRepository - Payment event repository
 * @param eventBus - Event bus for dispatching events
 * @param limit - Maximum number of events to process (default: 100)
 * @returns Result with counts and errors
 */
export async function processPendingPaymentEvents(
  eventRepository: PaymentEventRepository,
  eventBus: EventBus,
  limit: number = 100
): Promise<ProcessPendingEventsResult> {
  const result: ProcessPendingEventsResult = {
    processed: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Fetch pending events
    const pendingEvents = await eventRepository.getPending(limit)

    // Process each event
    for (const eventRecord of pendingEvents) {
      try {
        // Dispatch event via EventBus (use asyncPublish since handlers are async)
        await eventBus.asyncPublish(eventRecord.payload)

        // Mark as processed
        await eventRepository.markProcessed(eventRecord.id)
        result.processed++
      } catch (error: any) {
        // Mark as failed
        const errorMessage = error.message || 'Unknown error'
        await eventRepository.markFailed(eventRecord.id, errorMessage)
        result.failed++
        result.errors.push({
          eventId: eventRecord.id,
          error: errorMessage,
        })
      }
    }
  } catch (error: any) {
    // If we can't even fetch events, log and return
    console.error('Failed to process pending payment events:', error)
    throw error
  }

  return result
}

/**
 * Process a single pending event by ID
 * 
 * @param eventRepository - Payment event repository
 * @param eventBus - Event bus for dispatching events
 * @param eventId - Event record ID
 * @returns True if processed successfully, false otherwise
 */
export async function processPendingPaymentEvent(
  eventRepository: PaymentEventRepository,
  eventBus: EventBus,
  eventId: string
): Promise<boolean> {
  try {
    // Get pending events and find the one we want
    const pendingEvents = await eventRepository.getPending(1000)
    const eventRecord = pendingEvents.find((e) => e.id === eventId)

    if (!eventRecord) {
      throw new Error(`Event ${eventId} not found or not pending`)
    }

    // Dispatch event
    // Use asyncPublish since we're in async context
    await eventBus.asyncPublish(eventRecord.payload)

    // Mark as processed
    await eventRepository.markProcessed(eventId)
    return true
  } catch (error: any) {
    // Mark as failed
    await eventRepository.markFailed(eventId, error.message || 'Unknown error')
    console.error(`Failed to process payment event ${eventId}:`, error)
    return false
  }
}

