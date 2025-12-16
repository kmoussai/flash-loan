/**
 * Payment Failed Handler
 * 
 * Handles side effects when a payment fails:
 * - Update loan status (if needed)
 * - Send failure notification email
 * - Log failure for retry
 * 
 * Assumes idempotent execution.
 */

import { PaymentFailedEvent } from '../../domain/PaymentEvents'

export interface OnPaymentFailedDependencies {
  updateLoanStatus?: (loanId: string, status: string) => Promise<void>
  sendEmail?: (to: string, subject: string, body: string) => Promise<void>
  logFailure?: (paymentId: string, errorCode: string, errorMessage: string) => Promise<void>
  getLoanDetails?: (loanId: string) => Promise<{ userId: string; email: string } | null>
}

export class OnPaymentFailed {
  constructor(private deps: OnPaymentFailedDependencies = {}) {}

  async handle(event: PaymentFailedEvent): Promise<void> {
    const {
      paymentId,
      loanId,
      amount,
      errorCode,
      errorMessage,
    } = event

    try {
      // 1. Log failure for retry/analysis
      if (this.deps.logFailure) {
        await this.deps.logFailure(
          paymentId,
          errorCode || 'UNKNOWN',
          errorMessage || 'Payment failed'
        )
      }

      // 2. Get loan details for email
      let userEmail: string | undefined
      if (this.deps.sendEmail && this.deps.getLoanDetails) {
        const loanDetails = await this.deps.getLoanDetails(loanId)
        userEmail = loanDetails?.email
      }

      // 3. Send failure notification email
      if (this.deps.sendEmail && userEmail) {
        const errorDetails = errorMessage || 'Unknown error'
        await this.deps.sendEmail(
          userEmail,
          'Payment Failed',
          `Your payment of $${amount.toFixed(2)} could not be processed. Reason: ${errorDetails}. Please update your payment method and try again.`
        )
      }

      // 4. Update loan status if needed (e.g., mark as past due)
      if (this.deps.updateLoanStatus) {
        // Only update if this is a critical failure
        // Adjust logic based on your business rules
        if (errorCode === 'INSUFFICIENT_FUNDS' || errorCode === 'ACCOUNT_CLOSED') {
          // Don't update here - let loan service handle this
          // This is just an example
        }
      }
    } catch (error) {
      // Log error but don't throw - side effects should not break payment flow
      console.error(`Error handling PaymentFailed event for payment ${paymentId}:`, error)
    }
  }
}

