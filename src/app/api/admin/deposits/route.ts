import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/deposits
 * Get all loans pending disbursement with Accept Pay status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()

    // Fetch loans with pending_disbursement status and Accept Pay details
    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        id,
        loan_number,
        principal_amount,
        disbursement_date,
        disbursement_status,
        disbursement_transaction_id,
        disbursement_process_date,
        disbursement_initiated_at,
        disbursement_authorized_at,
        disbursement_completed_at,
        disbursement_error_code,
        disbursement_reference,
        created_at,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          accept_pay_customer_id,
          accept_pay_customer_status
        ),
        loan_applications:application_id (
          id,
          loan_amount
        )
      `)
      .eq('status', 'pending_disbursement')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching deposits:', error)
      return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 })
    }

    // Count by status
    const statusCounts = {
      pending: 0, // No transaction created yet
      initiated: 0, // Transaction created but not authorized
      authorized: 0, // Authorized but not completed
      completed: 0, // Completed
      failed: 0 // Has error code
    }

    const deposits = (loans || []).map((loan: any) => {
      const status = loan.disbursement_status
      
      if (!status) {
        statusCounts.pending++
      } else if (status === '101' || status === 'AA') {
        if (loan.disbursement_completed_at) {
          statusCounts.completed++
        } else if (loan.disbursement_authorized_at) {
          statusCounts.authorized++
        } else {
          statusCounts.initiated++
        }
      } else if (loan.disbursement_error_code) {
        statusCounts.failed++
      } else {
        statusCounts.pending++
      }

      return {
        ...loan,
        borrower_name: loan.users
          ? `${loan.users.first_name || ''} ${loan.users.last_name || ''}`.trim() || 'N/A'
          : 'N/A',
        borrower_email: loan.users?.email || 'N/A',
        borrower_phone: loan.users?.phone || 'N/A',
        accept_pay_customer_id: loan.users?.accept_pay_customer_id || null,
        accept_pay_customer_status: loan.users?.accept_pay_customer_status || null
      }
    })

    return NextResponse.json({
      success: true,
      deposits,
      statusCounts
    })
  } catch (error: any) {
    console.error('Error in deposits API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

