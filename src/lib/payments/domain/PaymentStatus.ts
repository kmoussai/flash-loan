/**
 * Payment Status Enum
 * 
 * Defines all allowed payment statuses in the system.
 * Status transitions are validated via TransitionPayment.
 */

export enum PaymentStatus {
  CREATED = 'created',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Type guard to check if a string is a valid PaymentStatus
 */
export function isPaymentStatus(value: string): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus)
}

