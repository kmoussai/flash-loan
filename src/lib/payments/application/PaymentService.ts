/**
 * Payment Service
 * 
 * Orchestrates payment lifecycle:
 * - Loads payment from repository
 * - Applies status transition (with validation)
 * - Persists payment
 * - Emits domain events
 */

import { Payment } from '../domain/Payment'
import { PaymentStatus } from '../domain/PaymentStatus'
import { PaymentDomainEvent } from '../domain/PaymentEvents'
import { validateTransition } from './TransitionPayment'
import { PaymentRepository } from '../infrastructure/repositories/PaymentRepository'
import { PaymentEventRepository } from '../infrastructure/repositories/PaymentEventRepository'
import { EventBus } from '../events/EventBus'
import { PaymentProvider } from '../infrastructure/providers/PaymentProvider'

export interface TransitionPaymentParams {
  paymentId: string
  newStatus: PaymentStatus
  metadata?: {
    errorCode?: string
    errorMessage?: string
    cancelledReason?: string
    refundAmount?: number
    providerTransactionId?: string
    providerData?: Record<string, unknown>
  }
}

export class PaymentService {
  constructor(
    private repository: PaymentRepository,
    private eventBus: EventBus,
    private eventRepository: PaymentEventRepository,
    private provider?: PaymentProvider
  ) {}

  /**
   * Transition a payment to a new status
   * 
   * Handles provider interactions before status transition:
   * - For CANCELLED: cancels provider transaction first
   * - For REFUNDED: creates refund transaction first
   * 
   * @param params - Transition parameters
   * @returns The updated payment
   * @throws Error if transition is invalid or payment not found
   */
  async transitionPayment(
    params: TransitionPaymentParams
  ): Promise<Payment> {
    // Load payment from repository
    const payment = await this.repository.getById(params.paymentId)

    if (!payment) {
      throw new Error(`Payment not found: ${params.paymentId}`)
    }

    // Validate transition
    const validation = validateTransition(payment.status, params.newStatus)
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid status transition')
    }

    // Handle provider interactions BEFORE status transition
    if (this.provider) {
      // Cancel provider transaction if transitioning to CANCELLED
      if (params.newStatus === PaymentStatus.CANCELLED && payment.providerTransactionId) {
        const cancelResult = await this.provider.cancelTransaction({
          providerTransactionId: payment.providerTransactionId,
          reason: params.metadata?.cancelledReason,
        })

        if (!cancelResult.success) {
          // Log but don't fail - we still want to mark payment as cancelled
          console.warn(
            `Failed to cancel provider transaction for payment ${params.paymentId}:`,
            cancelResult.error
          )
        }
      }

      // Create refund transaction if transitioning to REFUNDED
      if (params.newStatus === PaymentStatus.REFUNDED && payment.providerTransactionId) {
        const refundAmount = params.metadata?.refundAmount || payment.amount
        const refundResult = await this.provider.refundTransaction({
          providerTransactionId: payment.providerTransactionId,
          amount: refundAmount,
          reason: params.metadata?.cancelledReason,
        })

        if (refundResult.success && refundResult.providerTransactionId) {
          // Update metadata with refund transaction ID
          params.metadata = {
            ...params.metadata,
            providerTransactionId: refundResult.providerTransactionId,
            providerData: refundResult.providerData,
          }
        } else {
          // Log but don't fail - we still want to mark payment as refunded
          console.warn(
            `Failed to create refund transaction for payment ${params.paymentId}:`,
            refundResult.error
          )
        }
      }
    }

    // Apply transition (returns domain event, doesn't emit it)
    const event = payment.transitionTo(params.newStatus, params.metadata)

    // Persist payment FIRST (before event processing)
    await this.repository.save(payment)

    // IF a PaymentEvent is returned:
    if (event) {
      // Persist event to outbox FIRST (before dispatch)
      const eventId = await this.eventRepository.save(payment.id, event)

      // Try to dispatch immediately (best effort)
      // If dispatch fails, event remains in outbox for retry
      try {
        // Use asyncPublish since handlers may be async
        await this.eventBus.asyncPublish(event)
        // Mark as processed if dispatch succeeds
        await this.eventRepository.markProcessed(eventId)
      } catch (error: any) {
        // Mark as failed but don't throw - payment is already persisted
        await this.eventRepository.markFailed(
          eventId,
          error.message || 'Event dispatch failed'
        )
        // Log error but don't fail the payment transition
        console.error(
          `Failed to dispatch payment event ${eventId} for payment ${params.paymentId}:`,
          error
        )
      }
    }

    return payment
  }

  /**
   * Create a new payment
   * 
   * @param paymentData - Payment data
   * @returns The created payment
   */
  async createPayment(paymentData: {
    id: string
    loanId: string
    amount: number
    provider: string
    providerTransactionId?: string
    providerData?: Record<string, unknown>
  }): Promise<Payment> {
    const payment = new Payment({
      ...paymentData,
      status: PaymentStatus.CREATED,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Persist payment
    await this.repository.save(payment)

    // Note: No event emitted for CREATED status
    // If you need a PaymentCreated event, create it explicitly here

    return payment
  }

  /**
   * Get payment by ID
   * 
   * @param paymentId - Payment ID
   * @returns The payment or null if not found
   */
  async getPayment(paymentId: string): Promise<Payment | null> {
    return this.repository.getById(paymentId)
  }
}

