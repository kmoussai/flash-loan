import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/loans
 * Fetch all loans (admin/staff only)
 * Query params:
 *   - user_id: Filter loans by specific user ID (optional)
 *   - status: Filter loans by status (optional)
 *   - search: Search by name, email, phone, or loan number (optional)
 *   - page: Page number for pagination (default: 1)
 *   - limit: Items per page (default: 100, max: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim() || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get('limit') || '100', 10)))
    const offset = (page - 1) * limit

    // If search is provided, find matching user IDs first
    let matchingUserIds: string[] | undefined = undefined
    if (search) {
      const { data: matchingUsers, error: searchError } = await supabase
        .from('users')
        .select('id')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(10000) // Safety limit

      if (!searchError && matchingUsers && Array.isArray(matchingUsers) && matchingUsers.length > 0) {
        matchingUserIds = matchingUsers.map((u: { id: string }) => u.id)
      }
    }

    // Build base query for loans
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
        crmStatus: crm_original_data->>status,
        created_at,
        updated_at,
        crmContractPath: crm_original_data->>pdfFile,
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
        ),
        loan_contracts (
          id,
          contract_number,
          contract_status,
          contract_version,
          contract_document_path,
          sent_at,
          sent_method,
          client_signed_at,
          contract_terms
        )

      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }

    // Apply search filter
    if (search) {
      if (matchingUserIds && matchingUserIds.length > 0) {
        // Search by user IDs or loan number
        query = query.or(`user_id.in.(${matchingUserIds.join(',')}),loan_number.eq.${parseInt(search) || -1}`)
      } else {
        // If no matching users, try loan number only
        const loanNumber = parseInt(search)
        if (!isNaN(loanNumber)) {
          query = query.eq('loan_number', loanNumber)
        } else {
          // No matches, return empty result
          return NextResponse.json({
            loans: [],
            statusCounts: {
              pending_disbursement: 0,
              active: 0,
              completed: 0,
              defaulted: 0,
              cancelled: 0
            },
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0
            }
          })
        }
      }
    }

    // Get status counts in parallel (only if not filtering by status)
    // Use database aggregation instead of filtering in memory
    const statusCountsPromise = status
      ? Promise.resolve(null) // Skip counts if filtering by status
      : Promise.all([
          supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'pending_disbursement'),
          supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'defaulted'),
          supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'cancelled')
        ]).then(([pending, active, completed, defaulted, cancelled]) => ({
          pending_disbursement: pending.count || 0,
          active: active.count || 0,
          completed: completed.count || 0,
          defaulted: defaulted.count || 0,
          cancelled: cancelled.count || 0
        }))

    // Execute queries in parallel
    const [{ data: loans, error, count }, statusCounts] = await Promise.all([
      query,
      statusCountsPromise
    ])

    if (error) {
      console.error('Error fetching loans:', error)
      return NextResponse.json(
        { error: 'Failed to fetch loans', details: error.message },
        { status: 500 }
      )
    }

    const loansList = loans || []

    return NextResponse.json({
      loans: loansList,
      statusCounts: statusCounts || {
        pending_disbursement: 0,
        active: 0,
        completed: 0,
        defaulted: 0,
        cancelled: 0
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Error in admin loans API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
