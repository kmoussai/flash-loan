/**
 * Zum Rails Transaction Creation Functions
 * Handles creating individual transactions
 */

import { getZumrailsAuthToken } from '@/src/lib/ibv/zumrails-server'
import type {
  ZumRailsCreateTransactionRequest,
  ZumRailsCreateTransactionResponse
} from '../types'
import { getZumRailsApiBaseUrl } from './config'

/**
 * Create a Zum Rails transaction
 * POST /api/transaction
 * 
 * @param request - Transaction request data
 * @param idempotencyKey - Optional idempotency key (max 36 chars, UUID recommended)
 *                        If provided, ZumRails will prevent duplicate transactions within 1 hour
 *                        See: https://docs.zumrails.com/api-reference/idempotency
 */
export async function createZumRailsTransaction(
  request: ZumRailsCreateTransactionRequest,
  idempotencyKey?: string
): Promise<ZumRailsCreateTransactionResponse> {
  // Get authentication token
  const { token } = await getZumrailsAuthToken()

  const baseUrl = await getZumRailsApiBaseUrl()
  const url = `${baseUrl}/api/transaction`

  console.log('[ZumRails] Creating transaction', {
    url,
    zumRailsType: request.ZumRailsType,
    transactionMethod: request.TransactionMethod,
    amount: request.Amount,
    idempotencyKey: idempotencyKey || 'not provided'
  })

  // Build headers with optional idempotency key
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }

  // Add idempotency key if provided (max 36 characters as per ZumRails docs)
  if (idempotencyKey) {
    const trimmedKey = idempotencyKey.substring(0, 36)
    headers['idempotency-key'] = trimmedKey
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
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
 * Helper: Create an AccountsReceivable transaction (collection from user)
 * This is used for collecting loan payments from borrowers
 * 
 * @param params - Transaction parameters
 * @param params.idempotencyKey - Optional idempotency key for duplicate prevention
 *                                If not provided, will use clientTransactionId if available
 */
export async function createCollectionTransaction(params: {
  userId: string
  walletId?: string
  fundingSourceId?: string
  amount: number
  memo: string
  comment?: string
  scheduledStartDate?: string // YYYY-MM-DD format
  clientTransactionId?: string
  idempotencyKey?: string
}): Promise<ZumRailsCreateTransactionResponse> {
  // Use provided idempotency key, or fall back to clientTransactionId if available
  // This ensures retries for the same payment use the same idempotency key
  const idempotencyKey = params.idempotencyKey || params.clientTransactionId

  return createZumRailsTransaction(
    {
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
    },
    idempotencyKey
  )
}

/**
 * Helper: Create an AccountsPayable transaction (disbursement to user)
 * This is used for sending loan disbursements to borrowers
 * 
 * @param params - Transaction parameters
 * @param params.idempotencyKey - Optional idempotency key for duplicate prevention
 *                                If not provided, will use clientTransactionId if available
 */
export async function createDisbursementTransaction(params: {
  userId: string
  walletId?: string
  fundingSourceId?: string
  amount: number
  memo: string
  comment?: string
  scheduledStartDate?: string // YYYY-MM-DD format
  clientTransactionId?: string
  idempotencyKey?: string
}): Promise<ZumRailsCreateTransactionResponse> {
  // Use provided idempotency key, or fall back to clientTransactionId if available
  const idempotencyKey = params.idempotencyKey || params.clientTransactionId

  return createZumRailsTransaction(
    {
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
    },
    idempotencyKey
  )
}
