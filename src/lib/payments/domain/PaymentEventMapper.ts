/**
 * Payment Event Mapper
 * 
 * Helper to map PaymentStatus transitions to domain events.
 * Keeps event creation logic separate from the Payment entity.
 */

import { PaymentStatus } from './PaymentStatus'
import {
  PaymentDomainEvent,
  PaymentProcessingEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  PaymentCancelledEvent,
  PaymentRefundedEvent,
} from './PaymentEvents'

export interface CreateEventParams {
  paymentId: string
  loanId: string
  amount: number
  previousStatus: PaymentStatus
  newStatus: PaymentStatus
  metadata?: {
    errorCode?: string
    errorMessage?: string
    cancelledReason?: string
    refundAmount?: number
  }
}

/**
 * Create a domain event for a status transition
 * 
 * @param params - Event creation parameters
 * @returns Domain event or null if no event should be emitted
 */
export function createPaymentEvent(
  params: CreateEventParams
): PaymentDomainEvent | null {
  const { paymentId, loanId, amount, previousStatus, newStatus, metadata } = params

  // No event if status hasn't changed
  if (previousStatus === newStatus) {
    return null
  }

  const baseEvent = {
    paymentId,
    timestamp: new Date(),
  }

  switch (newStatus) {
    case PaymentStatus.PROCESSING:
      return {
        ...baseEvent,
        type: 'PaymentProcessing',
        previousStatus,
      } as PaymentProcessingEvent

    case PaymentStatus.SUCCEEDED:
      return {
        ...baseEvent,
        type: 'PaymentSucceeded',
        amount,
        loanId,
        previousStatus,
      } as PaymentSucceededEvent

    case PaymentStatus.FAILED:
      return {
        ...baseEvent,
        type: 'PaymentFailed',
        amount,
        loanId,
        previousStatus,
        errorCode: metadata?.errorCode,
        errorMessage: metadata?.errorMessage,
      } as PaymentFailedEvent

    case PaymentStatus.CANCELLED:
      return {
        ...baseEvent,
        type: 'PaymentCancelled',
        amount,
        loanId,
        previousStatus,
        reason: metadata?.cancelledReason,
      } as PaymentCancelledEvent

    case PaymentStatus.REFUNDED:
      return {
        ...baseEvent,
        type: 'PaymentRefunded',
        amount,
        loanId,
        previousStatus,
        refundAmount: metadata?.refundAmount || amount,
      } as PaymentRefundedEvent

    default:
      // No event for CREATED status (handled separately if needed)
      return null
  }
}

