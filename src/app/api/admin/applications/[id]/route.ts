/**
 * API Route: Get Single Application Details
 * 
 * GET /api/admin/applications/[id]
 * 
 * Returns detailed information for a specific loan application
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    // Fetch application with all related data
    const { data: application, error } = await supabase
      .from('loan_applications')
      .select(`
        *,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          preferred_language,
          kyc_status,
          date_of_birth,
          residence_status,
          gross_salary,
          rent_or_mortgage_cost,
          heating_electricity_cost,
          car_loan,
          furniture_loan
        ),
        addresses!loan_applications_address_id_fkey (
          id,
          street_number,
          street_name,
          apartment_number,
          city,
          province,
          postal_code,
          moving_date
        ),
        references!references_loan_application_id_fkey (
          id,
          first_name,
          last_name,
          phone,
          relationship
        )
      `)
      .eq('id', applicationId)
      .single()

    if (error) {
      console.error('Error fetching application:', error)
      return NextResponse.json(
        { error: 'Failed to fetch application details' },
        { status: 500 }
      )
    }

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Transform the data structure
    const app = application as any
    const applicationData = {
      ...app,
      users: Array.isArray(app.users) ? app.users[0] : app.users,
      addresses: app.addresses || [],
      references: app.references || []
    }

    return NextResponse.json({
      application: applicationData
    })

  } catch (error: any) {
    console.error('Error in GET /api/admin/applications/[id]:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch application details' },
      { status: 500 }
    )
  }
}

