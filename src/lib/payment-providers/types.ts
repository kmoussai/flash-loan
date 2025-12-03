/**
 * Payment Provider Abstract Interface Types
 * 
 * Common types and interfaces for all payment providers.
 * Provider-specific implementations will extend these base types.
 */

// ===========================
// PROVIDER IDENTIFIERS
// ===========================

/**
 * Supported payment providers
 */
export type PaymentProviderName = 'accept_pay' | string

// ===========================
// CUSTOMER TYPES
// ===========================

/**
 * Bank account information (provider-agnostic)
 */
export interface BankAccountInfo {
  institution_number?: string  // For Canadian EFT
  transit_number?: string     // For Canadian EFT
  account_number: string
  routing_number?: string     // For ACH (US)
  account_type?: string       // 'checking', 'savings', etc.
  account_holder?: string
  account_name?: string
}

/**
 * Address information for customer
 */
export interface CustomerAddress {
  street_number?: string | null
  street_name?: string | null
  apartment_number?: string | null
  city: string
  province?: string  // State/Province
  postal_code: string
  country: string
}

/**
 * Customer data required to create a customer in payment provider
 */
export interface CustomerData {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: CustomerAddress
  bank_account: BankAccountInfo
  date_of_birth?: string
  // Additional provider-specific fields can be added via metadata
  metadata?: Record<string, unknown>
}

/**
 * Customer information returned from payment provider
 */
export interface ProviderCustomer {
  id: string  // Provider's customer ID (can be string or number, stored as string)
  status: string  // Provider-specific status (e.g., 'active', 'suspended')
  created_at?: string
  updated_at?: string
  // Provider-specific data stored in raw response
  raw_data: Record<string, unknown>
}

// ===========================
// TRANSACTION TYPES
// ===========================

/**
 * Transaction type (disbursement or collection)
 */
export type TransactionType = 'disbursement' | 'collection'

/**
 * Transaction direction from provider perspective
 */
export type TransactionDirection = 'debit' | 'credit'

/**
 * Transaction data required to create a transaction
 */
export interface TransactionData {
  customer_id: string  // Provider's customer ID
  amount: number
  process_date: string  // YYYY-MM-DD format
  transaction_type: TransactionType
  direction: TransactionDirection  // 'credit' for disbursement, 'debit' for collection
  memo?: string
  reference?: string
  schedule?: number | string  // Recurring schedule ID (provider-specific)
  // Additional provider-specific fields
  metadata?: Record<string, unknown>
}

/**
 * Transaction status (normalized across providers)
 */
export type TransactionStatus =
  | 'initiated'      // Transaction created but not yet sent
  | 'authorized'     // Transaction authorized but not processed
  | 'pending'        // Transaction sent to bank, awaiting response
  | 'processing'     // Transaction being processed
  | 'completed'      // Transaction successfully completed
  | 'failed'         // Transaction failed
  | 'cancelled'      // Transaction cancelled/voided
  | 'reversed'       // Transaction reversed

/**
 * Transaction information returned from payment provider
 */
export interface ProviderTransaction {
  id: string  // Provider's transaction ID
  customer_id: string
  amount: number
  process_date: string
  status: TransactionStatus
  provider_status: string  // Provider's native status code/string
  direction: TransactionDirection
  error_code?: string | null
  error_message?: string | null
  authorized_at?: string | null
  completed_at?: string | null
  // Provider-specific data stored in raw response
  raw_data: Record<string, unknown>
}

/**
 * Transaction update from provider (used in sync operations)
 */
export interface TransactionUpdate {
  transaction_id: string  // Provider's transaction ID
  status: TransactionStatus
  provider_status: string
  error_code?: string | null
  error_message?: string | null
  updated_at: string
  // Provider-specific update data
  raw_data: Record<string, unknown>
}

// ===========================
// RESULT TYPES
// ===========================

/**
 * Standard result type for provider operations
 */
export interface ProviderResult<T> {
  success: boolean
  data?: T
  error?: string
  error_code?: string
  error_details?: Record<string, unknown>
}

/**
 * Result for customer creation
 */
export type CreateCustomerResult = ProviderResult<ProviderCustomer>

/**
 * Result for customer retrieval
 */
export type GetCustomerResult = ProviderResult<ProviderCustomer>

/**
 * Result for transaction creation
 */
export type CreateTransactionResult = ProviderResult<ProviderTransaction>

/**
 * Result for transaction retrieval
 */
export type GetTransactionResult = ProviderResult<ProviderTransaction>

/**
 * Result for transaction authorization
 */
export type AuthorizeTransactionResult = ProviderResult<void>

/**
 * Result for transaction void
 */
export type VoidTransactionResult = ProviderResult<void>

/**
 * Result for transaction sync
 */
export type SyncTransactionsResult = ProviderResult<TransactionUpdate[]>

// ===========================
// PROVIDER CONFIGURATION
// ===========================

/**
 * Base configuration for payment providers
 */
export interface PaymentProviderConfig {
  provider_name: PaymentProviderName
  environment?: 'development' | 'staging' | 'production'
  enabled: boolean
  // Provider-specific configuration stored here
  credentials?: Record<string, unknown>
  settings?: Record<string, unknown>
}

// ===========================
// PROVIDER CAPABILITIES
// ===========================

/**
 * Provider capabilities/features
 */
export interface ProviderCapabilities {
  supports_recurring: boolean
  supports_authorization: boolean
  supports_void: boolean
  supports_sync: boolean
  min_process_days: number  // Minimum days in advance for process_date
  max_amount?: number
  min_amount?: number
  supported_currencies: string[]
  supported_countries: string[]
}

