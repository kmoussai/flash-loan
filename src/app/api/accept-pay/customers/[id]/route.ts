import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { isAdmin } from '@/src/lib/supabase'
import {
  getAcceptPayCustomerId,
  updateAcceptPayCustomerStatus
} from '@/src/lib/supabase/accept-pay-helpers'
import { getAcceptPayClient } from '@/src/lib/accept-pay/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/accept-pay/customers/[id]
 * Get Accept Pay customer details
 * Admin only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userIsAdmin = await isAdmin(true)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const customerId = parseInt(params.id)
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    const acceptPayClient = getAcceptPayClient()
    const customer = await acceptPayClient.getCustomer(customerId)
    const transactions = await acceptPayClient.getCustomerTransactions(customerId)

    return NextResponse.json({
      success: true,
      customer,
      transactions
    })
  } catch (error: any) {
    console.error('Error fetching Accept Pay customer:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/accept-pay/customers/[id]
 * Update Accept Pay customer
 * Admin only
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userIsAdmin = await isAdmin(true)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const customerId = parseInt(params.id)
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    const body = await request.json()
    const acceptPayClient = getAcceptPayClient()
    const result = await acceptPayClient.updateCustomer(customerId, body)

    return NextResponse.json({
      success: true,
      customer: result
    })
  } catch (error: any) {
    console.error('Error updating Accept Pay customer:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/accept-pay/customers/[id]
 * Suspend Accept Pay customer
 * Admin only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userIsAdmin = await isAdmin(true)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const customerId = parseInt(params.id)
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    const acceptPayClient = getAcceptPayClient()
    await acceptPayClient.suspendCustomer(customerId)

    // Find user with this customer ID and update status
    const supabase = await createServerSupabaseClient()
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('accept_pay_customer_id', customerId)

    if (users && users.length > 0) {
      for (const user of users) {
        await updateAcceptPayCustomerStatus(user.id, 'suspended', true)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Customer suspended successfully'
    })
  } catch (error: any) {
    console.error('Error suspending Accept Pay customer:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

