/**
 * Zum Rails Transactions API Helper
 * Handles transaction creation, retrieval, and listing
 * Based on Zum Rails Transactions API: https://docs.zumrails.com/payments/bank-payments/eft
 */

import { getZumrailsAuthToken } from '@/src/lib/ibv/zumrails-server'
import type {
  ZumRailsCreateTransactionRequest,
  ZumRailsCreateTransactionResponse,
  ZumRailsGetTransactionResponse,
  ZumRailsType,
  TransactionMethod,
  ZumRailsTransactionStatus
} from './types'

const ZUMRAILS_API_BASE_URL =
  process.env.ZUMRAILS_API_BASE_URL || 'https://api-sandbox.zumrails.com'

/**
 * Zum Rails API Response wrapper
 */
interface ZumRailsApiResponse<T> {
  statusCode: number
  message: string
  isError: boolean
  result?: T
}

/**
 * Filter transactions request
 */
export interface ZumRailsFilterTransactionsRequest {
  TransactionMethod?: TransactionMethod
  ZumRailsType?: ZumRailsType
  TransactionStatus?: ZumRailsTransactionStatus
  CreatedAtFrom?: string // YYYY-MM-DD format
  CreatedAtTo?: string // YYYY-MM-DD format
  UserId?: string
  WalletId?: string
  FundingSourceId?: string
  Pagination?: {
    PageNumber?: number
    ItemsPerPage?: number
  }
}

/**
 * Filter transactions response
 */
export interface ZumRailsFilterTransactionsResponse {
  statusCode: number
  message: string
  isError: boolean
  result?: {
    Transactions: Array<ZumRailsGetTransactionResponse['result']>
    TotalCount: number
    PageNumber: number
    ItemsPerPage: number
    TotalPages: number
  }
}

/**
 * Create a Zum Rails transaction
 * POST /api/transaction
 */
