import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { isAdmin } from '@/src/lib/supabase'
import {
  createAcceptPayCustomer,
  getAcceptPayCustomerId
} from '@/src/lib/supabase/accept-pay-helpers'
import { getAcceptPayClient } from '@/src/lib/accept-pay/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/accept-pay/customers
 * Create Accept Pay customer for a user
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Users can only create their own customer, or admin can create for any user
    const userIsAdmin = await isAdmin(true)
    if (userId !== user.id && !userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await createAcceptPayCustomer(userId, true)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      customerId: result.customerId
    })
  } catch (error: any) {
    console.error('Error creating Accept Pay customer:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/accept-pay/customers
 * List Accept Pay customers
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const userIsAdmin = await isAdmin(true)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const acceptPayClient = getAcceptPayClient()
    const customers = await acceptPayClient.getAllCustomers()

    return NextResponse.json({
      success: true,
      customers
    })
  } catch (error: any) {
    console.error('Error fetching Accept Pay customers:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

