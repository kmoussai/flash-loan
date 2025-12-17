/**
 * Zum Rails Transaction Creation Functions
 * Handles creating individual transactions
 */

import { getZumrailsAuthToken } from '@/src/lib/ibv/zumrails-server'
import type {
  ZumRailsCreateTransactionRequest,
  ZumRailsCreateTransactionResponse
} from '../types'
import { ZUMRAILS_API_BASE_URL } from './config'

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
 * Helper: Create an AccountsReceivable transaction (collection from user)
 * This is used for collecting loan payments from borrowers
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
  walletId?: string
  fundingSourceId?: string
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
