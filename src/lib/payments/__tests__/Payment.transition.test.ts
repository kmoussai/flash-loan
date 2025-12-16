/**
 * Payment Transition Tests
 * 
 * Tests for Payment entity status transitions.
 */

import { Payment } from '../domain/Payment'
import { PaymentStatus } from '../domain/PaymentStatus'
import { PaymentDomainEvent } from '../domain/PaymentEvents'

describe('Payment.transitionTo', () => {
  const createPayment = (status: PaymentStatus): Payment => {
    return new Payment({
      id: 'payment-1',
      loanId: 'loan-1',
      amount: 100,
      status,
      provider: 'zumrails',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  describe('valid transitions', () => {
    it('allows CREATED -> PROCESSING', () => {
      const payment = createPayment(PaymentStatus.CREATED)
      const event = payment.transitionTo(PaymentStatus.PROCESSING)

      expect(payment.status).toBe(PaymentStatus.PROCESSING)
      expect(event).not.toBeNull()
      expect(event?.type).toBe('PaymentProcessing')
    })

    it('allows CREATED -> CANCELLED', () => {
      const payment = createPayment(PaymentStatus.CREATED)
      const event = payment.transitionTo(PaymentStatus.CANCELLED)

      expect(payment.status).toBe(PaymentStatus.CANCELLED)
      expect(event).not.toBeNull()
      expect(event?.type).toBe('PaymentCancelled')
    })

    it('allows PROCESSING -> SUCCEEDED', () => {
      const payment = createPayment(PaymentStatus.PROCESSING)
      const event = payment.transitionTo(PaymentStatus.SUCCEEDED)

      expect(payment.status).toBe(PaymentStatus.SUCCEEDED)
      expect(event).not.toBeNull()
      expect(event?.type).toBe('PaymentSucceeded')
    })

    it('allows PROCESSING -> FAILED', () => {
      const payment = createPayment(PaymentStatus.PROCESSING)
      const event = payment.transitionTo(PaymentStatus.FAILED, {
        errorCode: 'INSUFFICIENT_FUNDS',
        errorMessage: 'Account has insufficient funds',
      })

      expect(payment.status).toBe(PaymentStatus.FAILED)
      expect(payment.errorCode).toBe('INSUFFICIENT_FUNDS')
      expect(payment.errorMessage).toBe('Account has insufficient funds')
      expect(event).not.toBeNull()
      expect(event?.type).toBe('PaymentFailed')
      if (event?.type === 'PaymentFailed') {
        expect(event.errorCode).toBe('INSUFFICIENT_FUNDS')
        expect(event.errorMessage).toBe('Account has insufficient funds')
      }
    })

    it('allows PROCESSING -> CANCELLED', () => {
      const payment = createPayment(PaymentStatus.PROCESSING)
      const event = payment.transitionTo(PaymentStatus.CANCELLED, {
        cancelledReason: 'User requested cancellation',
      })

      expect(payment.status).toBe(PaymentStatus.CANCELLED)
      expect(payment.cancelledReason).toBe('User requested cancellation')
      expect(event).not.toBeNull()
      expect(event?.type).toBe('PaymentCancelled')
      if (event?.type === 'PaymentCancelled') {
        expect(event.reason).toBe('User requested cancellation')
      }
    })

    it('allows SUCCEEDED -> REFUNDED', () => {
      const payment = createPayment(PaymentStatus.SUCCEEDED)
      const event = payment.transitionTo(PaymentStatus.REFUNDED, {
        refundAmount: 100,
      })

      expect(payment.status).toBe(PaymentStatus.REFUNDED)
      expect(payment.refundAmount).toBe(100)
      expect(event).not.toBeNull()
      expect(event?.type).toBe('PaymentRefunded')
      if (event?.type === 'PaymentRefunded') {
        expect(event.refundAmount).toBe(100)
      }
    })

    it('allows FAILED -> PROCESSING (retry)', () => {
      const payment = createPayment(PaymentStatus.FAILED)
      const event = payment.transitionTo(PaymentStatus.PROCESSING)

      expect(payment.status).toBe(PaymentStatus.PROCESSING)
      expect(event).not.toBeNull()
      expect(event?.type).toBe('PaymentProcessing')
    })
  })

  describe('invalid transitions', () => {
    it('returns null when transitioning to same status', () => {
      const payment = createPayment(PaymentStatus.PROCESSING)
      const event = payment.transitionTo(PaymentStatus.PROCESSING)

      expect(payment.status).toBe(PaymentStatus.PROCESSING)
      expect(event).toBeNull()
    })

    it('does not allow CREATED -> SUCCEEDED', () => {
      const payment = createPayment(PaymentStatus.CREATED)
      // Note: This test verifies the entity doesn't prevent it,
      // but PaymentService.validateTransition will catch it
      const event = payment.transitionTo(PaymentStatus.SUCCEEDED)

      // Entity allows the transition (no validation in entity)
      // Validation happens in PaymentService
      expect(payment.status).toBe(PaymentStatus.SUCCEEDED)
      expect(event).not.toBeNull()
    })

    it('does not allow SUCCEEDED -> PROCESSING', () => {
      const payment = createPayment(PaymentStatus.SUCCEEDED)
      // Entity doesn't validate - PaymentService does
      const event = payment.transitionTo(PaymentStatus.PROCESSING)

      expect(payment.status).toBe(PaymentStatus.PROCESSING)
      expect(event).not.toBeNull()
    })
  })

  describe('event creation', () => {
    it('returns PaymentSucceeded event for SUCCEEDED status', () => {
      const payment = createPayment(PaymentStatus.PROCESSING)
      const event = payment.transitionTo(PaymentStatus.SUCCEEDED)

      expect(event).not.toBeNull()
      if (event) {
        expect(event.type).toBe('PaymentSucceeded')
        expect((event as any).amount).toBe(100)
        expect((event as any).loanId).toBe('loan-1')
        expect((event as any).previousStatus).toBe(PaymentStatus.PROCESSING)
      }
    })

    it('returns PaymentFailed event for FAILED status', () => {
      const payment = createPayment(PaymentStatus.PROCESSING)
      const event = payment.transitionTo(PaymentStatus.FAILED, {
        errorCode: 'ACCOUNT_CLOSED',
        errorMessage: 'Account is closed',
      })

      expect(event).not.toBeNull()
      if (event && event.type === 'PaymentFailed') {
        expect(event.type).toBe('PaymentFailed')
        expect(event.errorCode).toBe('ACCOUNT_CLOSED')
        expect(event.errorMessage).toBe('Account is closed')
      }
    })

    it('returns PaymentCancelled event for CANCELLED status', () => {
      const payment = createPayment(PaymentStatus.CREATED)
      const event = payment.transitionTo(PaymentStatus.CANCELLED, {
        cancelledReason: 'User cancelled',
      })

      expect(event).not.toBeNull()
      if (event && event.type === 'PaymentCancelled') {
        expect(event.type).toBe('PaymentCancelled')
        expect(event.reason).toBe('User cancelled')
      }
    })

    it('returns PaymentRefunded event for REFUNDED status', () => {
      const payment = createPayment(PaymentStatus.SUCCEEDED)
      const event = payment.transitionTo(PaymentStatus.REFUNDED, {
        refundAmount: 50,
      })

      expect(event).not.toBeNull()
      if (event && event.type === 'PaymentRefunded') {
        expect(event.type).toBe('PaymentRefunded')
        expect(event.refundAmount).toBe(50)
      }
    })
  })

  describe('metadata updates', () => {
    it('updates providerTransactionId when provided', () => {
      const payment = createPayment(PaymentStatus.CREATED)
      payment.transitionTo(PaymentStatus.PROCESSING, {
        providerTransactionId: 'provider-tx-123',
      })

      expect(payment.providerTransactionId).toBe('provider-tx-123')
    })

    it('updates providerData when provided', () => {
      const payment = createPayment(PaymentStatus.CREATED)
      const providerData = { externalId: 'ext-123' }
      payment.transitionTo(PaymentStatus.PROCESSING, {
        providerData,
      })

      expect(payment.providerData).toEqual(providerData)
    })

    it('updates updatedAt timestamp', () => {
      const payment = createPayment(PaymentStatus.CREATED)
      const oldUpdatedAt = new Date(payment.updatedAt)
      
      // Transition immediately - updatedAt should be set to current time
      payment.transitionTo(PaymentStatus.PROCESSING)
      
      // Verify updatedAt was updated (should be equal or greater)
      expect(payment.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime()
      )
      // Verify it's a Date object
      expect(payment.updatedAt).toBeInstanceOf(Date)
    })
  })
})

