import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserType } from '@/src/lib/supabase/db-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/loans
 * Fetch loans for the authenticated user (clients see only their own loans)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    // Check if user is a client (RLS will handle filtering to their own loans)
    const userType = await getUserType(user.id, true)
    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only. Use /api/admin/loans for admin access.' },
        { status: 403 }
      )
    }

    // Fetch loans with related data
    // RLS policy ensures users only see their own loans
    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        id,
        application_id,
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
          loan_type,
          application_status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching loans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch loans', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      loans: loans || [],
      total: loans?.length || 0
    })
  } catch (error: any) {
    console.error('Error in loans API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
