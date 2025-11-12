import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserType } from '@/src/lib/supabase/db-helpers'
import {
  getNotificationsForRecipient,
  markNotificationAsRead
} from '@/src/lib/supabase'
import type { NotificationRecipient } from '@/src/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/notifications
 * Returns notifications for the authenticated user (client or staff)
 * Query params:
 *  - unread=true to fetch only unread notifications
 *  - limit=<number> to cap results
 *  - since=<ISO8601 timestamp> to filter by creation date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    const userType = await getUserType(user.id, true)
    if (!userType) {
      return NextResponse.json(
        { error: 'Forbidden: User record not found' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const onlyUnread = searchParams.get('unread') === 'true'
    const limitParam = searchParams.get('limit')
    const since = searchParams.get('since') ?? undefined

    let limit: number | undefined
    if (limitParam !== null) {
      const parsedLimit = Number(limitParam)
      if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
        return NextResponse.json(
          { error: 'Invalid limit parameter. Expected a positive number.' },
          { status: 400 }
        )
      }
      limit = Math.min(parsedLimit, 100)
    }

    const {
      success,
      data,
      error
    } = await getNotificationsForRecipient({
      recipientId: user.id,
      recipientType: userType as NotificationRecipient,
      onlyUnread,
      limit,
      since,
      client: supabase
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error ?? 'Unknown error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      notifications: data,
      total: data.length,
      filters: {
        unread: onlyUnread,
        limit: limit ?? null,
        since: since ?? null
      }
    })
  } catch (error: any) {
    console.error('[GET /api/user/notifications] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/notifications
 * Marks a list of notification IDs as read for the current user.
 * Body: { notificationIds: string[], readAt?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    const userType = await getUserType(user.id, true)
    if (!userType) {
      return NextResponse.json(
        { error: 'Forbidden: User record not found' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    if (
      !body ||
      typeof body !== 'object' ||
      !Array.isArray(body.notificationIds) ||
      body.notificationIds.some((id: unknown) => typeof id !== 'string' || !id)
    ) {
      return NextResponse.json(
        { error: 'Invalid payload. Expected { notificationIds: string[] }.' },
        { status: 400 }
      )
    }

    const readAt =
      typeof body.readAt === 'string' && body.readAt.trim().length > 0
        ? body.readAt
        : new Date().toISOString()

    const results = []
    for (const notificationId of body.notificationIds) {
      const result = await markNotificationAsRead(notificationId, {
        readAt,
        client: supabase
      })

      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Failed to mark notifications as read',
            details: result.error ?? 'Unknown error'
          },
          { status: 500 }
        )
      }

      results.push(result.data)
    }

    return NextResponse.json({
      success: true,
      marked: results.length
    })
  } catch (error: any) {
    console.error('[POST /api/user/notifications] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

