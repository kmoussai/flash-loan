// Route: GET /api/zumrails/fetch/[requestId]
// Fetches bank account data from Zumrails API using request ID
// Calls: {{zum rails api }}/api/aggregation/GetInformationByRequestId/{requestId}

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'
import { getZumrailsAuthToken } from '@/src/lib/ibv/zumrails-server'
import { transformZumrailsToIBVSummary } from '@/src/lib/ibv/zumrails-transform'
import { recategorizeTransactionsForApplication } from '@/src/lib/ibv/zumrails-categorize-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('application_id')

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    console.log('[Zumrails Fetch] Fetching data by request ID', {
      requestId,
      applicationId
    })

    const supabase = createServerSupabaseAdminClient()
    let matchingApplication: any = null

    // Find application by request ID if applicationId provided
    if (applicationId) {
      const { data: application, error: fetchError } = await supabase
        .from('loan_applications')
        .select('id, client_id, assigned_to, ibv_provider_data, ibv_status, ibv_verified_at, ibv_results')
        .eq('id', applicationId)
        .eq('ibv_provider', 'zumrails')
        .single()

      if (fetchError || !application) {
        return NextResponse.json(
          {
            error: 'APPLICATION_NOT_FOUND',
            message: 'No application found with the provided ID'
          },
          { status: 404 }
        )
      }

      matchingApplication = application

      // Verify request ID matches
      const providerData = (application as any)?.ibv_provider_data as any
      const storedRequestId = 
        providerData?.request_id || 
        providerData?.requestId || 
        providerData?.token

      if (storedRequestId !== requestId) {
        return NextResponse.json(
          {
            error: 'REQUEST_ID_MISMATCH',
            message: 'Request ID does not match the application'
          },
          { status: 400 }
        )
      }
    }

    // Authenticate with Zumrails
    let authToken: string
    try {
      const auth = await getZumrailsAuthToken()
      authToken = auth.token
    } catch (error: any) {
      console.error('[Zumrails Fetch] Authentication failed:', error)
      return NextResponse.json(
        {
          error: 'AUTHENTICATION_FAILED',
          message: 'Failed to authenticate with Zumrails API'
        },
        { status: 500 }
      )
    }

    // Call Zumrails API to fetch information by request ID
    const baseUrl =
      process.env.ZUMRAILS_API_BASE_URL || 'https://api-sandbox.zumrails.com'
    const fetchUrl = `${baseUrl}/api/aggregation/GetInformationByRequestId/${requestId}`

    console.log('[Zumrails Fetch] Calling Zumrails API', {
      url: fetchUrl,
      requestId
    })

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    })

    const rawText = await response.text().catch(() => '')

    if (!response.ok) {
      console.error('[Zumrails Fetch] API call failed', {
        status: response.status,
        statusText: response.statusText,
        body: rawText
      })

      return NextResponse.json(
        {
          error: 'ZUMRAILS_API_ERROR',
          message: `Zumrails API returned ${response.status}: ${rawText || response.statusText}`,
          status: response.status
        },
        { status: response.status >= 500 ? 500 : response.status }
      )
    }

    let apiData: any
    try {
      apiData = rawText ? JSON.parse(rawText) : {}
    } catch (error) {
      console.error('[Zumrails Fetch] Failed to parse API response', error)
      return NextResponse.json(
        {
          error: 'PARSE_ERROR',
          message: 'Failed to parse Zumrails API response'
        },
        { status: 500 }
      )
    }

    // Check for errors in Zumrails response format
    if (apiData.isError) {
      console.error('[Zumrails Fetch] Zumrails returned error', apiData)
      return NextResponse.json(
        {
          error: 'ZUMRAILS_ERROR',
          message: apiData.message || 'Zumrails API returned an error',
          zumrailsError: apiData
        },
        { status: 400 }
      )
    }

    console.log('[Zumrails Fetch] Successfully fetched data', {
      requestId,
      hasData: !!apiData.result || !!apiData.data
    })

    // Transform Zumrails response to IBVSummary format
    const rawData = apiData.result || apiData.data || apiData
    const ibvSummary = transformZumrailsToIBVSummary(rawData, requestId)

    // Update application if provided
    if (matchingApplication) {
      // Re-categorize transactions with new transform logic
      // Must await in serverless environment (Vercel) - can't run in background
      try {
        await recategorizeTransactionsForApplication(matchingApplication.id, rawData)
      } catch (error) {
        console.error(
          '[Zumrails Fetch] Error recategorizing transactions:',
          error
        )
        // Don't fail the request if categorization fails
      }
      
      const currentProviderData = (matchingApplication.ibv_provider_data as any) || {}
      
      // Update provider_data with fetched information
      const updatedProviderData = createIbvProviderData('zumrails', {
        ...currentProviderData,
        request_id: requestId,
        account_info: rawData,
        fetched_at: new Date().toISOString()
      })

      // Update loan application with transformed IBVSummary
      await (supabase.from('loan_applications') as any)
        .update({
          ibv_status: 'verified',
          ibv_provider_data: updatedProviderData,
          ibv_results: ibvSummary, // Store transformed IBVSummary
          ibv_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchingApplication.id)

      // Also update IBV request if it exists
      const { data: ibvRequest } = await supabase
        .from('loan_application_ibv_requests')
        .select('id')
        .eq('loan_application_id', matchingApplication.id)
        .eq('provider', 'zumrails')
        .maybeSingle()

      if (ibvRequest && (ibvRequest as any).id) {
        await (supabase.from('loan_application_ibv_requests') as any)
          .update({
            status: 'verified' as any,
            results: ibvSummary, // Store transformed IBVSummary
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', (ibvRequest as any).id)
      }

      console.log('[Zumrails Fetch] Updated application', {
        applicationId: matchingApplication.id,
        requestId
      })
    }

    return NextResponse.json({
      success: true,
      requestId,
      application_id: matchingApplication?.id,
      data: ibvSummary, // Return transformed IBVSummary
      raw_data: rawData, // Include raw data for debugging
      updated: !!matchingApplication
    })
  } catch (error: any) {
    console.error('[Zumrails Fetch] Error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

