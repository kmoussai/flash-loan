import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { isStaff } from '@/src/lib/supabase'
import { authorizePayment } from '@/src/lib/supabase/accept-pay-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/accept-pay/collect/[scheduleId]/authorize
 * Authorize payment collection transaction
 * Staff only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userIsStaff = await isStaff(true)
    if (!userIsStaff) {
      return NextResponse.json({ error: 'Forbidden: Staff access required' }, { status: 403 })
    }

    const { scheduleId } = params
    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 })
    }

    const result = await authorizePayment(scheduleId, true)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment collection transaction authorized successfully',
    })
  } catch (error: any) {
    console.error('Error authorizing payment collection:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

