import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { isStaff } from '@/src/lib/supabase'
import { voidPayment } from '@/src/lib/supabase/accept-pay-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/accept-pay/transactions/[id]/void
 * Void a transaction
 * Staff only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: scheduleId } = params
    const body = await request.json()
    const { reason } = body

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    const result = await voidPayment(scheduleId, reason || 'Voided by staff', true)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction voided successfully'
    })
  } catch (error: any) {
    console.error('Error voiding transaction:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

