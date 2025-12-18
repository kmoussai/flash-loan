/**
 * Zum Rails Transaction Cancellation Functions
 */

import { getZumrailsAuthToken } from '@/src/lib/ibv/zumrails-server'
import { ZUMRAILS_API_BASE_URL } from './config'

/**
 * Cancel a Zum Rails transaction
 * DELETE /api/transaction/{transactionId}
 * 
 * Note: ZumRails may not support cancellation for all transaction types/statuses.
 * This will attempt to cancel, but may fail if the transaction cannot be cancelled.
 * 
 * IMPORTANT: Transactions created via batch can be cancelled individually using this function.
 * Each transaction in a batch gets its own transaction ID, so you can cancel them one by one.
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
