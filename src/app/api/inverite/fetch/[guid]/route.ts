// Route: GET /api/inverite/fetch/[guid]
// Fetches account data from Inverite API for a given request GUID
// This is a manual fetch that can be triggered from the admin panel

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import type { IBVSummary } from './types'

// Build a compact summary from Inverite raw data with safe fallbacks
export function extractSummary(rawData: any, requestGuid: string): IBVSummary {
  return {
    request_guid: requestGuid,
    accounts: rawData.accounts.map((account: any) => ({
      bank_name: account.bank,
      type: account.type,
      number: account.account,
      transit: account.transit,
      institution: account.institution,
      routing_code: account.routing_code,
      statistics: {
        income_net: account.statistics.income_net,
        nsf: {
          all_time: account.statistics.quarter_all_time.number_of_nsf,
          quarter_3_months: account.statistics.quarter_3_months.number_of_nsf,
          quarter_6_months: account.statistics.quarter_6_months.number_of_nsf,
          quarter_9_months: account.statistics.quarter_9_months.number_of_nsf,
          quarter_12_months: account.statistics.quarter_12_months.number_of_nsf
        }
      },
      bank_pdf_statements: account.bank_pdf_statements,
      total_transactions: (account.transactions ?? []).length
    }))
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { guid: string } }
) {
  try {
    const requestGuid = params.guid
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('application_id')

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
        Auth: apiKey
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
        {
          error: 'MALFORMED_RESPONSE',
          message: 'Failed to parse Inverite response'
        },
        { status: 502 }
      )
    }

    console.log(
      '[Inverite Fetch] Successfully fetched data for GUID:',
      requestGuid
    )

    // Extract IBV summary and include request_guid for downstream consumers
    const ibvSummary: IBVSummary = {
      ...extractSummary(inveriteData, requestGuid),
      request_guid: requestGuid
    }
    // Find the loan application - prefer application_id if provided
    const supabase = createServerSupabaseAdminClient()
    let matchingApplication: any = null

    if (applicationId) {
      // Direct lookup by application ID
      const { data: application, error: fetchError } = await supabase
        .from('loan_applications')
        .select('id, ibv_provider_data')
        .eq('id', applicationId)
        .eq('ibv_provider', 'inverite')
        .single()

      if (fetchError || !application) {
        console.error(
          '[Inverite Fetch] Error fetching application:',
          fetchError
        )
        return NextResponse.json(
          {
            error: 'APPLICATION_NOT_FOUND',
            message: 'No application found with the provided ID'
          },
          { status: 404 }
        )
      }

      // Verify the request_guid matches
      const providerData = (application as any)?.ibv_provider_data as any
      if (providerData?.request_guid !== requestGuid) {
        return NextResponse.json(
          {
            error: 'GUID_MISMATCH',
            message: 'Request GUID does not match the application'
          },
          { status: 400 }
        )
      }

      matchingApplication = application as any
    } else {
      // Fallback: search by request_guid
      const { data: applications, error: fetchError } = await supabase
        .from('loan_applications')
        .select('id, ibv_provider_data')
        .eq('ibv_provider', 'inverite')
        .not('ibv_provider_data', 'is', null)

      if (fetchError) {
        console.error(
          '[Inverite Fetch] Error fetching applications:',
          fetchError
        )
        return NextResponse.json(
          { error: 'DATABASE_ERROR', message: 'Failed to find application' },
          { status: 500 }
        )
      }

      // Find application with matching request_guid
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
    }

    // Merge new account data into existing provider data
    const currentProviderData =
      (matchingApplication.ibv_provider_data as any) || {}

    // Extract request_guid from Inverite response (using 'request' field)
    const responseRequestGuid =
      inveriteData.request ||
      inveriteData.request_guid ||
      inveriteData.request_GUID ||
      requestGuid

    // Store all Inverite data in structured format
    const updatedProviderData = {
      // Keep existing request_guid and verified_at
      request_guid: currentProviderData.request_guid || responseRequestGuid,
      verified_at:
        currentProviderData.verified_at ||
        inveriteData.complete_datetime ||
        new Date().toISOString(),

      // Store raw Inverite response for reference
      ...inveriteData,

      // Timestamps
      account_data_fetched_at: new Date().toISOString(),
      account_data_received_at:
        currentProviderData.account_data_received_at || new Date().toISOString()
    }

    // Update the application in database
    // Persist recomputed summary
    const { error: updateError } = await (supabase as any)
      .from('loan_applications')
      .update({
        ibv_results: ibvSummary,
        ibv_provider_data: updatedProviderData,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

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

    console.log(
      '[Inverite Fetch] Successfully updated application:',
      applicationId,
      matchingApplication.id
    )

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
        transactions_count:
          inveriteData.accounts?.[0]?.transactions?.length || 0,
        complete_datetime: inveriteData.complete_datetime
      },
      ibv_results: ibvSummary
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