export async function createZumRailsTransaction(
  request: ZumRailsCreateTransactionRequest
): Promise<ZumRailsCreateTransactionResponse> {
  // Get authentication token
  const { token } = await getZumrailsAuthToken()

  const url = `${ZUMRAILS_API_BASE_URL}/api/transaction`

  console.log('[ZumRails] Creating transaction', {
    url,
    zumRailsType: request.ZumRailsType,
    transactionMethod: request.TransactionMethod,
    amount: request.Amount
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
    console.error('[ZumRails] Create transaction failed', {
      status: response.status,
      statusText: response.statusText,
      body: rawText
    })
    throw new Error(
      `ZumRails create transaction failed: ${rawText || response.statusText}`
    )
  }

  let apiResponse: ZumRailsCreateTransactionResponse
  try {
    apiResponse = rawText ? JSON.parse(rawText) : {}
  } catch (error) {
    console.error('[ZumRails] Failed to parse create transaction response', error)
    throw new Error('Failed to parse ZumRails create transaction response')
  }

  if (apiResponse.isError || !apiResponse.result) {
    console.error('[ZumRails] Create transaction returned error', apiResponse)
    throw new Error(
      apiResponse.message || 'ZumRails create transaction returned an error'
    )
  }

  console.log('[ZumRails] Transaction created successfully', {
    transactionId: apiResponse.result.Id,
    status: apiResponse.result.TransactionStatus
  })

  return apiResponse
}

/**
 * Get a Zum Rails transaction by ID
 * GET /api/transaction/{transactionId}
 */
export async function getZumRailsTransaction(
  transactionId: string
): Promise<ZumRailsGetTransactionResponse['result']> {
  // Get authentication token
  const { token } = await getZumrailsAuthToken()

  const url = `${ZUMRAILS_API_BASE_URL}/api/transaction/${transactionId}`

  console.log('[ZumRails] Fetching transaction', {
    url,
    transactionId
  })

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  const rawText = await response.text().catch(() => '')

  if (!response.ok) {
    console.error('[ZumRails] Get transaction failed', {
      status: response.status,
      statusText: response.statusText,
      body: rawText
    })
    throw new Error(
      `ZumRails get transaction failed: ${rawText || response.statusText}`
    )
  }

  let apiResponse: ZumRailsGetTransactionResponse
  try {
    apiResponse = rawText ? JSON.parse(rawText) : {}
  } catch (error) {
    console.error('[ZumRails] Failed to parse get transaction response', error)
    throw new Error('Failed to parse ZumRails get transaction response')
  }

  if (apiResponse.isError || !apiResponse.result) {
    console.error('[ZumRails] Get transaction returned error', apiResponse)
    throw new Error(
      apiResponse.message || 'ZumRails get transaction returned an error'
    )
  }

  console.log('[ZumRails] Transaction fetched successfully', {
    transactionId: apiResponse.result.Id,
    status: apiResponse.result.TransactionStatus
  })

  return apiResponse.result
}

/**
 * Filter/list Zum Rails transactions
 * POST /api/transaction/filter
 */
export async function filterZumRailsTransactions(
  filter: ZumRailsFilterTransactionsRequest
): Promise<ZumRailsFilterTransactionsResponse> {
  // Get authentication token
  const { token } = await getZumrailsAuthToken()

  const url = `${ZUMRAILS_API_BASE_URL}/api/transaction/filter`

  console.log('[ZumRails] Filtering transactions', {
    url,
    filter
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(filter)
  })

  const rawText = await response.text().catch(() => '')

  if (!response.ok) {
    console.error('[ZumRails] Filter transactions failed', {
      status: response.status,
      statusText: response.statusText,
      body: rawText
    })
    throw new Error(
      `ZumRails filter transactions failed: ${rawText || response.statusText}`
    )
  }

  let apiResponse: ZumRailsFilterTransactionsResponse
  try {
    apiResponse = rawText ? JSON.parse(rawText) : {}
  } catch (error) {
    console.error('[ZumRails] Failed to parse filter transactions response', error)
    throw new Error('Failed to parse ZumRails filter transactions response')
  }

  if (apiResponse.isError) {
    console.error('[ZumRails] Filter transactions returned error', apiResponse)
    throw new Error(
      apiResponse.message || 'ZumRails filter transactions returned an error'
    )
  }

  console.log('[ZumRails] Transactions filtered successfully', {
    totalCount: apiResponse.result?.TotalCount || 0,
    pageNumber: apiResponse.result?.PageNumber || 0
  })

  return apiResponse
}

/**
 * Helper: Create an AccountsReceivable transaction (collection from user)
 * This is used for collecting loan payments from borrowers
 */
export async function createCollectionTransaction(params: {
  userId: string
  walletId: string
  fundingSourceId?: string
  amount: number
  memo: string
  comment?: string
  scheduledStartDate?: string // YYYY-MM-DD format
  clientTransactionId?: string
}): Promise<ZumRailsCreateTransactionResponse> {
  return createZumRailsTransaction({
    ZumRailsType: 'AccountsReceivable',
    TransactionMethod: 'Eft',
    Amount: params.amount,
    Memo: params.memo,
    Comment: params.comment,
    UserId: params.userId,
    WalletId: params.walletId,
    FundingSourceId: params.fundingSourceId,
    ScheduledStartDate: params.scheduledStartDate,
    ClientTransactionId: params.clientTransactionId
  })
}

/**
 * Helper: Create an AccountsPayable transaction (disbursement to user)
 * This is used for sending loan disbursements to borrowers
 */
export async function createDisbursementTransaction(params: {
  userId: string
  walletId: string
  fundingSourceId: string
  amount: number
  memo: string
  comment?: string
  scheduledStartDate?: string // YYYY-MM-DD format
  clientTransactionId?: string
}): Promise<ZumRailsCreateTransactionResponse> {
  return createZumRailsTransaction({
    ZumRailsType: 'AccountsPayable',
    TransactionMethod: 'Eft',
    Amount: params.amount,
    Memo: params.memo,
    Comment: params.comment,
    UserId: params.userId,
    WalletId: params.walletId,
    FundingSourceId: params.fundingSourceId,
    ScheduledStartDate: params.scheduledStartDate,
    ClientTransactionId: params.clientTransactionId
  })
}

/**
 * Cancel a Zum Rails transaction
 * DELETE /api/transaction/{transactionId}
 * 
 * Note: ZumRails may not support cancellation for all transaction types/statuses.
 * This will attempt to cancel, but may fail if the transaction cannot be cancelled.
 */
export async function cancelZumRailsTransaction(
  transactionId: string
): Promise<{
  success: boolean
  message: string
  result?: any
  error?: string
}> {
  // Get authentication token
  const { token } = await getZumrailsAuthToken()

  const url = `${ZUMRAILS_API_BASE_URL}/api/transaction/${transactionId}`

  console.log('[ZumRails] Cancelling transaction', {
    url,
    transactionId
  })

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })

    const rawText = await response.text().catch(() => '')

    if (!response.ok) {
      // If transaction cannot be cancelled (e.g., already completed), that's OK
      // We'll still mark it as cancelled in our database
      console.warn('[ZumRails] Cancel transaction failed (may be expected)', {
        status: response.status,
        statusText: response.statusText,
        body: rawText,
        transactionId
      })
      
      return {
        success: false,
        message: `ZumRails API returned ${response.status}: ${rawText || response.statusText}`,
        error: rawText || response.statusText
      }
    }

    let apiResponse: any
    try {
      apiResponse = rawText ? JSON.parse(rawText) : {}
    } catch (error) {
      console.error('[ZumRails] Failed to parse cancel transaction response', error)
      return {
        success: false,
        message: 'Failed to parse ZumRails cancel transaction response',
        error: 'Parse error'
      }
    }

    if (apiResponse.isError) {
      console.warn('[ZumRails] Cancel transaction returned error', apiResponse)
      return {
        success: false,
        message: apiResponse.message || 'ZumRails cancel transaction returned an error',
        error: apiResponse.message
      }
    }

    console.log('[ZumRails] Transaction cancelled successfully', {
      transactionId
    })

    return {
      success: true,
      message: 'Transaction cancelled successfully',
      result: apiResponse.result
    }
  } catch (error: any) {
    console.error('[ZumRails] Error cancelling transaction', {
      transactionId,
      error: error.message || error
    })
    return {
      success: false,
      message: `Failed to cancel transaction: ${error.message || String(error)}`,
      error: error.message || String(error)
    }
  }
}

