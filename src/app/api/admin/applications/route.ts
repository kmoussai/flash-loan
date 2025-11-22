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
    
    // Parse pagination parameters
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get('limit') || '100', 10))) // Default 100, max 1000
    const offset = (page - 1) * limit

    // Get total count for pagination
    const { count: totalCount, error: totalError } = await supabase
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('Error fetching total count:', totalError)
    }

    // Get status counts using count queries (more efficient)
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
    const { data: applications, error } = await supabase
      .from('loan_applications')
      .select(`
        id,
        loan_amount,
        application_status,
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
        addresses (
          province
        )
      `)
      .order('created_at', { ascending: false })
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

