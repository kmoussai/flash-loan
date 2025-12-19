import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { fetchZumrailsDataByRequestId } from '@/src/lib/ibv/zumrails-server'
import { transformZumrailsToIBVSummary } from '@/src/lib/ibv/zumrails-transform'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/applications/[id]/ibv/fetch-aggregation
 * Triggers ZumRails aggregation fetch for an application
 * Finds the ZumRails request ID from IBV request history and fetches aggregation data
 */
export async function POST(
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

    const supabase = createServerSupabaseAdminClient()

    // Fetch application first to check its provider_data for aggregation_request_id
    const { data: application, error: appError } = await (supabase as any)
      .from('loan_applications')
      .select(
        'id, client_id, assigned_to, ibv_provider_data, ibv_status, ibv_verified_at, ibv_results'
      )
      .eq('id', applicationId)
      .eq('ibv_provider', 'zumrails')
      .single()

    if (appError || !application) {
      return NextResponse.json(
        {
          error: 'APPLICATION_NOT_FOUND',
          message: 'No application found with the provided ID'
        },
        { status: 404 }
      )
    }

    const appProviderData = (application.ibv_provider_data as any) || {}

    // Find the most recent ZumRails IBV request for this application
    const { data: ibvRequests, error: requestsError } = await (supabase as any)
      .from('loan_application_ibv_requests')
      .select('id, provider_data, status')
      .eq('loan_application_id', applicationId)
      .eq('provider', 'zumrails')
      .order('requested_at', { ascending: false })
      .limit(1)

    if (requestsError) {
      console.error(
        '[Fetch Aggregation] Error loading IBV requests:',
        requestsError
      )
      // Non-fatal - continue with application provider_data
    }

    const ibvRequest =
      ibvRequests && ibvRequests.length > 0 ? ibvRequests[0] : null
    const ibvProviderData = (ibvRequest?.provider_data as any) || {}

    // Prioritize aggregation_request_id from webhook (stored in provider_data)
    // Check application's provider_data first (set by webhook), then IBV request's provider_data
    const aggregationRequestId = ibvProviderData.aggregation_request_id

    if (!aggregationRequestId) {
      return NextResponse.json(
        {
          error: 'NO_REQUEST_ID_FOUND',
          message:
            'No ZumRails aggregation request ID found. The IBV request may not have been completed yet. Please wait for the webhook to process or complete the bank verification.'
        },
        { status: 400 }
      )
    }

    console.log('[Fetch Aggregation] Found aggregation request ID:', {
      applicationId,
      aggregationRequestId,
      source: appProviderData.aggregation_request_id
        ? 'application_provider_data'
        : ibvProviderData.aggregation_request_id
          ? 'ibv_request_provider_data'
          : 'fallback',
      ibvRequestId: ibvRequest?.id
    })

    // Fetch ZumRails aggregation data directly
    let rawData: any
    try {
      rawData = await fetchZumrailsDataByRequestId(aggregationRequestId)
    } catch (fetchError: any) {
      console.error('[Fetch Aggregation] ZumRails API error:', fetchError)
      
      // Check if it's a 404/Not Found error
      const errorMessage = fetchError?.message || ''
      const isNotFound = 
        errorMessage.includes('404') || 
        errorMessage.includes('Not Found') ||
        errorMessage.includes('does not exist')
      
      if (isNotFound) {
        return NextResponse.json(
          {
            error: 'AGGREGATION_REQUEST_NOT_FOUND',
            message: `The ZumRails aggregation request ID "${aggregationRequestId}" was not found. This may happen if:
- The bank verification hasn't been completed yet
- The request ID is incorrect or expired
- The webhook hasn't processed the connection yet

Please ensure the client has completed the bank verification process and wait for the webhook to process.`,
            aggregationRequestId
          },
          { status: 404 }
        )
      }
      
      // Re-throw other errors to be caught by outer catch
      throw fetchError
    }

    // Transform ZumRails response to IBVSummary format
    const ibvSummary = transformZumrailsToIBVSummary(
      rawData,
      aggregationRequestId
    )

    // Update provider_data with fetched information
    // Prioritize aggregation_request_id (set by webhook) over request_id
    const updatedProviderData = createIbvProviderData('zumrails', {
      ...appProviderData,
      aggregation_request_id: aggregationRequestId, // Primary field set by webhook
      request_id: aggregationRequestId, // Also store for compatibility
      account_info: rawData,
      fetched_at: new Date().toISOString()
    })

    // Update loan application with transformed IBVSummary
    const { error: updateError } = await (
      supabase.from('loan_applications') as any
    )
      .update({
        ibv_status: 'verified',
        ibv_provider_data: updatedProviderData,
        ibv_results: ibvSummary, // Store transformed IBVSummary
        ibv_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id)

    if (updateError) {
      console.error(
        '[Fetch Aggregation] Failed to update application:',
        updateError
      )
      return NextResponse.json(
        { error: 'FAILED_TO_UPDATE_APPLICATION', message: updateError.message },
        { status: 500 }
      )
    }

    // Also update IBV request if it exists
    if (ibvRequest) {
      const currentIbvProviderData = ibvProviderData || {}
      const { error: ibvUpdateError } = await (
        supabase.from('loan_application_ibv_requests') as any
      )
        .update({
          status: 'verified' as any,
          results: ibvSummary, // Store transformed IBVSummary
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider_data: {
            ...currentIbvProviderData,
            aggregation_request_id: aggregationRequestId, // Primary field set by webhook
            request_id: aggregationRequestId, // Also store for compatibility
            account_info: rawData,
            fetched_at: new Date().toISOString()
          }
        })
        .eq('id', ibvRequest.id)

      if (ibvUpdateError) {
        console.error(
          '[Fetch Aggregation] Failed to update IBV request:',
          ibvUpdateError
        )
        // Non-fatal - continue
      }
    }

    console.log(
      '[Fetch Aggregation] Successfully fetched ZumRails aggregation data:',
      {
        applicationId,
        aggregationRequestId,
        updated: true
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched ZumRails aggregation data',
      aggregationRequestId,
      applicationId,
      data: ibvSummary,
      updated: true
    })
  } catch (e: any) {
    console.error('[Fetch Aggregation] Error:', e)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: e?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
