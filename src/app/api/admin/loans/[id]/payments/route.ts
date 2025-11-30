import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getLoanPayments } from '@/src/lib/supabase/loan-helpers'

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

  const payments = await getLoanPayments(loanId)
  return NextResponse.json(payments)
}
