/**
 * Zum Rails Batch Transaction Functions
 * Handles batch file validation, processing, and upload
 */

import { getZumrailsAuthToken } from '@/src/lib/ibv/zumrails-server'
import type {
  ZumRailsValidateBatchRequest,
  ZumRailsValidateBatchResponse,
  ZumRailsProcessBatchRequest,
  ZumRailsProcessBatchResponse
} from '../types'
import { ZUMRAILS_API_BASE_URL } from './config'

/**
 * Validate a batch file before processing (Canada - EFT/Interac)
 * POST /api/transaction/ValidateBatchFile
 * 
 * This should be called before ProcessBatchFile to catch errors early.
 * For EFT batches, if any transaction is invalid, the entire file is rejected.
 */
export async function validateBatchFile(
  request: ZumRailsValidateBatchRequest
): Promise<ZumRailsValidateBatchResponse> {
  const { token } = await getZumrailsAuthToken()
  const url = `${ZUMRAILS_API_BASE_URL}/api/transaction/ValidateBatchFile`

  console.log('[ZumRails] Validating batch file', {
    url,
    transactionType: request.TransactionType,
    hasWalletId: !!request.WalletId,
    hasFundingSourceId: !!request.FundingSourceId
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(request)
  })

  const rawText = await response.text().catch(() => '')

  if (!response.ok) {
    console.error('[ZumRails] Validate batch file failed', {
      status: response.status,
      statusText: response.statusText,
      body: rawText
    })
    throw new Error(
      `ZumRails validate batch file failed: ${rawText || response.statusText}`
    )
  }

  let apiResponse: ZumRailsValidateBatchResponse
  try {
    apiResponse = rawText ? JSON.parse(rawText) : {}
  } catch (error) {
    console.error('[ZumRails] Failed to parse validate batch response', error)
    throw new Error('Failed to parse ZumRails validate batch response')
  }

  if (apiResponse.isError) {
    console.error('[ZumRails] Validate batch returned error', apiResponse)
    throw new Error(
      apiResponse.message || 'ZumRails validate batch returned an error'
    )
  }

  console.log('[ZumRails] Batch file validation result', {
    validTransactions: apiResponse.result?.ValidTransactions || 0,
    invalidTransactions: apiResponse.result?.InvalidTransactions || '0',
    status: apiResponse.result?.Status,
    totalAmount: apiResponse.result?.TotalAmount,
    transactionCount: apiResponse.result?.Transactions?.length || 0,
    invalidTransactionDetails: apiResponse.result?.Transactions?.filter(t => t.Status !== 'Ok') || []
  })

  // Log detailed validation errors if any
  if (apiResponse.result?.Status !== 'Ok' || apiResponse.result?.InvalidTransactions !== '0') {
    console.error('[ZumRails] Batch validation failed or has errors', {
      status: apiResponse.result?.Status,
      invalidCount: apiResponse.result?.InvalidTransactions,
      invalidTransactions: apiResponse.result?.Transactions?.filter(t => t.Status !== 'Ok').map(t => ({
        firstName: t.FirstName,
        lastName: t.LastName,
        accountNumber: t.AccountNumber,
        status: t.Status,
        amount: t.Amount
      }))
    })
  }

  return apiResponse
}

/**
 * Process a batch file (Canada - EFT/Interac)
 * POST /api/transaction/ProcessBatchFile
 * 
 * NOTE: For EFT batches, if any transaction is invalid, the entire file is rejected.
 * Always call validateBatchFile first to catch errors early.
 * 
 * Transactions created via batch can be cancelled individually using cancelZumRailsTransaction.
 */
export async function processBatchFile(
  request: ZumRailsProcessBatchRequest
): Promise<ZumRailsProcessBatchResponse> {
  const { token } = await getZumrailsAuthToken()
  const url = `${ZUMRAILS_API_BASE_URL}/api/transaction/ProcessBatchFile`

  console.log('[ZumRails] Processing batch file', {
    url,
    fileName: request.FileName,
    transactionType: request.TransactionType,
    transactionMethod: request.TransactionMethod
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(request)
  })

  const rawText = await response.text().catch(() => '')

  if (!response.ok) {
    console.error('[ZumRails] Process batch file failed', {
      status: response.status,
      statusText: response.statusText,
      body: rawText
    })
    throw new Error(
      `ZumRails process batch file failed: ${rawText || response.statusText}`
    )
  }

  let apiResponse: ZumRailsProcessBatchResponse
  try {
    apiResponse = rawText ? JSON.parse(rawText) : {}
  } catch (error) {
    console.error('[ZumRails] Failed to parse process batch response', error)
    throw new Error('Failed to parse ZumRails process batch response')
  }

  if (apiResponse.isError) {
    console.error('[ZumRails] Process batch returned error', apiResponse)
    throw new Error(
      apiResponse.message || 'ZumRails process batch returned an error'
    )
  }

  console.log('[ZumRails] Batch file processed successfully', {
    batchId: apiResponse.result
  })

  return apiResponse
}

/**
 * Transaction data structure for batch CSV generation
 */
