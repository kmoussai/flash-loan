/**
 * Payment Entity
 * 
 * Core payment domain entity with no side effects.
 * Only validates and applies status transitions.
 * Returns domain events but does not emit them.
 */

import { PaymentStatus } from './PaymentStatus'
import { PaymentDomainEvent } from './PaymentEvents'
import { createPaymentEvent } from './PaymentEventMapper'

export interface PaymentData {
  id: string
  loanId: string
  amount: number
  status: PaymentStatus
  provider: string
  providerTransactionId?: string
  providerData?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
  cancelledReason?: string
  refundAmount?: number
  createdAt: Date
  updatedAt: Date
}

export class Payment {
  private _data: PaymentData

  constructor(data: PaymentData) {
    this._data = { ...data }
  }

  get id(): string {
    return this._data.id
  }

  get loanId(): string {
    return this._data.loanId
  }

  get amount(): number {
    return this._data.amount
  }

  get status(): PaymentStatus {
    return this._data.status
  }

  get provider(): string {
    return this._data.provider
  }

  get providerTransactionId(): string | undefined {
    return this._data.providerTransactionId
  }

  get providerData(): Record<string, unknown> | undefined {
    return this._data.providerData
  }

  get errorCode(): string | undefined {
    return this._data.errorCode
  }

  get errorMessage(): string | undefined {
    return this._data.errorMessage
  }

  get cancelledReason(): string | undefined {
    return this._data.cancelledReason
  }

  get refundAmount(): number | undefined {
    return this._data.refundAmount
  }

  get createdAt(): Date {
    return this._data.createdAt
  }

  get updatedAt(): Date {
    return this._data.updatedAt
  }

  /**
   * Get payment data for persistence
   */
  toData(): PaymentData {
    return { ...this._data }
  }

  /**
   * Transition to a new status
   * Updates internal state and returns a domain event (if status changed).
   * Does NOT emit events - that's the responsibility of PaymentService.
   * 
   * @param newStatus - The target status
   * @param metadata - Optional metadata for the transition (error codes, reasons, etc.)
   * @returns Domain event if status changed, null otherwise
   */
  transitionTo(
    newStatus: PaymentStatus,
    metadata?: {
      errorCode?: string
      errorMessage?: string
      cancelledReason?: string
      refundAmount?: number
      providerTransactionId?: string
      providerData?: Record<string, unknown>
    }
  ): PaymentDomainEvent | null {
    const previousStatus = this._data.status

    // Don't create event if status hasn't changed
    if (previousStatus === newStatus) {
      return null
    }

    // Update status and metadata
    this._data.status = newStatus
    this._data.updatedAt = new Date()

    if (metadata) {
      if (metadata.errorCode !== undefined) {
        this._data.errorCode = metadata.errorCode
      }
      if (metadata.errorMessage !== undefined) {
        this._data.errorMessage = metadata.errorMessage
      }
      if (metadata.cancelledReason !== undefined) {
        this._data.cancelledReason = metadata.cancelledReason
      }
      if (metadata.refundAmount !== undefined) {
        this._data.refundAmount = metadata.refundAmount
      }
      if (metadata.providerTransactionId !== undefined) {
        this._data.providerTransactionId = metadata.providerTransactionId
      }
      if (metadata.providerData !== undefined) {
        this._data.providerData = metadata.providerData
      }
    }

    // Create and return domain event (but don't emit it)
    return createPaymentEvent({
      paymentId: this._data.id,
      loanId: this._data.loanId,
      amount: this._data.amount,
      previousStatus,
      newStatus,
      metadata: {
        errorCode: metadata?.errorCode,
        errorMessage: metadata?.errorMessage,
        cancelledReason: metadata?.cancelledReason,
        refundAmount: metadata?.refundAmount,
      },
    })
  }
}

