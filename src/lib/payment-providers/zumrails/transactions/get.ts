/**
 * Zum Rails Transaction Retrieval Functions
 * Handles getting and filtering transactions
 */

import { getZumrailsAuthToken } from '@/src/lib/ibv/zumrails-server'
import type {
  ZumRailsGetTransactionResponse,
  ZumRailsFilterTransactionsRequest,
  ZumRailsFilterTransactionsResponse
} from '../types'
import { ZUMRAILS_API_BASE_URL } from './config'

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
