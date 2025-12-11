import { NextRequest, NextResponse } from 'next/server'
import { syncLoanPaymentsToZumRails } from '@/src/lib/payment-providers/zumrails'
import { requireAdmin, createAuthErrorResponse } from '@/src/lib/supabase/api-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/transactions/sync-loan-payments
 * Trigger sync of loan payments to ZumRails
 * Admin/Staff only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await requireAdmin()
    if (!authResult.authorized) {
      return createAuthErrorResponse(authResult)
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const { limit = 50, walletId } = body

    // Validate limit
    if (limit && (typeof limit !== 'number' || limit < 1 || limit > 500)) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 500' },
        { status: 400 }
      )
    }

    // Trigger sync
    const result = await syncLoanPaymentsToZumRails({
      limit,
      walletId
    })

    return NextResponse.json({
      success: result.success,
      message: `Sync completed: ${result.created} created, ${result.failed} failed out of ${result.processed} processed`,
      result
    })
  } catch (error: any) {
    console.error('[Sync Loan Payments] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync loan payments',
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}
