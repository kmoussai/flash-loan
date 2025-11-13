import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { isStaff } from '@/src/lib/supabase'
import { getAcceptPayClient } from '@/src/lib/accept-pay/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/accept-pay/transactions/[id]
 * Get transaction status/details from Accept Pay
 * Staff only
 */
export async function GET(
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

    const transactionId = parseInt(params.id)
    if (isNaN(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
    }

    const acceptPayClient = getAcceptPayClient()
    const transaction = await acceptPayClient.getTransaction(transactionId)
    const authorization = await acceptPayClient.getTransactionAuthorization(transactionId).catch(() => null)

    return NextResponse.json({
      success: true,
      transaction,
      authorization
    })
  } catch (error: any) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

