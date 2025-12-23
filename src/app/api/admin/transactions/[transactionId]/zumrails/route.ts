import { NextRequest, NextResponse } from 'next/server'
import { getZumRailsTransaction } from '@/src/lib/payment-providers/zumrails/transactions/get'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/transactions/[transactionId]/zumrails
 * Get ZumRails transaction details by transaction ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { transactionId } = params

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    const transaction = await getZumRailsTransaction(transactionId)

    return NextResponse.json({
      success: true,
      transaction
    })
  } catch (error: any) {
    console.error('Error fetching ZumRails transaction:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch ZumRails transaction',
        details: error.message
      },
      { status: 500 }
    )
  }
}

