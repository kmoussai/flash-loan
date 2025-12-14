/**
 * Notification event queue processor
 * 
 * This module processes queued notification events from the database.
 * In production, you might want to use a proper queue system (Redis, BullMQ, etc.)
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { processNotificationEvent } from './processor'
import type { NotificationEvent } from '../events/types'

const NOTIFICATION_EVENTS_TABLE = 'notification_events'
const BATCH_SIZE = 10
const MAX_ATTEMPTS = 3

interface QueuedEvent {
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
 * Process pending notification events from the queue
 * 
 * @param limit - Maximum number of events to process (default: BATCH_SIZE)
 * @returns Number of events processed
 */
export async function processNotificationEvents(
  limit: number = BATCH_SIZE
): Promise<{ processed: number; errors: number }> {
  const supabase = await createServerSupabaseAdminClient()

  try {
    // Fetch pending events
    const { data: events, error: fetchError } = await supabase
      .from(NOTIFICATION_EVENTS_TABLE)
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(limit)
      .returns<QueuedEvent[]>()

    if (fetchError) {
      // Table might not exist, which is okay for now
      console.warn(
        '[processNotificationEvents] Could not fetch events:',
        fetchError.message
      )
      return { processed: 0, errors: 0 }
    }

    if (!events || events.length === 0) {
      return { processed: 0, errors: 0 }
    }

    let processed = 0
    let errors = 0

    // Process each event
    for (const queuedEvent of events) {
      try {
        // Mark as processing
        await supabase
          .from(NOTIFICATION_EVENTS_TABLE)
          .update({
            status: 'processing',
            attempts: queuedEvent.attempts + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', queuedEvent.id)

        // Process the event
        const result = await processNotificationEvent(queuedEvent.event_data)

        // Update status based on result
        if (result.success) {
          await supabase
            .from(NOTIFICATION_EVENTS_TABLE)
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', queuedEvent.id)
          processed++
        } else {
          // Check if we've exceeded max attempts
          const newAttempts = queuedEvent.attempts + 1
          const newStatus =
            newAttempts >= queuedEvent.max_attempts ? 'failed' : 'pending'

          await supabase
            .from(NOTIFICATION_EVENTS_TABLE)
            .update({
              status: newStatus,
              attempts: newAttempts,
              error_message: result.error || 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', queuedEvent.id)

          if (newStatus === 'failed') {
            errors++
            console.error(
              `[processNotificationEvents] Event ${queuedEvent.id} failed after ${newAttempts} attempts`
            )
          }
        }
      } catch (error: any) {
        errors++
        console.error(
          `[processNotificationEvents] Error processing event ${queuedEvent.id}:`,
          error
        )

        // Update event with error
        const newAttempts = queuedEvent.attempts + 1
        const newStatus =
          newAttempts >= queuedEvent.max_attempts ? 'failed' : 'pending'

        await supabase
          .from(NOTIFICATION_EVENTS_TABLE)
          .update({
            status: newStatus,
            attempts: newAttempts,
            error_message: error?.message || 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', queuedEvent.id)
      }
    }

    return { processed, errors }
  } catch (error: any) {
    console.error('[processNotificationEvents] Fatal error:', error)
    return { processed: 0, errors: 0 }
  }
}

/**
 * Process notification events continuously (for background workers)
 * 
 * @param intervalMs - Interval between processing batches (default: 5000ms)
 * @param onStop - Optional callback when processing stops
 */
export async function startNotificationWorker(
  intervalMs: number = 5000,
  onStop?: () => void
): Promise<() => void> {
  let isRunning = true

  const processLoop = async () => {
    while (isRunning) {
      try {
        await processNotificationEvents()
      } catch (error) {
        console.error('[startNotificationWorker] Error in processing loop:', error)
      }

      if (isRunning) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
      }
    }

    if (onStop) {
      onStop()
    }
  }

  // Start processing
  processLoop().catch((error) => {
    console.error('[startNotificationWorker] Fatal error:', error)
  })

  // Return stop function
  return () => {
    isRunning = false
  }
}

