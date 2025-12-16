/**
 * Process Pending Payment Events Tests
 * 
 * Tests for event reprocessing from the outbox.
 */

import { processPendingPaymentEvents } from '../application/processPendingPaymentEvents'
import { PaymentStatus } from '../domain/PaymentStatus'
import {
  InMemoryPaymentEventRepository,
  FakeEventBus,
} from './helpers/test-doubles'
import { PaymentSucceededEvent, PaymentFailedEvent } from '../domain/PaymentEvents'

describe('processPendingPaymentEvents', () => {
  let eventRepository: InMemoryPaymentEventRepository
  let eventBus: FakeEventBus

  beforeEach(() => {
    eventRepository = new InMemoryPaymentEventRepository()
    eventBus = new FakeEventBus()
  })

  afterEach(() => {
    eventRepository.clear()
    eventBus.clearHistory()
  })

  describe('processes pending events successfully', () => {
    it('processes a pending PaymentSucceeded event', async () => {
      // Create a pending event
      const event: PaymentSucceededEvent = {
        type: 'PaymentSucceeded',
        paymentId: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        previousStatus: PaymentStatus.PROCESSING,
        timestamp: new Date(),
      }

      const eventId = await eventRepository.save('payment-1', event)

      // Subscribe a handler
      let handlerCalled = false
      eventBus.subscribe('PaymentSucceeded', async (e) => {
        handlerCalled = true
        expect(e.type).toBe('PaymentSucceeded')
        expect((e as PaymentSucceededEvent).amount).toBe(100)
      })

      // Process pending events
      const result = await processPendingPaymentEvents(
        eventRepository,
        eventBus,
        100
      )

      // Verify results
      expect(result.processed).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)

      // Verify handler was called
      expect(handlerCalled).toBe(true)

      // Verify event was marked as processed
      const savedEvent = eventRepository.getById(eventId)
      expect(savedEvent).not.toBeUndefined()
      expect(savedEvent?.status).toBe('processed')
      expect(savedEvent?.processedAt).not.toBeNull()
    })

    it('processes multiple pending events', async () => {
      // Create multiple pending events
      const event1: PaymentSucceededEvent = {
        type: 'PaymentSucceeded',
        paymentId: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        previousStatus: PaymentStatus.PROCESSING,
        timestamp: new Date(),
      }

      const event2: PaymentFailedEvent = {
        type: 'PaymentFailed',
        paymentId: 'payment-2',
        loanId: 'loan-2',
        amount: 200,
        previousStatus: PaymentStatus.PROCESSING,
        timestamp: new Date(),
      }

      await eventRepository.save('payment-1', event1)
      await eventRepository.save('payment-2', event2)

      let succeededCount = 0
      let failedCount = 0

      eventBus.subscribe('PaymentSucceeded', async () => {
        succeededCount++
      })

      eventBus.subscribe('PaymentFailed', async () => {
        failedCount++
      })

      // Process pending events
      const result = await processPendingPaymentEvents(
        eventRepository,
        eventBus,
        100
      )

      // Verify results
      expect(result.processed).toBe(2)
      expect(result.failed).toBe(0)
      expect(succeededCount).toBe(1)
      expect(failedCount).toBe(1)

      // Verify all events are processed
      const allEvents = eventRepository.getAll()
      expect(allEvents.every((e) => e.status === 'processed')).toBe(true)
    })

    it('respects the limit parameter', async () => {
      // Create more events than limit
      for (let i = 0; i < 5; i++) {
        const event: PaymentSucceededEvent = {
          type: 'PaymentSucceeded',
          paymentId: `payment-${i}`,
          loanId: `loan-${i}`,
          amount: 100,
          previousStatus: PaymentStatus.PROCESSING,
          timestamp: new Date(),
        }
        await eventRepository.save(`payment-${i}`, event)
      }

      // Process with limit of 2
      const result = await processPendingPaymentEvents(
        eventRepository,
        eventBus,
        2
      )

      // Should only process 2 events
      expect(result.processed).toBe(2)
      expect(result.failed).toBe(0)

      // Verify only 2 events are processed
      const allEvents = eventRepository.getAll()
      const processedCount = allEvents.filter(
        (e) => e.status === 'processed'
      ).length
      expect(processedCount).toBe(2)
    })
  })

  describe('keeps event pending on failure', () => {
    it('marks event as failed when handler throws', async () => {
      // Create a pending event
      const event: PaymentSucceededEvent = {
        type: 'PaymentSucceeded',
        paymentId: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        previousStatus: PaymentStatus.PROCESSING,
        timestamp: new Date(),
      }

      const eventId = await eventRepository.save('payment-1', event)

      // Subscribe a handler that throws
      eventBus.subscribe('PaymentSucceeded', async () => {
        throw new Error('Handler failed')
      })

      // Process pending events
      const result = await processPendingPaymentEvents(
        eventRepository,
        eventBus,
        100
      )

      // Verify results
      expect(result.processed).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('Handler failed')

      // Verify event was marked as failed
      const savedEvent = eventRepository.getById(eventId)
      expect(savedEvent).not.toBeUndefined()
      expect(savedEvent?.status).toBe('failed')
      expect(savedEvent?.errorMessage).toContain('Handler failed')
    })

    it('allows retry of failed events', async () => {
      // Create a pending event
      const event: PaymentSucceededEvent = {
        type: 'PaymentSucceeded',
        paymentId: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        previousStatus: PaymentStatus.PROCESSING,
        timestamp: new Date(),
      }

      const eventId = await eventRepository.save('payment-1', event)

      // First attempt: handler throws
      let attemptCount = 0
      eventBus.subscribe('PaymentSucceeded', async () => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('First attempt failed')
        }
      })

      // Process (first attempt fails)
      const result1 = await processPendingPaymentEvents(
        eventRepository,
        eventBus,
        100
      )

      expect(result1.failed).toBe(1)
      let savedEvent = eventRepository.getById(eventId)
      expect(savedEvent?.status).toBe('failed')

      // Reset handler to succeed on second attempt
      eventBus.clear()
      eventBus.subscribe('PaymentSucceeded', async () => {
        attemptCount++
        // This time it succeeds
      })

      // Manually mark as pending for retry
      savedEvent!.status = 'pending'
      savedEvent!.errorMessage = null

      // Retry processing
      const result2 = await processPendingPaymentEvents(
        eventRepository,
        eventBus,
        100
      )

      // Should succeed on retry
      expect(result2.processed).toBe(1)
      expect(result2.failed).toBe(0)

      savedEvent = eventRepository.getById(eventId)
      expect(savedEvent?.status).toBe('processed')
    })

    it('handles multiple failures correctly', async () => {
      // Create multiple events
      const event1: PaymentSucceededEvent = {
        type: 'PaymentSucceeded',
        paymentId: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        previousStatus: PaymentStatus.PROCESSING,
        timestamp: new Date(),
      }

      const event2: PaymentSucceededEvent = {
        type: 'PaymentSucceeded',
        paymentId: 'payment-2',
        loanId: 'loan-2',
        amount: 200,
        previousStatus: PaymentStatus.PROCESSING,
        timestamp: new Date(),
      }

      const eventId1 = await eventRepository.save('payment-1', event1)
      const eventId2 = await eventRepository.save('payment-2', event2)

      // Handler throws for first event, succeeds for second
      let callCount = 0
      eventBus.subscribe('PaymentSucceeded', async (e) => {
        callCount++
        const evt = e as PaymentSucceededEvent
        if (evt.paymentId === 'payment-1') {
          throw new Error('Payment 1 failed')
        }
        // Payment 2 succeeds
      })

      // Process pending events
      const result = await processPendingPaymentEvents(
        eventRepository,
        eventBus,
        100
      )

      // Verify results
      expect(result.processed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)

      // Verify first event is failed, second is processed
      const savedEvent1 = eventRepository.getById(eventId1)
      const savedEvent2 = eventRepository.getById(eventId2)

      expect(savedEvent1?.status).toBe('failed')
      expect(savedEvent2?.status).toBe('processed')
    })
  })

  describe('event processing order', () => {
    it('processes events in creation order', async () => {
      // Create events with different timestamps
      const events: PaymentSucceededEvent[] = []
      for (let i = 0; i < 3; i++) {
        const event: PaymentSucceededEvent = {
          type: 'PaymentSucceeded',
          paymentId: `payment-${i}`,
          loanId: `loan-${i}`,
          amount: 100,
          previousStatus: PaymentStatus.PROCESSING,
          timestamp: new Date(),
        }
        await eventRepository.save(`payment-${i}`, event)
        events.push(event)
      }

      const processedOrder: string[] = []
      eventBus.subscribe('PaymentSucceeded', async (e) => {
        const evt = e as PaymentSucceededEvent
        processedOrder.push(evt.paymentId)
      })

      // Process events
      await processPendingPaymentEvents(eventRepository, eventBus, 100)

      // Verify order (should match creation order)
      expect(processedOrder).toHaveLength(3)
      expect(processedOrder[0]).toBe('payment-0')
      expect(processedOrder[1]).toBe('payment-1')
      expect(processedOrder[2]).toBe('payment-2')
    })
  })
})

