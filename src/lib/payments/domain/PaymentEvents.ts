/**
 * Payment Domain Events
 * 
 * Events emitted when payment status changes.
 * These events trigger side effects (emails, loan updates, etc.)
 */

import { PaymentStatus } from './PaymentStatus'

export interface PaymentEvent {
  paymentId: string
  timestamp: Date
}

export interface PaymentCreatedEvent extends PaymentEvent {
  type: 'PaymentCreated'
  amount: number
  loanId: string
}

export interface PaymentProcessingEvent extends PaymentEvent {
  type: 'PaymentProcessing'
  previousStatus: PaymentStatus
}

export interface PaymentSucceededEvent extends PaymentEvent {
  type: 'PaymentSucceeded'
  amount: number
  loanId: string
  previousStatus: PaymentStatus
}

export interface PaymentFailedEvent extends PaymentEvent {
  type: 'PaymentFailed'
  amount: number
  loanId: string
  previousStatus: PaymentStatus
  errorCode?: string
  errorMessage?: string
}

export interface PaymentCancelledEvent extends PaymentEvent {
  type: 'PaymentCancelled'
  amount: number
  loanId: string
  previousStatus: PaymentStatus
  reason?: string
}

export interface PaymentRefundedEvent extends PaymentEvent {
  type: 'PaymentRefunded'
  amount: number
  loanId: string
  previousStatus: PaymentStatus
  refundAmount: number
}

export type PaymentDomainEvent =
  | PaymentCreatedEvent
  | PaymentProcessingEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentCancelledEvent
  | PaymentRefundedEvent

