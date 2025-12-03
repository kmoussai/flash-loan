/**
 * Payment Provider System
 * 
 * Abstract payment provider interface and types.
 * All payment providers must implement the PaymentProvider interface.
 */

export type {
  // Provider identifiers
  PaymentProviderName,
  
  // Customer types
  BankAccountInfo,
  CustomerAddress,
  CustomerData,
  ProviderCustomer,
  
  // Transaction types
  TransactionType,
  TransactionDirection,
  TransactionData,
  TransactionStatus,
  ProviderTransaction,
  TransactionUpdate,
  
  // Result types
  ProviderResult,
  CreateCustomerResult,
  GetCustomerResult,
  CreateTransactionResult,
  GetTransactionResult,
  AuthorizeTransactionResult,
  VoidTransactionResult,
  SyncTransactionsResult,
  
  // Configuration
  PaymentProviderConfig,
  ProviderCapabilities
} from './types'

export type { PaymentProvider } from './interfaces'

// Export provider implementations
export { AcceptPayProvider, getAcceptPayProvider } from './accept-pay'

