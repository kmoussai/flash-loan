/**
 * Test Doubles for Payment System Tests
 * 
 * In-memory implementations and fakes for testing.
 */

import { Payment } from '../../domain/Payment'
import { PaymentStatus } from '../../domain/PaymentStatus'
import { PaymentDomainEvent } from '../../domain/PaymentEvents'
import { PaymentRepository } from '../../infrastructure/repositories/PaymentRepository'
import { PaymentEventRepository, PaymentEventRecord } from '../../infrastructure/repositories/PaymentEventRepository'
import { EventBus, EventHandler } from '../../events/EventBus'

/**
 * In-Memory Payment Repository
 */
export class InMemoryPaymentRepository implements PaymentRepository {
  private payments: Map<string, Payment> = new Map()

  async getById(id: string): Promise<Payment | null> {
    return this.payments.get(id) || null
  }

  async save(payment: Payment): Promise<void> {
    this.payments.set(payment.id, payment)
  }

  async findByLoanId(loanId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (p) => p.loanId === loanId
    )
  }

  async findByProviderTransactionId(
    provider: string,
    providerTransactionId: string
  ): Promise<Payment | null> {
    return (
      Array.from(this.payments.values()).find(
        (p) =>
          p.provider === provider &&
          p.providerTransactionId === providerTransactionId
      ) || null
    )
  }

  clear(): void {
    this.payments.clear()
  }

  getAll(): Payment[] {
    return Array.from(this.payments.values())
  }
}

/**
 * In-Memory Payment Event Repository
 */
export class InMemoryPaymentEventRepository
  implements PaymentEventRepository
{
  private events: Map<string, PaymentEventRecord> = new Map()
  private nextId = 1

  async save(paymentId: string, event: PaymentDomainEvent): Promise<string> {
    const id = `event-${this.nextId++}`
    const record: PaymentEventRecord = {
      id,
      paymentId,
      type: event.type,
      payload: event,
      status: 'pending',
      createdAt: new Date(),
      processedAt: null,
      errorMessage: null,
    }
    this.events.set(id, record)
    return id
  }

  async markProcessed(eventId: string): Promise<void> {
    const record = this.events.get(eventId)
    if (record) {
      record.status = 'processed'
      record.processedAt = new Date()
    }
  }

  async markFailed(eventId: string, errorMessage?: string): Promise<void> {
    const record = this.events.get(eventId)
    if (record) {
      record.status = 'failed'
      record.errorMessage = errorMessage || null
    }
  }

  async getPending(limit: number = 100): Promise<PaymentEventRecord[]> {
    return Array.from(this.events.values())
      .filter((e) => e.status === 'pending')
      .slice(0, limit)
  }

  getById(eventId: string): PaymentEventRecord | undefined {
    return this.events.get(eventId)
  }

  getAll(): PaymentEventRecord[] {
    return Array.from(this.events.values())
  }

  clear(): void {
    this.events.clear()
    this.nextId = 1
  }
}

/**
 * Fake Event Bus with call tracking
 */
export class FakeEventBus extends EventBus {
  private publishedEvents: Array<{ type: string; event: any }> = []
  private handlerCalls: Array<{ type: string; event: any }> = []
  private shouldThrow = false
  private throwError: Error | null = null

  /**
   * Configure the event bus to throw an error on next publish
   */
  setShouldThrow(error: Error): void {
    this.shouldThrow = true
    this.throwError = error
  }

  /**
   * Reset throw configuration
   */
  resetThrow(): void {
    this.shouldThrow = false
    this.throwError = null
  }

  async asyncPublish(event: { type: string }): Promise<void> {
    this.publishedEvents.push({ type: event.type, event })

    if (this.shouldThrow && this.throwError) {
      this.shouldThrow = false
      throw this.throwError
    }

    // Call actual handlers
    const handlers = this.getHandlers(event.type)
    for (const handler of handlers) {
      const result = handler(event)
      this.handlerCalls.push({ type: event.type, event })

      if (result instanceof Promise) {
        await result
      }
    }
  }

  publish(event: { type: string }): void {
    this.publishedEvents.push({ type: event.type, event })

    if (this.shouldThrow && this.throwError) {
      this.shouldThrow = false
      throw this.throwError
    }

    // Call actual handlers
    const handlers = this.getHandlers(event.type)
    for (const handler of handlers) {
      const result = handler(event)
      this.handlerCalls.push({ type: event.type, event })

      if (result instanceof Promise) {
        throw new Error(
          'Async handler not supported in synchronous publish. Use asyncPublish() instead.'
        )
      }
    }
  }

  getPublishedEvents(): Array<{ type: string; event: any }> {
    return [...this.publishedEvents]
  }

  getHandlerCalls(): Array<{ type: string; event: any }> {
    return [...this.handlerCalls]
  }

  clearHistory(): void {
    this.publishedEvents = []
    this.handlerCalls = []
  }
}

/**
 * Spy function for tracking calls
 */
export class Spy {
  private calls: any[][] = []

  fn(...args: any[]): any {
    this.calls.push(args)
  }

  getCalls(): any[][] {
    return [...this.calls]
  }

  getCallCount(): number {
    return this.calls.length
  }

  wasCalled(): boolean {
    return this.calls.length > 0
  }

  wasCalledWith(...args: any[]): boolean {
    return this.calls.some((call) => {
      if (call.length !== args.length) return false
      return call.every((val, idx) => val === args[idx])
    })
  }

  reset(): void {
    this.calls = []
  }
}

