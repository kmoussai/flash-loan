/**
 * Payment Provider Abstract Interface
 * 
 * All payment providers must implement this interface.
 * This ensures a consistent API across different payment providers.
 * 
 * ⚠️ IMPORTANT: This file contains ONLY interface definitions.
 * No implementations should be added here.
 */

import type {
  PaymentProviderName,
  CustomerData,
  ProviderCustomer,
  TransactionData,
  ProviderTransaction,
  TransactionUpdate,
  CreateCustomerResult,
  GetCustomerResult,
  CreateTransactionResult,
  GetTransactionResult,
  AuthorizeTransactionResult,
  VoidTransactionResult,
  SyncTransactionsResult,
  PaymentProviderConfig,
  ProviderCapabilities,
  ProviderResult
} from './types'

/**
 * Abstract Payment Provider Interface
 * 
 * All payment providers must implement all methods defined here.
 * Provider-specific implementations will handle the details of
 * communicating with their respective APIs.
 */
export interface PaymentProvider {
  // ===========================
  // PROVIDER IDENTIFICATION
  // ===========================

  /**
   * Get the name/identifier of this payment provider
   * @returns Provider name (e.g., 'accept_pay')
   */
  getProviderName(): PaymentProviderName

  /**
   * Get provider capabilities and supported features
   * @returns Provider capabilities
   */
  getCapabilities(): ProviderCapabilities

  // ===========================
  // CUSTOMER MANAGEMENT
  // ===========================

  /**
   * Create a customer in the payment provider system
   * 
   * @param customerData - Customer information including personal details, address, and bank account
   * @returns Result containing provider customer ID and details
   */
  createCustomer(customerData: CustomerData): Promise<CreateCustomerResult>

  /**
   * Retrieve customer information from payment provider
   * 
   * @param customerId - Provider's customer ID
   * @returns Result containing customer details
   */
  getCustomer(customerId: string): Promise<GetCustomerResult>

  /**
   * Update customer information in payment provider
   * 
   * @param customerId - Provider's customer ID
   * @param updates - Partial customer data to update
   * @returns Result indicating success or failure
   */
  updateCustomer(
    customerId: string,
    updates: Partial<CustomerData>
  ): Promise<ProviderResult<ProviderCustomer>>

  /**
   * Suspend/deactivate a customer in payment provider
   * This typically voids any pending transactions
   * 
   * @param customerId - Provider's customer ID
   * @returns Result indicating success or failure
   */
  suspendCustomer(customerId: string): Promise<ProviderResult<void>>

  // ===========================
  // TRANSACTION MANAGEMENT
  // ===========================

  /**
   * Create a transaction in the payment provider system
   * 
   * @param transactionData - Transaction details including amount, date, type, etc.
   * @returns Result containing provider transaction ID and details
   */
  createTransaction(transactionData: TransactionData): Promise<CreateTransactionResult>

  /**
   * Retrieve transaction information from payment provider
   * 
   * @param transactionId - Provider's transaction ID
   * @returns Result containing transaction details and current status
   */
  getTransaction(transactionId: string): Promise<GetTransactionResult>

  /**
   * Get transaction status (convenience method)
   * 
   * @param transactionId - Provider's transaction ID
   * @returns Result containing current transaction status
   */
  getTransactionStatus(transactionId: string): Promise<ProviderResult<{
    status: string
    provider_status: string
    error_code?: string | null
    error_message?: string | null
  }>>

  /**
   * Authorize a transaction in the payment provider system
   * Some providers require explicit authorization before processing
   * 
   * @param transactionId - Provider's transaction ID
   * @returns Result indicating success or failure
   */
  authorizeTransaction(transactionId: string): Promise<AuthorizeTransactionResult>

  /**
   * Void/cancel a transaction in the payment provider system
   * 
   * @param transactionId - Provider's transaction ID
   * @param reason - Optional reason for voiding the transaction
   * @returns Result indicating success or failure
   */
  voidTransaction(transactionId: string, reason?: string): Promise<VoidTransactionResult>

  // ===========================
  // TRANSACTION SYNCHRONIZATION
  // ===========================

  /**
   * Sync transaction status updates from payment provider
   * Polls provider API for transactions that have changed since a given date
   * 
   * @param changedSince - Date to fetch updates from (ISO 8601 string or Date object)
   * @returns Result containing array of transaction updates
   */
  syncTransactions(changedSince: string | Date): Promise<SyncTransactionsResult>

  // ===========================
  // PROVIDER UTILITIES
  // ===========================

  /**
   * Get the minimum process date allowed by the provider
   * Different providers have different cut-off times and minimum advance notice
   * 
   * @returns Result containing minimum process date and cut-off time information
   */
  getMinProcessDate(): Promise<ProviderResult<{
    process_date: string  // YYYY-MM-DD format
    cut_off_time?: string  // HH:MM format (optional)
    timezone?: string  // Timezone for cut-off time (optional)
  }>>

  /**
   * Validate transaction data before submission
   * Provider-specific validation rules
   * 
   * @param transactionData - Transaction data to validate
   * @returns Result indicating if data is valid, with error details if invalid
   */
  validateTransactionData(transactionData: TransactionData): ProviderResult<void>

  /**
   * Validate customer data before submission
   * Provider-specific validation rules
   * 
   * @param customerData - Customer data to validate
   * @returns Result indicating if data is valid, with error details if invalid
   */
  validateCustomerData(customerData: CustomerData): ProviderResult<void>
}

