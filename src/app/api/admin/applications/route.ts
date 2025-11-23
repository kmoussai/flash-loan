import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

// Force dynamic rendering - this API route needs database access
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/applications
 * Fetch all loan applications with client details
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()
    
    // Parse pagination and filter parameters
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get('limit') || '100', 10))) // Default 100, max 1000
    const offset = (page - 1) * limit
    const statusFilter = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    // If search is provided, first find matching user IDs
    let matchingUserIds: string[] | undefined = undefined
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      const { data: matchingUsers, error: searchError } = await supabase
        .from('users')
        .select('id')
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)

      if (searchError) {
        console.error('Error searching users:', searchError)
      } else if (matchingUsers && Array.isArray(matchingUsers) && matchingUsers.length > 0) {
        matchingUserIds = matchingUsers.map((u: { id: string }) => u.id)
      } else {
        // No matching users found, return empty results
        return NextResponse.json({
          applications: [],
          statusCounts: {
            pending: 0,
            processing: 0,
            pre_approved: 0,
            contract_pending: 0,
            contract_signed: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0
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

    // Get total count for pagination (respecting filters)
    let totalCountQuery = supabase
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })

    if (statusFilter && statusFilter !== 'all') {
      totalCountQuery = totalCountQuery.eq('application_status', statusFilter)
    }

    if (matchingUserIds) {
      totalCountQuery = totalCountQuery.in('client_id', matchingUserIds)
    }

    const { count: totalCount, error: totalError } = await totalCountQuery

    if (totalError) {
      console.error('Error fetching total count:', totalError)
    }

    // Get status counts (without search filter, as counts should reflect all applications)
    const statusQueries = await Promise.all([
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'pending'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'processing'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'pre_approved'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'contract_pending'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'contract_signed'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'approved'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'rejected'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('application_status', 'cancelled')
    ])

    const statusCounts = {
      pending: statusQueries[0].count || 0,
      processing: statusQueries[1].count || 0,
      pre_approved: statusQueries[2].count || 0,
      contract_pending: statusQueries[3].count || 0,
      contract_signed: statusQueries[4].count || 0,
      approved: statusQueries[5].count || 0,
      rejected: statusQueries[6].count || 0,
      cancelled: statusQueries[7].count || 0
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

