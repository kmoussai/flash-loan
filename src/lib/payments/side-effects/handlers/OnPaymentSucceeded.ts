/**
 * Payment Succeeded Handler
 * 
 * Handles side effects when a payment succeeds:
 * - Update loan balance/status
 * - Send confirmation email
 * - Update accounting ledger
 * 
 * Assumes idempotent execution.
 */

import { PaymentSucceededEvent } from '../../domain/PaymentEvents'

export interface OnPaymentSucceededDependencies {
  updateLoanBalance?: (loanId: string, amount: number) => Promise<void>
  sendEmail?: (to: string, subject: string, body: string) => Promise<void>
  updateLedger?: (loanId: string, paymentId: string, amount: number) => Promise<void>
  getLoanDetails?: (loanId: string) => Promise<{ userId: string; email: string } | null>
}

export class OnPaymentSucceeded {
  constructor(private deps: OnPaymentSucceededDependencies = {}) {}

  async handle(event: PaymentSucceededEvent): Promise<void> {
    const { paymentId, loanId, amount } = event

    try {
      // 1. Update loan balance
      if (this.deps.updateLoanBalance) {
        await this.deps.updateLoanBalance(loanId, amount)
      }

      // 2. Get loan details for email
      let userEmail: string | undefined
      if (this.deps.sendEmail && this.deps.getLoanDetails) {
        const loanDetails = await this.deps.getLoanDetails(loanId)
        userEmail = loanDetails?.email
      }

      // 3. Send confirmation email
      if (this.deps.sendEmail && userEmail) {
        await this.deps.sendEmail(
          userEmail,
          'Payment Received',
          `Your payment of $${amount.toFixed(2)} has been successfully processed.`
        )
      }

      // 4. Update accounting ledger
      if (this.deps.updateLedger) {
        await this.deps.updateLedger(loanId, paymentId, amount)
      }
    } catch (error) {
      // Log error but don't throw - side effects should not break payment flow
      console.error(`Error handling PaymentSucceeded event for payment ${paymentId}:`, error)
      // In production, you might want to:
      // - Send to error tracking service
      // - Queue for retry
      // - Store in dead letter queue
    }
  }
}

