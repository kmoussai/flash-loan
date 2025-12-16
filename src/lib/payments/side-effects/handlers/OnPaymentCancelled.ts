/**
 * Payment Cancelled Handler
 * 
 * Handles side effects when a payment is cancelled:
 * - Send cancellation notification email
 * - Update loan schedule if needed
 * - Update accounting ledger
 * 
 * NOTE: Provider transaction cancellation is handled by PaymentService,
 * not by this handler. This handler only deals with business side effects.
 * 
 * Assumes idempotent execution.
 */

import { PaymentCancelledEvent } from '../../domain/PaymentEvents'

export interface OnPaymentCancelledDependencies {
  sendEmail?: (to: string, subject: string, body: string) => Promise<void>
  updateLoanSchedule?: (loanId: string) => Promise<void>
  updateLedger?: (loanId: string, paymentId: string, amount: number, reason?: string) => Promise<void>
  getLoanDetails?: (loanId: string) => Promise<{ userId: string; email: string } | null>
}

export class OnPaymentCancelled {
  constructor(private deps: OnPaymentCancelledDependencies = {}) {}

  async handle(event: PaymentCancelledEvent): Promise<void> {
    const { paymentId, loanId, amount, reason } = event

    try {
      // 1. Get loan details for email
      let userEmail: string | undefined
      if (this.deps.sendEmail && this.deps.getLoanDetails) {
        const loanDetails = await this.deps.getLoanDetails(loanId)
        userEmail = loanDetails?.email
      }

      // 2. Send cancellation notification email
      if (this.deps.sendEmail && userEmail) {
        await this.deps.sendEmail(
          userEmail,
          'Payment Cancelled',
          `Your scheduled payment of $${amount.toFixed(2)} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`
        )
      }

      // 3. Update loan schedule if needed
      if (this.deps.updateLoanSchedule) {
        await this.deps.updateLoanSchedule(loanId)
      }

      // 4. Update accounting ledger
      if (this.deps.updateLedger) {
        await this.deps.updateLedger(loanId, paymentId, amount, reason)
      }
    } catch (error) {
      // Log error but don't throw - side effects should not break payment flow
      console.error(`Error handling PaymentCancelled event for payment ${paymentId}:`, error)
    }
  }
}

