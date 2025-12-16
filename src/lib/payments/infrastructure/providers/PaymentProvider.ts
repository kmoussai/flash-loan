/**
 * Payment Provider Interface
 * 
 * Defines the contract for payment providers (ZumRails, AcceptPay, etc.)
 * Providers are responsible for:
 * - Creating transactions with external payment services
 * - Cancelling scheduled transactions
 * - Refunding transactions
 * - Syncing transaction status
 * 
 * No business logic should be in providers - they are pure adapters.
 */

import { PaymentStatus } from '../../domain/PaymentStatus'

export interface CreateTransactionParams {
  amount: number
  loanId: string
  paymentId: string
  scheduledDate?: Date
  metadata?: Record<string, unknown>
}

export interface CreateTransactionResult {
  success: boolean
  providerTransactionId?: string
  providerData?: Record<string, unknown>
  error?: string
  errorCode?: string
}

export interface CancelTransactionParams {
  providerTransactionId: string
  reason?: string
}

export interface CancelTransactionResult {
  success: boolean
  error?: string
  errorCode?: string
}

export interface RefundTransactionParams {
  providerTransactionId: string
  amount: number
  reason?: string
}

export interface RefundTransactionResult {
  success: boolean
  providerTransactionId?: string
  providerData?: Record<string, unknown>
  error?: string
  errorCode?: string
}

export interface SyncTransactionParams {
  providerTransactionId: string
}

export interface SyncTransactionResult {
  success: boolean
  status?: PaymentStatus
  providerStatus?: string
  providerData?: Record<string, unknown>
  error?: string
  errorCode?: string
}

/**
 * Payment Provider Interface
 * 
 * All payment providers must implement this interface.
 */
export interface PaymentProvider {
  /**
   * Get the provider name (e.g., 'zumrails', 'acceptpay')
   */
  getProviderName(): string

  /**
   * Create a transaction with the payment provider
   * 
   * @param params - Transaction creation parameters
   * @returns Result with provider transaction ID or error
   */
  createTransaction(
    params: CreateTransactionParams
  ): Promise<CreateTransactionResult>

  /**
   * Cancel a scheduled transaction
   * 
   * @param params - Cancellation parameters
   * @returns Result indicating success or failure
   */
  cancelTransaction(
    params: CancelTransactionParams
  ): Promise<CancelTransactionResult>

  /**
   * Refund a completed transaction
   * 
   * @param params - Refund parameters
   * @returns Result with refund transaction ID or error
   */
  refundTransaction(
    params: RefundTransactionParams
  ): Promise<RefundTransactionResult>

  /**
   * Sync transaction status from provider
   * 
   * @param params - Sync parameters
   * @returns Result with current status or error
   */
  syncTransaction(
    params: SyncTransactionParams
  ): Promise<SyncTransactionResult>

  /**
   * Map provider-specific status to internal PaymentStatus
   * 
   * @param providerStatus - Provider status string
   * @returns Internal PaymentStatus or null if unknown
   */
  mapProviderStatus(providerStatus: string): PaymentStatus | null
}

