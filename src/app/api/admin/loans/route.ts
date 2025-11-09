import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/loans
 * Fetch all loans (admin/staff only)
 * Query params:
 *   - user_id: Filter loans by specific user ID (optional)
 *   - status: Filter loans by status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('loans')
      .select(`
        id,
        loan_number,
        application_id,
        user_id,
        principal_amount,
        interest_rate,
        term_months,
        disbursement_date,
        due_date,
        remaining_balance,
        status,
        created_at,
        updated_at,
        loan_applications (
          id,
          loan_amount,
          application_status
        ),
        users!loans_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }

    const { data: loans, error } = await query

    if (error) {
      console.error('Error fetching loans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch loans', details: error.message },
        { status: 500 }
      )
    }

    const loansList = (loans || []) as any[]

    // Get counts by status
    const statusCounts = {
      pending_disbursement: loansList.filter((loan: any) => loan.status === 'pending_disbursement').length,
      active: loansList.filter((loan: any) => loan.status === 'active').length,
      completed: loansList.filter((loan: any) => loan.status === 'completed').length,
      defaulted: loansList.filter((loan: any) => loan.status === 'defaulted').length,
      cancelled: loansList.filter((loan: any) => loan.status === 'cancelled').length
    }

    return NextResponse.json({
      loans: loansList,
      statusCounts,
      total: loansList.length
    })
  } catch (error: any) {
    console.error('Error in admin loans API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
