import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { requireAdmin, createAuthErrorResponse } from '@/src/lib/supabase/api-auth'

// Force dynamic rendering - this API route needs database access
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/applications
 * Fetch all loan applications with client details
 * Requires: Admin authentication (enforced by middleware)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access (redundant check since middleware handles it, but good for defense in depth)
    const authResult = await requireAdmin()
    if (!authResult.authorized) {
      return createAuthErrorResponse(authResult)
    }

    const supabase = createServerSupabaseAdminClient()
    
    // Parse pagination and filter parameters
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get('limit') || '100', 10))) // Default 100, max 1000
    const offset = (page - 1) * limit
    const statusFilter = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    // Optimized search: Find matching user IDs (only if search term provided)
    // Run user search and status counts in parallel for better performance
    let matchingUserIds: string[] | undefined = undefined
    
    const searchPromise = search && search.trim() 
      ? supabase
          .from('users')
          .select('id')
          
          .or(`first_name.ilike.%${search.trim().toLowerCase()}%,last_name.ilike.%${search.trim().toLowerCase()}%,email.ilike.%${search.trim().toLowerCase()}%,phone.ilike.%${search.trim().toLowerCase()}%`)
          .limit(10000) // Safety limit to prevent excessive results
      : Promise.resolve({ data: null, error: null })

    // Get status counts (without search filter, as counts should reflect all applications)
    // Optimized: Use 'id' instead of '*' for count queries (more efficient)
    // Run these in parallel with the search query
    const statusQueries = [
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('application_status', 'pending'),
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('application_status', 'processing'),
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('application_status', 'pre_approved'),
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('application_status', 'contract_pending'),
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('application_status', 'contract_signed'),
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('application_status', 'approved'),
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('application_status', 'rejected'),
      supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('application_status', 'cancelled')
    ]

    // Execute search and status counts in parallel
    const [searchResult, ...statusResults] = await Promise.all([searchPromise, ...statusQueries])

    // Process search results
    if (search && search.trim()) {
      const { data: matchingUsers, error: searchError } = searchResult as { data: any[] | null, error: any }
      
      if (searchError) {
        console.error('Error searching users:', searchError)
        // Continue with undefined matchingUserIds to return all results on error
      } else if (matchingUsers && Array.isArray(matchingUsers) && matchingUsers.length > 0) {
        matchingUserIds = matchingUsers.map((u: { id: string }) => u.id)
      } else {
        // No matching users found, return empty results immediately
        return NextResponse.json({
          applications: [],
          statusCounts: {
            pending: statusResults[0].count || 0,
            processing: statusResults[1].count || 0,
            pre_approved: statusResults[2].count || 0,
            contract_pending: statusResults[3].count || 0,
            contract_signed: statusResults[4].count || 0,
            approved: statusResults[5].count || 0,
            rejected: statusResults[6].count || 0,
            cancelled: statusResults[7].count || 0
          },
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        })
      }
    }

    // Build status counts from parallel results
    const statusCounts = {
      pending: statusResults[0].count || 0,
      processing: statusResults[1].count || 0,
      pre_approved: statusResults[2].count || 0,
      contract_pending: statusResults[3].count || 0,
      contract_signed: statusResults[4].count || 0,
      approved: statusResults[5].count || 0,
      rejected: statusResults[6].count || 0,
      cancelled: statusResults[7].count || 0
    }

    // Build the base query for total count
    let totalCountQuery = supabase
      .from('loan_applications')
      .select('id', { count: 'exact', head: true }) // Only select id for count, more efficient

    if (statusFilter && statusFilter !== 'all') {
      totalCountQuery = totalCountQuery.eq('application_status', statusFilter)
    }

    if (matchingUserIds) {
      totalCountQuery = totalCountQuery.in('client_id', matchingUserIds)
    }

    // Execute total count query
    const { count: totalCount, error: totalError } = await totalCountQuery

    if (totalError) {
      console.error('Error fetching total count:', totalError)
    }

    // Fetch paginated applications with client details using a join
    let applicationsQuery = supabase
      .from('loan_applications')
      .select(`
        id,
        loan_amount,
        application_status,
        rejection_reason,
        ibv_provider,
        ibv_status,
        created_at,
        income_source,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        addresses!loan_applications_address_id_fkey (
          id,
          province
        )
      `)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      applicationsQuery = applicationsQuery.eq('application_status', statusFilter)
    }

    // Apply search filter (by user IDs)
    if (matchingUserIds) {
      applicationsQuery = applicationsQuery.in('client_id', matchingUserIds)
    }

    // Apply pagination
    const { data: applications, error } = await applicationsQuery
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching applications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch loan applications', details: error.message },
        { status: 500 }
      )
    }

    const apps = applications || []
    const total = totalCount || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      applications: apps,
      statusCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (error: any) {
    console.error('Error in applications API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

