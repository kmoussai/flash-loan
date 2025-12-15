import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/loans/[id]/payments
 * Get all payments for a loan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: loanId } = params
  if (!loanId) {
    return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 })
  }

  const supabase = createServerSupabaseAdminClient()
  const searchParams = request.nextUrl.searchParams
  const paymentStatusFilter = searchParams.get('status')

  let query = supabase
    .from('loan_payments')
    .select('*')
    .eq('loan_id', loanId)

  // By default, exclude cancelled payments unless explicitly requested via ?status=cancelled
  if (paymentStatusFilter) {
    query = query.eq('status', paymentStatusFilter)
  } else {
    query = query.neq('status', 'cancelled')
  }

  const { data, error } = await query.order('payment_date', {
    ascending: true
  })

  if (error) {
    console.error('Error fetching loan payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loan payments' },
      { status: 500 }
    )
  }

  return NextResponse.json(data || [])
}
