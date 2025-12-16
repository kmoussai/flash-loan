/**
 * Payments Module
 * 
 * Clean, generic payment handling system with explicit status transitions
 * and side-effect isolation.
 * 
 * Usage:
 * - PaymentService requires: repository, eventBus, eventRepository (and optional provider)
 * - Wire side effects using wirePaymentSideEffects()
 * - Process pending events using processPendingPaymentEvents()
 */

// Domain
export { PaymentStatus, isPaymentStatus } from './domain/PaymentStatus'
export type {
  PaymentEvent,
  PaymentCreatedEvent,
  PaymentProcessingEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  PaymentCancelledEvent,
  PaymentRefundedEvent,
  PaymentDomainEvent,
} from './domain/PaymentEvents'
export { Payment } from './domain/Payment'
export type { PaymentData } from './domain/Payment'
export { createPaymentEvent } from './domain/PaymentEventMapper'
export type { CreateEventParams } from './domain/PaymentEventMapper'

// Application
export { PaymentService } from './application/PaymentService'
export type { TransitionPaymentParams } from './application/PaymentService'
export { validateTransition, getAllowedNextStatuses } from './application/TransitionPayment'
export type { TransitionValidationResult } from './application/TransitionPayment'
export { processPendingPaymentEvents, processPendingPaymentEvent } from './application/processPendingPaymentEvents'
export type { ProcessPendingEventsResult } from './application/processPendingPaymentEvents'

// Infrastructure
export type { PaymentProvider } from './infrastructure/providers/PaymentProvider'
export type {
  CreateTransactionParams,
  CreateTransactionResult,
  CancelTransactionParams,
  CancelTransactionResult,
  RefundTransactionParams,
  RefundTransactionResult,
  SyncTransactionParams,
  SyncTransactionResult,
} from './infrastructure/providers/PaymentProvider'
export { ZumRailsProvider } from './infrastructure/providers/ZumRailsProvider'
export type { PaymentRepository } from './infrastructure/repositories/PaymentRepository'
export { SupabasePaymentRepository } from './infrastructure/repositories/PaymentRepository'
export type { PaymentEventRepository } from './infrastructure/repositories/PaymentEventRepository'
export { SupabasePaymentEventRepository } from './infrastructure/repositories/PaymentEventRepository'
export type { PaymentEventRecord } from './infrastructure/repositories/PaymentEventRepository'

// Events
export { EventBus, getEventBus } from './events/EventBus'
export type { EventHandler } from './events/EventBus'

// Side Effects
export { wirePaymentSideEffects } from './side-effects/index'
export type { SideEffectDependencies } from './side-effects/index'
export { OnPaymentSucceeded } from './side-effects/handlers/OnPaymentSucceeded'
export type { OnPaymentSucceededDependencies } from './side-effects/handlers/OnPaymentSucceeded'
export { OnPaymentFailed } from './side-effects/handlers/OnPaymentFailed'
export type { OnPaymentFailedDependencies } from './side-effects/handlers/OnPaymentFailed'
export { OnPaymentCancelled } from './side-effects/handlers/OnPaymentCancelled'
export type { OnPaymentCancelledDependencies } from './side-effects/handlers/OnPaymentCancelled'

