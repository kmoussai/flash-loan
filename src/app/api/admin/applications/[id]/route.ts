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

    // Fetch application with needed related data for details page
    // Note: Using select('*') and explicit fields to ensure JSONB fields are fully returned
    const { data: application, error } = await supabase
      .from('loan_applications')
      .select(`
        id,
        loan_amount,
        loan_type,
        income_source,
        income_fields,
        application_status,
        bankruptcy_plan,
        ibv_provider,
        ibv_status,
        ibv_provider_data,
        ibv_results,
        ibv_verified_at,
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
    
    // Fetch ibv_provider_data separately to ensure it's complete (large JSONB fields can be truncated)
    // This is a workaround for PostgREST potentially truncating large JSONB in complex queries with joins
    let fullIbvData: any = app.ibv_provider_data || null
    if (app.ibv_provider_data) {
      // Try fetching ibv_provider_data separately to ensure completeness
      const { data: ibvDataOnly, error: ibvError } = await supabase
        .from('loan_applications')
        .select('ibv_provider_data')
        .eq('id', applicationId)
        .single()
      
      if (!ibvError && ibvDataOnly) {
        const ibvDataRecord = ibvDataOnly as any
        if (ibvDataRecord.ibv_provider_data) {
          fullIbvData = ibvDataRecord.ibv_provider_data
          console.log('[API] Fetched ibv_provider_data separately to ensure completeness')
          // Log size for debugging
          const ibvDataStr = JSON.stringify(fullIbvData)
          console.log(`[API] ibv_provider_data size: ${ibvDataStr.length} characters`)
          if (fullIbvData.accounts && Array.isArray(fullIbvData.accounts) && fullIbvData.accounts.length > 0) {
            const txCount = fullIbvData.accounts.reduce((sum: number, acc: any) => {
              return sum + (Array.isArray(acc.transactions) ? acc.transactions.length : 0)
            }, 0)
            console.log(`[API] Total transactions in ibv_provider_data: ${txCount}`)
          }
        }
      }
    }
    
    const applicationData = {
      ...app,
      // Use the separately fetched ibv_provider_data to ensure it's complete
      ibv_provider_data: fullIbvData,
      users: Array.isArray(app.users) ? app.users[0] : app.users,
      addresses: Array.isArray(app.addresses) ? app.addresses : (app.addresses ? [app.addresses] : []),
      references: Array.isArray(app.references) ? app.references : []
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

