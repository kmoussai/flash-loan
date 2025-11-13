import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/accept-pay/payment-schedule/[loanId]
 * Get payment schedule for a loan
 * Users can view their own loan schedules, staff can view all
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { loanId: string } }
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

    const { loanId } = params
    if (!loanId) {
      return NextResponse.json({ error: 'loanId is required' }, { status: 400 })
    }

    // Check if user owns this loan or is staff
    const { data } = await supabase
      .from('loans')
      .select('user_id')
      .eq('id', loanId)
      .single()

    const loan = data as { user_id: string } | null

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    // Use admin client to bypass RLS for staff, regular client for users
    const adminSupabase = createServerSupabaseAdminClient()
    const { data: schedule, error } = await adminSupabase
      .from('loan_payment_schedule')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_number', { ascending: true })

    if (error) {
      console.error('Error fetching payment schedule:', error)
      return NextResponse.json({ error: 'Failed to fetch payment schedule' }, { status: 500 })
    }

    // If user is not staff and doesn't own the loan, return 403
    if (loan.user_id !== user.id) {
      const { data: staffCheck } = await supabase
        .from('staff')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!staffCheck) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({
      success: true,
      schedule: schedule || []
    })
  } catch (error: any) {
    console.error('Error fetching payment schedule:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