export interface BatchTransactionInput {
  /** First name (required) */
  firstName: string
  /** Last name (required) */
  lastName: string
  /** Business name (optional) */
  businessName?: string
  /** Institution number (required) - 3 digits for Canadian banks */
  institutionNumber: string
  /** Branch/Transit number (required) - 5 digits for Canadian banks */
  branchNumber: string
  /** Account number (required) */
  accountNumber: string
  /** Amount in cents (required) - e.g., 10000 for $100.00 */
  amountInCents: number
  /** Transaction comment (optional) */
  transactionComment?: string
  /** Memo (required) */
  memo: string
  /** Scheduled date in YYYY-MM-DD format (optional) */
  scheduledDate?: string
  /** Email ID (optional) */
  emailId?: string
  /** Client user ID (optional) */
  clientUserId?: string
}

/**
 * Helper: Convert a list of transactions to ZumRails batch CSV format
 * 
 * CSV format: semicolon-separated with the following columns:
 * first_name_required;last_name_required;business_name;institution_number_required;branch_number_required;account_number_required;amount_in_cents_required;transaction_comment;memo_required;scheduled_date;email_id;client_user_id
 * 
 * @param transactions - Array of transaction objects
 * @params separator - Separator for the CSV file (default: ';')
 * @returns CSV string with header and transaction rows
 * 
 * @example
 * ```typescript
 * const transactions = [
 *   {
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     institutionNumber: '123',
 *     branchNumber: '12345',
 *     accountNumber: '1234567',
 *     amountInCents: 10000,
 *     memo: 'Payment for loan #123'
 *   }
 * ]
 * const csv = transactionsToCSV(transactions)
 * ```
 */
export function transactionsToCSV(transactions: BatchTransactionInput[], separator: string = ';'): string {
  // CSV header row
  const header = [
    'first_name_required',
    'last_name_required',
    'business_name',
    'institution_number_required',
    'branch_number_required',
    'account_number_required',
    'amount_in_cents_required',
    'transaction_comment',
    'memo_required',
    'scheduled_date',
    'email_id',
    'client_user_id'
  ]

  // Convert transactions to CSV rows
  const rows = transactions.map(transaction => {
    return [
      transaction.firstName || '',
      transaction.lastName || '',
      transaction.businessName || '',
      transaction.institutionNumber || '',
      transaction.branchNumber || '',
      transaction.accountNumber || '',
      String(transaction.amountInCents || 0),
      transaction.transactionComment || '',
      transaction.memo || '',
      transaction.scheduledDate || '',
      transaction.emailId || '',
      transaction.clientUserId || ''
    ]
  })

  // Combine header and rows, join with semicolons
  const allRows = [header, ...rows]
  return allRows.map(row => row.join(separator)).join('\n')
}

/**
 * Helper: Convert CSV string to base64 encoded bytes
 * ZumRails batch APIs require the CSV file as base64 encoded bytes
 */
export function csvToBase64(csvContent: string): string {
  // Convert string to Buffer, then to base64
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(csvContent, 'utf-8').toString('base64')
  } else {
    // Browser environment (fallback)
    return btoa(unescape(encodeURIComponent(csvContent)))
  }
}

/**
 * Helper: Create and process batch transactions with validation (Canada)
 * 
 * This helper:
 * 1. Validates the batch file first
 * 2. Processes the batch if validation passes
 * 3. Returns both validation and processing results
 * 
 * @param csvContent - CSV file content as string
 * @param options - Batch processing options
 * @returns Combined validation and processing results
 */
export async function createBatchTransactionsWithValidation(
  csvContent: string,
  options: {
    fileName: string
    transactionType: 'AccountsReceivable' | 'AccountsPayable'
    transactionMethod: 'Eft' | 'Interac'
    walletId?: string
    fundingSourceId?: string
    skipFileAlreadyProcessedInLast24Hours?: boolean
    withdrawSumTotalFromFundingSource?: boolean
  }
): Promise<{
  validation: ZumRailsValidateBatchResponse
  processing: ZumRailsProcessBatchResponse | null
  success: boolean
  error?: string
}> {
  const bytes = csvToBase64(csvContent)

  // Step 1: Validate batch file
  const validation = await validateBatchFile({
    TransactionType: options.transactionType,
    WalletId: options.walletId,
    FundingSourceId: options.fundingSourceId,
    Bytes: bytes
  })

  // Check validation status
  if (validation.result?.Status !== 'Ok') {
    return {
      validation,
      processing: null,
      success: false,
      error: `Batch validation failed: ${validation.result?.Status}`
    }
  }

  // Check if there are invalid transactions
  const invalidCount = parseInt(validation.result?.InvalidTransactions || '0', 10)
  if (invalidCount > 0) {
    return {
      validation,
      processing: null,
      success: false,
      error: `Batch contains ${invalidCount} invalid transaction(s). See validation result for details.`
    }
  }

  // Step 2: Process batch file if validation passes
  try {
    const processing = await processBatchFile({
      FileName: options.fileName,
      SkipFileAlreadyProcessedInLast24Hours: options.skipFileAlreadyProcessedInLast24Hours ?? true,
      WithdrawSumTotalFromFundingSource: options.withdrawSumTotalFromFundingSource ?? false,
      Bytes: bytes,
      FundingSourceId: options.fundingSourceId,
      WalletId: options.walletId,
      TransactionType: options.transactionType,
      TransactionMethod: options.transactionMethod
    })

    return {
      validation,
      processing,
      success: true
    }
  } catch (error: any) {
    return {
      validation,
      processing: null,
      success: false,
      error: error.message || String(error)
    }
  }
}
