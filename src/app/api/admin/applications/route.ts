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
    
    // Fetch applications with client details using a join
    const { data: applications, error } = await supabase
      .from('loan_applications')
      .select(`
        id,
        client_id,
        loan_amount,
        loan_type,
        income_source,
        application_status,
        assigned_to,
        bankruptcy_plan,
        staff_notes,
        rejection_reason,
        created_at,
        updated_at,
        submitted_at,
        approved_at,
        rejected_at,
        flinks_login_id,
        flinks_request_id,
        flinks_institution,
        flinks_verification_status,
        flinks_connected_at,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          preferred_language,
          kyc_status
        ),
        addresses (
          id,
          street_number,
          street_name,
          apartment_number,
          city,
          province,
          postal_code
        ),
        references (
          id,
          first_name,
          last_name,
          phone,
          relationship
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching applications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch loan applications', details: error.message },
        { status: 500 }
      )
    }

    const apps = applications || []

    // Get counts by status
    const statusCounts = {
      pending: apps.filter((app: any) => app.application_status === 'pending').length,
      processing: apps.filter((app: any) => app.application_status === 'processing').length,
      approved: apps.filter((app: any) => app.application_status === 'approved').length,
      rejected: apps.filter((app: any) => app.application_status === 'rejected').length,
      cancelled: apps.filter((app: any) => app.application_status === 'cancelled').length
    }

    return NextResponse.json({
      applications: apps,
      statusCounts,
      total: apps.length
    })
  } catch (error: any) {
    console.error('Error in applications API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

