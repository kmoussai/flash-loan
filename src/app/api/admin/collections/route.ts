import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/collections
 * Get all payment schedules pending collection
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()

    // Fetch payment schedules with pending/scheduled status
    const { data: schedules, error } = await supabase
      .from('loan_payment_schedule')
      .select(`
        id,
        loan_id,
        scheduled_date,
        amount,
        payment_number,
        status,
        accept_pay_transaction_id,
        loan_payment_id,
        created_at,
        updated_at,
        loans:loan_id (
          id,
          loan_number,
          principal_amount,
          user_id,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            accept_pay_customer_id,
            accept_pay_customer_status
          )
        ),
        loan_payments (
          id,
          accept_pay_status,
          accept_pay_transaction_id,
          process_date,
          error_code,
          retry_count,
          collection_initiated_at,
          collection_completed_at
        )
      `)
      .order('scheduled_date', { ascending: true })

    if (error) {
      console.error('Error fetching collections:', error)
      return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
    }

    // Count by status
    const statusCounts = {
      pending: 0, // No transaction created yet
      scheduled: 0, // Transaction created but not authorized
      authorized: 0, // Authorized but not collected
      failed: 0 // Has error code
    }

    const collections = (schedules || []).map((schedule: any) => {
      const status = schedule.status
      const loan = schedule.loans
      const payment = Array.isArray(schedule.loan_payments) 
        ? schedule.loan_payments[0] 
        : schedule.loan_payments

      if (status === 'pending') {
        statusCounts.pending++

      } 
      else if (status === 'authorized') {
        statusCounts.authorized++
      }
      else if (status === 'scheduled') {
        if (payment?.accept_pay_status === 'AA') {
          statusCounts.authorized++
        } else {
          statusCounts.scheduled++
        }
      }

      if (payment?.error_code) {
        statusCounts.failed++
      }

      return {
        ...schedule,
        loan_number: loan?.loan_number || 'N/A',
        borrower_name: loan?.users
          ? `${loan.users.first_name || ''} ${loan.users.last_name || ''}`.trim() || 'N/A'
          : 'N/A',
        borrower_email: loan?.users?.email || 'N/A',
        borrower_phone: loan?.users?.phone || 'N/A',
        accept_pay_customer_id: loan?.users?.accept_pay_customer_id || null,
        accept_pay_customer_status: loan?.users?.accept_pay_customer_status || null,
        accept_pay_status: payment?.accept_pay_status || null,
        accept_pay_transaction_id: payment?.accept_pay_transaction_id || schedule.accept_pay_transaction_id || null,
        process_date: payment?.process_date || null,
        error_code: payment?.error_code || null,
        retry_count: payment?.retry_count || 0,
        collection_initiated_at: payment?.collection_initiated_at || null,
        collection_completed_at: payment?.collection_completed_at || null
      }
    })

    return NextResponse.json({
      success: true,
      collections,
      statusCounts
    })
  } catch (error: any) {
    console.error('Error in collections API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

