/**
 * Test endpoint for batch transaction creation
 * GET /api/test/zumrails/batch-transaction
 * 
 * Query parameters:
 * - transactionType: 'AccountsReceivable' | 'AccountsPayable' (default: 'AccountsReceivable')
 * - transactionMethod: 'Eft' | 'Interac' (default: 'Eft')
 * - walletId: Optional wallet ID
 * - fundingSourceId: Optional funding source ID
 * - skipFileAlreadyProcessed: boolean (default: true)
 * - withdrawSumTotal: boolean (default: false)
 * - testMode: 'validation-only' | 'full' (default: 'full')
 *   - 'validation-only': Only validates, doesn't process
 *   - 'full': Validates and processes
 * 
 * Example:
 * GET /api/test/zumrails/batch-transaction?transactionType=AccountsReceivable&walletId=xxx&fundingSourceId=yyy
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createBatchTransactionsWithValidation,
  validateBatchFile,
  csvToBase64,
  transactionsToCSV,
  type BatchTransactionInput
} from '@/src/lib/payment-providers/zumrails/transactions'

/**
 * Generate sample CSV content for testing
 * Format based on ZumRails batch file requirements
 */
function generateSampleCSV(): string {
  // Sample transactions using the helper function
  const transactions: BatchTransactionInput[] = [
    {
      firstName: 'khalid',
      lastName: 'mossaid',
      institutionNumber: '123',
      branchNumber: '12345',
      accountNumber: '1234567',
      amountInCents: 8800, // $88.00
      transactionComment: 'Internal Message',
      memo: 'Memo message',
      scheduledDate: '2025-12-15'
    }
  ]

  return transactionsToCSV(transactions)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Get query parameters
    const transactionType = 'AccountsReceivable'
    const transactionMethod = 'Eft'
    const walletId = process.env.ZUMRAILS_WALLET_ID
    const skipFileAlreadyProcessed = searchParams.get('skipFileAlreadyProcessed') !== 'false'

    // Validate required parameters
    if (!walletId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          message: 'ZUMRAILS_WALLET_ID environment variable must be set',
          usage: {
            queryParameters: {
              skipFileAlreadyProcessed: 'boolean (default: true)'
            },
            example: '/api/test/zumrails/batch-transaction?skipFileAlreadyProcessed=false'
          }
        },
        { status: 400 }
      )
    }

    // Generate sample CSV
    const csvContent = generateSampleCSV()
    const fileName = `test-batch-${Date.now()}.csv`

    console.log('[Test Batch Transaction] Starting test', {
      transactionType,
      transactionMethod,
      walletId,
      csvRowCount: csvContent.split('\n').length - 1 // Exclude header
    })

    // Full test: validate and process
    const result = await createBatchTransactionsWithValidation(csvContent, {
      fileName,
      transactionType,
      transactionMethod,
      walletId,
      skipFileAlreadyProcessedInLast24Hours: skipFileAlreadyProcessed,
    })

    const responseResult = {
      mode: 'full',
      ...result,
      csvContent: csvContent.split('\n').slice(0, 5).join('\n') + '\n...', // Show first few lines
      csvRowCount: csvContent.split('\n').length - 1
    }

    return NextResponse.json({
      success: true,
      message: result.success 
        ? 'Batch transactions created successfully'
        : 'Batch validation or processing failed',
      result: responseResult,
      parameters: {
        transactionType,
        transactionMethod,
        walletId,
        skipFileAlreadyProcessed
      }
    })
  } catch (error: any) {
    console.error('[Test Batch Transaction] Error', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
