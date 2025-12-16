/**
 * Payment Status Transition Validator
 * 
 * Validates allowed status transitions according to business rules.
 */

import { PaymentStatus } from '../domain/PaymentStatus'

/**
 * Transition map defining allowed status transitions
 * Key: current status, Value: array of allowed next statuses
 */
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.SUCCEEDED]: [
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.FAILED]: [
    PaymentStatus.PROCESSING, // Retry
  ],
  [PaymentStatus.CANCELLED]: [], // Terminal state
  [PaymentStatus.REFUNDED]: [], // Terminal state
}

export interface TransitionValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate if a status transition is allowed
 * 
 * @param fromStatus - Current payment status
 * @param toStatus - Target payment status
 * @returns Validation result
 */
export function validateTransition(
  fromStatus: PaymentStatus,
  toStatus: PaymentStatus
): TransitionValidationResult {
  // Same status is always valid (no-op)
  if (fromStatus === toStatus) {
    return { isValid: true }
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[fromStatus]

  if (!allowedNextStatuses) {
    return {
      isValid: false,
      error: `Unknown source status: ${fromStatus}`,
    }
  }

  if (!allowedNextStatuses.includes(toStatus)) {
    return {
      isValid: false,
      error: `Invalid transition from ${fromStatus} to ${toStatus}. Allowed transitions: ${allowedNextStatuses.join(', ')}`,
    }
  }

  return { isValid: true }
}

/**
 * Get all allowed next statuses for a given current status
 * 
 * @param currentStatus - Current payment status
 * @returns Array of allowed next statuses
 */
export function getAllowedNextStatuses(
  currentStatus: PaymentStatus
): PaymentStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || []
}

