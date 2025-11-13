import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/src/lib/supabase'
import { syncTransactionUpdates } from '@/src/lib/supabase/accept-pay-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/accept-pay/sync
 * Manually trigger transaction status sync
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const userIsAdmin = await isAdmin(true)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const result = await syncTransactionUpdates(true)

    return NextResponse.json({
      success: result.success,
      transactionsSynced: result.transactionsSynced,
      errors: result.errors,
      message: `Sync completed. ${result.transactionsSynced} transactions synced.`
    })
  } catch (error: any) {
    console.error('Error syncing transactions:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

