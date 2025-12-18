/**
 * Zum Rails Transactions API Helper
 * Handles transaction creation, retrieval, listing, cancellation, and batch operations
 * Based on Zum Rails Transactions API: https://docs.zumrails.com/payments/bank-payments/eft
 */

// Export types (Canada - EFT/Interac only)
export type {
  ZumRailsFilterTransactionsRequest,
  ZumRailsFilterTransactionsResponse,
  ZumRailsValidateBatchRequest,
  ZumRailsValidateBatchResponse,
  ZumRailsProcessBatchRequest,
  ZumRailsProcessBatchResponse
} from '../types'

// Export transaction creation functions
export {
  createZumRailsTransaction,
  createCollectionTransaction,
  createDisbursementTransaction
} from './create'

// Export transaction retrieval functions
export {
  getZumRailsTransaction,
  filterZumRailsTransactions
} from './get'

// Export transaction cancellation function
export {
  cancelZumRailsTransaction
} from './cancel'

// Export batch transaction functions (Canada - EFT/Interac only)
export {
  validateBatchFile,
  processBatchFile,
  csvToBase64,
  createBatchTransactionsWithValidation,
  transactionsToCSV,
  type BatchTransactionInput
} from './batch'
