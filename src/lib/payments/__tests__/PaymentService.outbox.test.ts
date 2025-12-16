/**
 * PaymentService Outbox Pattern Tests
 * 
 * Tests for payment persistence and event outbox behavior.
 */

import { PaymentService } from '../application/PaymentService'
import { Payment } from '../domain/Payment'
import { PaymentStatus } from '../domain/PaymentStatus'
import {
  InMemoryPaymentRepository,
  InMemoryPaymentEventRepository,
  FakeEventBus,
  Spy,
} from './helpers/test-doubles'

describe('PaymentService.outbox', () => {
  let paymentRepository: InMemoryPaymentRepository
  let eventRepository: InMemoryPaymentEventRepository
  let eventBus: FakeEventBus
  let paymentService: PaymentService

  beforeEach(() => {
    paymentRepository = new InMemoryPaymentRepository()
    eventRepository = new InMemoryPaymentEventRepository()
    eventBus = new FakeEventBus()
    paymentService = new PaymentService(
      paymentRepository,
      eventBus,
      eventRepository
    )
  })

  afterEach(() => {
    paymentRepository.clear()
    eventRepository.clear()
    eventBus.clearHistory()
  })

  describe('persists payment and event before dispatch', () => {
    it('persists payment before event, and event before dispatch', async () => {
      // Create a payment in PROCESSING status
      const payment = new Payment({
        id: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        status: PaymentStatus.PROCESSING,
        provider: 'zumrails',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await paymentRepository.save(payment)

      // Track call order using call sequence
      const callSequence: string[] = []

      // Wrap repository methods to track calls
      const originalSavePayment = paymentRepository.save.bind(paymentRepository)
      paymentRepository.save = async (p: Payment) => {
        callSequence.push('save-payment')
        return originalSavePayment(p)
      }

      const originalSaveEvent = eventRepository.save.bind(eventRepository)
      eventRepository.save = async (paymentId: string, event: any) => {
        callSequence.push('save-event')
        return originalSaveEvent(paymentId, event)
      }

      eventBus.subscribe('PaymentSucceeded', async (event) => {
        callSequence.push('publish-event')
      })

      // Transition to SUCCEEDED
      await paymentService.transitionPayment({
        paymentId: 'payment-1',
        newStatus: PaymentStatus.SUCCEEDED,
      })

      // Verify call order: payment save -> event save -> publish
      expect(callSequence).toContain('save-payment')
      expect(callSequence).toContain('save-event')
      expect(callSequence).toContain('publish-event')
      expect(callSequence.indexOf('save-payment')).toBeLessThan(
        callSequence.indexOf('save-event')
      )
      expect(callSequence.indexOf('save-event')).toBeLessThan(
        callSequence.indexOf('publish-event')
      )

      // Verify payment was persisted
      const savedPayment = await paymentRepository.getById('payment-1')
      expect(savedPayment).not.toBeNull()
      expect(savedPayment?.status).toBe(PaymentStatus.SUCCEEDED)

      // Verify event was persisted
      const events = eventRepository.getAll()
      expect(events.length).toBe(1)
      expect(events[0].type).toBe('PaymentSucceeded')
      expect(events[0].status).toBe('processed') // Should be marked as processed after successful dispatch
    })

    it('persists payment even if event dispatch fails', async () => {
      const payment = new Payment({
        id: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        status: PaymentStatus.PROCESSING,
        provider: 'zumrails',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await paymentRepository.save(payment)

      // Make event bus throw an error
      eventBus.setShouldThrow(new Error('Handler failed'))

      // Transition to SUCCEEDED
      await paymentService.transitionPayment({
        paymentId: 'payment-1',
        newStatus: PaymentStatus.SUCCEEDED,
      })

      // Payment should still be persisted with new status
      const savedPayment = await paymentRepository.getById('payment-1')
      expect(savedPayment).not.toBeNull()
      expect(savedPayment?.status).toBe(PaymentStatus.SUCCEEDED)

      // Event should be persisted but marked as failed
      const events = eventRepository.getAll()
      expect(events.length).toBe(1)
      expect(events[0].status).toBe('failed')
      expect(events[0].errorMessage).toContain('Handler failed')
    })
  })

  describe('does not rollback payment on handler failure', () => {
    it('keeps payment status as SUCCEEDED when handler throws', async () => {
      const payment = new Payment({
        id: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        status: PaymentStatus.PROCESSING,
        provider: 'zumrails',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await paymentRepository.save(payment)

      // Subscribe a handler that throws
      eventBus.subscribe('PaymentSucceeded', async () => {
        throw new Error('Side effect failed')
      })

      // Transition to SUCCEEDED
      await paymentService.transitionPayment({
        paymentId: 'payment-1',
        newStatus: PaymentStatus.SUCCEEDED,
      })

      // Payment status should be SUCCEEDED (not rolled back)
      const savedPayment = await paymentRepository.getById('payment-1')
      expect(savedPayment?.status).toBe(PaymentStatus.SUCCEEDED)

      // Event should be marked as failed
      const events = eventRepository.getAll()
      expect(events.length).toBe(1)
      expect(events[0].status).toBe('failed')
    })

    it('allows retry of failed events', async () => {
      const payment = new Payment({
        id: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        status: PaymentStatus.PROCESSING,
        provider: 'zumrails',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await paymentRepository.save(payment)

      // First attempt: handler throws
      let attemptCount = 0
      eventBus.subscribe('PaymentSucceeded', async () => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('First attempt failed')
        }
      })

      // Transition to SUCCEEDED (first attempt fails)
      await paymentService.transitionPayment({
        paymentId: 'payment-1',
        newStatus: PaymentStatus.SUCCEEDED,
      })

      // Event should be marked as failed
      let events = eventRepository.getAll()
      expect(events.length).toBe(1)
      expect(events[0].status).toBe('failed')

      // Reset event bus and retry
      eventBus.resetThrow()
      eventBus.clearHistory()

      // Manually mark event as pending and retry
      const failedEvent = events[0]
      failedEvent.status = 'pending'
      failedEvent.errorMessage = null

      // Retry processing (simulating processPendingPaymentEvents)
      try {
        await eventBus.asyncPublish(failedEvent.payload)
        await eventRepository.markProcessed(failedEvent.id)
      } catch (error) {
        await eventRepository.markFailed(failedEvent.id, (error as Error).message)
      }

      // Event should now be processed
      events = eventRepository.getAll()
      expect(events[0].status).toBe('processed')
    })
  })

  describe('event persistence', () => {
    it('persists event to outbox for status transitions that emit events', async () => {
      const payment = new Payment({
        id: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        status: PaymentStatus.CREATED,
        provider: 'zumrails',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await paymentRepository.save(payment)

      await paymentService.transitionPayment({
        paymentId: 'payment-1',
        newStatus: PaymentStatus.PROCESSING,
      })

      // Event should be persisted
      const events = eventRepository.getAll()
      expect(events.length).toBe(1)
      expect(events[0].type).toBe('PaymentProcessing')
      expect(events[0].paymentId).toBe('payment-1')
    })

    it('does not persist event when status does not change', async () => {
      const payment = new Payment({
        id: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        status: PaymentStatus.PROCESSING,
        provider: 'zumrails',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await paymentRepository.save(payment)

      // Try to transition to same status
      await paymentService.transitionPayment({
        paymentId: 'payment-1',
        newStatus: PaymentStatus.PROCESSING,
      })

      // No event should be persisted
      const events = eventRepository.getAll()
      expect(events.length).toBe(0)
    })
  })

  describe('payment persistence', () => {
    it('always persists payment before event processing', async () => {
      const payment = new Payment({
        id: 'payment-1',
        loanId: 'loan-1',
        amount: 100,
        status: PaymentStatus.PROCESSING,
        provider: 'zumrails',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await paymentRepository.save(payment)

      // Make event repository throw to simulate failure
      const originalSave = eventRepository.save.bind(eventRepository)
      eventRepository.save = async () => {
        throw new Error('Event save failed')
      }

      // Transition should still succeed for payment
      try {
        await paymentService.transitionPayment({
          paymentId: 'payment-1',
          newStatus: PaymentStatus.SUCCEEDED,
        })
      } catch (error) {
        // PaymentService might throw, but payment should be saved first
      }

      // Payment should be persisted (even if event save failed)
      const savedPayment = await paymentRepository.getById('payment-1')
      expect(savedPayment).not.toBeNull()
      expect(savedPayment?.status).toBe(PaymentStatus.SUCCEEDED)
    })
  })
})

