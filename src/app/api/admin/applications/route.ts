import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

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

    // Get counts by status
    const statusCounts = {
      pending: applications?.filter(app => app.application_status === 'pending').length || 0,
      processing: applications?.filter(app => app.application_status === 'processing').length || 0,
      approved: applications?.filter(app => app.application_status === 'approved').length || 0,
      rejected: applications?.filter(app => app.application_status === 'rejected').length || 0,
      cancelled: applications?.filter(app => app.application_status === 'cancelled').length || 0
    }

    return NextResponse.json({
      applications: applications || [],
      statusCounts,
      total: applications?.length || 0
    })
  } catch (error: any) {
    console.error('Error in applications API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

