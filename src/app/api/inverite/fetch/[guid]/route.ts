// Route: GET /api/inverite/fetch/[guid]
// Fetches account data from Inverite API for a given request GUID
// This is a manual fetch that can be triggered from the admin panel

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { guid: string } }
) {
  try {
    const requestGuid = params.guid

    if (!requestGuid) {
      return NextResponse.json(
        { error: 'Request GUID is required' },
        { status: 400 }
      )
    }

    // Get API configuration from environment
    const apiKey = process.env.INVERITE_API_KEY
    const baseUrl =
      process.env.INVERITE_API_BASE_URL || 'https://sandbox.inverite.com'

    if (!apiKey || !baseUrl) {
      return NextResponse.json(
        {
          error: 'MISSING_CONFIGURATION',
          message:
            'INVERITE_API_KEY or INVERITE_API_BASE_URL is not configured.'
        },
        { status: 500 }
      )
    }

    // Build fetch URL
    const fetchUrl = `${baseUrl}/api/v2/fetch/${requestGuid}`

    console.log('[Inverite Fetch] Fetching data for GUID:', requestGuid)

    // Call Inverite API
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Auth': apiKey
      }
    })

    const rawText = await response.text().catch(() => '')

    if (!response.ok) {
      console.error('[Inverite Fetch] Error response:', {
        status: response.status,
        body: rawText
      })
      return NextResponse.json(
        {
          error: 'INVERITE_FETCH_FAILED',
          details: rawText || response.statusText
        },
        { status: response.status }
      )
    }

    // Parse response
    let inveriteData: any
    try {
      inveriteData = rawText ? JSON.parse(rawText) : {}
    } catch (error) {
      console.error('[Inverite Fetch] Failed to parse response:', error)
      return NextResponse.json(
        { error: 'MALFORMED_RESPONSE', message: 'Failed to parse Inverite response' },
        { status: 502 }
      )
    }

    console.log('[Inverite Fetch] Successfully fetched data for GUID:', requestGuid)

    // Find the loan application by request_guid
    const supabase = createServerSupabaseAdminClient()
    const { data: applications, error: fetchError } = await supabase
      .from('loan_applications')
      .select('id, ibv_provider_data')
      .eq('ibv_provider', 'inverite')
      .not('ibv_provider_data', 'is', null)

    if (fetchError) {
      console.error('[Inverite Fetch] Error fetching applications:', fetchError)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: 'Failed to find application' },
        { status: 500 }
      )
    }

    // Find application with matching request_guid
    let matchingApplication: any = null
    for (const app of (applications || []) as any[]) {
      const providerData = app?.ibv_provider_data as any
      if (providerData?.request_guid === requestGuid) {
        matchingApplication = app
        break
      }
    }

    if (!matchingApplication) {
      return NextResponse.json(
        {
          error: 'APPLICATION_NOT_FOUND',
          message: 'No application found for this request GUID'
        },
        { status: 404 }
      )
    }

    // Merge new account data into existing provider data
    const currentProviderData = (matchingApplication.ibv_provider_data as any) || {}
    
    // Extract request_guid from Inverite response (using 'request' field)
    const responseRequestGuid = inveriteData.request || inveriteData.request_guid || inveriteData.request_GUID || requestGuid

    // Store all Inverite data in structured format
    const updatedProviderData = {
      // Keep existing request_guid and verified_at
      request_guid: currentProviderData.request_guid || responseRequestGuid,
      verified_at: currentProviderData.verified_at || inveriteData.complete_datetime || new Date().toISOString(),
      
      // Store raw Inverite response for reference
      raw_data: inveriteData,
      
      // Store all Inverite response fields
      name: inveriteData.name || null,
      complete_datetime: inveriteData.complete_datetime || null,
      referenceid: inveriteData.referenceid || null,
      status: inveriteData.status || null,
      type: inveriteData.type || null,
      accounts: inveriteData.accounts || [],
      all_bank_pdf_statements: inveriteData.all_bank_pdf_statements || [],
      address: inveriteData.address || null,
      contacts: inveriteData.contacts || [],
      account_validations: inveriteData.account_validations || [],
      
      // Legacy fields for backward compatibility (extracted from accounts if available)
      account_info: inveriteData.accounts?.[0] || inveriteData.account_info || inveriteData.account || null,
      account_stats: inveriteData.accounts?.[0]?.statistics || inveriteData.account_stats || inveriteData.stats || null,
      account_statement: inveriteData.accounts?.[0]?.transactions || inveriteData.account_statement || inveriteData.transactions || [],
      
      // Timestamps
      account_data_fetched_at: new Date().toISOString(),
      account_data_received_at: currentProviderData.account_data_received_at || new Date().toISOString()
    }

    // Update the application in database
    const supabaseAny = supabase as any
    const { error: updateError } = await supabaseAny
      .from('loan_applications')
      .update({
        ibv_provider_data: updatedProviderData,
        ibv_status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('id', matchingApplication.id)

    if (updateError) {
      console.error('[Inverite Fetch] Error updating application:', updateError)
      return NextResponse.json(
        {
          error: 'UPDATE_FAILED',
          message: 'Failed to update application with fetched data'
        },
        { status: 500 }
      )
    }

    console.log('[Inverite Fetch] Successfully updated application:', matchingApplication.id)

    // Return success with fetched data summary
    return NextResponse.json({
      success: true,
      message: 'Data fetched and updated successfully',
      application_id: matchingApplication.id,
      request_guid: requestGuid,
      data: {
        name: inveriteData.name,
        status: inveriteData.status,
        accounts_count: inveriteData.accounts?.length || 0,
        transactions_count: inveriteData.accounts?.[0]?.transactions?.length || 0,
        complete_datetime: inveriteData.complete_datetime
      }
    })
  } catch (error: any) {
    console.error('[Inverite Fetch] Error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

