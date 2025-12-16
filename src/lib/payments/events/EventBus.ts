/**
 * Event Bus
 * 
 * Simple in-process event bus for domain events.
 * Easy to replace later with queue/outbox pattern.
 */

export type EventHandler<T = any> = (event: T) => void | Promise<void>

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map()

  /**
   * Subscribe to an event type
   * 
   * @param eventType - Event type name (e.g., 'PaymentSucceeded')
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  subscribe<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }

    const handlers = this.handlers.get(eventType)!
    handlers.push(handler)

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Publish an event (synchronous)
   * 
   * Executes handlers synchronously. For async handlers, use asyncPublish() instead.
   * Throws errors up to caller for proper handling.
   * 
   * @param event - Event object (must have a 'type' property)
   * @throws Error if any handler throws (first error encountered)
   */
  publish(event: { type: string }): void {
    const eventType = event.type
    const handlers = this.handlers.get(eventType) || []

    // Execute handlers synchronously
    // Throw errors up to caller for proper handling
    for (const handler of handlers) {
      const result = handler(event)
      
      // If handler returns a promise, throw error (can't await in sync context)
      if (result instanceof Promise) {
        throw new Error(
          `Async event handler for ${eventType} not supported in synchronous publish. Use asyncPublish() instead.`
        )
      }
    }
  }

  /**
   * Publish an event asynchronously
   * 
   * Executes handlers and awaits async handlers. Use this when handlers are async.
   * Throws errors up to caller for proper handling.
   * 
   * @param event - Event object (must have a 'type' property)
   * @throws Error if any handler throws (first error encountered)
   */
  async asyncPublish(event: { type: string }): Promise<void> {
    const eventType = event.type
    const handlers = this.handlers.get(eventType) || []

    // Execute handlers and await async ones
    for (const handler of handlers) {
      const result = handler(event)
      
      if (result instanceof Promise) {
        await result
      }
    }
  }

  /**
   * Get all subscribed handlers for an event type
   * 
   * @param eventType - Event type name
   * @returns Array of handlers
   */
  getHandlers(eventType: string): EventHandler[] {
    return this.handlers.get(eventType) || []
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear()
  }
}

// Singleton instance (can be replaced with dependency injection)
let eventBusInstance: EventBus | null = null

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus()
  }
  return eventBusInstance
}

