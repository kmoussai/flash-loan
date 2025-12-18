/**
 * POST /api/admin/notifications/process-queue
 * Manually trigger processing of pending notification events from the queue
 * 
 * Admin only - processes pending events and sends emails
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/src/lib/supabase/admin-helpers'
import { processNotificationEvents } from '@/src/notifications/workers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/notifications/process-queue
 * Manually process pending notification events
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin permission
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const limit = typeof body.limit === 'number' && body.limit > 0 
      ? Math.min(body.limit, 100) // Max 100 at a time
      : 10 // Default to 10

    // Process the queue
    const result = await processNotificationEvents(limit)

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Processed ${result.processed} event(s), ${result.errors} error(s)`,
    })
  } catch (error: any) {
    console.error('[process-queue] Error:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Internal server error',
        success: false 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/notifications/process-queue
 * Get queue status (pending events count)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin permission
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const { createServerSupabaseAdminClient } = await import('@/src/lib/supabase/server')
    const supabase = await createServerSupabaseAdminClient()

    // Count pending events
    const { count, error } = await supabase
      .from('notification_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      // Table might not exist, return 0
      return NextResponse.json({
        success: true,
        pending: 0,
        message: 'Queue table not found or not accessible',
      })
    }

    return NextResponse.json({
      success: true,
      pending: count || 0,
    })
  } catch (error: any) {
    console.error('[process-queue] Error getting queue status:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Internal server error',
        success: false 
      },
      { status: 500 }
    )
  }
}

