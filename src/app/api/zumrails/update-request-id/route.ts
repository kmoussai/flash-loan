// Route: POST /api/zumrails/update-request-id
// Updates the request ID and connection data in provider_data after IBV verification completes
// This allows webhooks to match by request ID (primary identifier)
// Also attempts to fetch data from Zumrails API immediately

import { NextRequest, NextResponse } from 'next/server'
import { updateIbvRequestId } from '@/src/lib/ibv/zumrails-webhook'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { fetchZumrailsDataByRequestId } from '@/src/lib/ibv/zumrails-server'
import { transformZumrailsToIBVSummary } from '@/src/lib/ibv/zumrails-transform'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, requestId, cardId, userId } = body

    if (!applicationId || !requestId) {
      return NextResponse.json(
        { error: 'applicationId and requestId are required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // Get current provider_data
    const { data: application } = await supabase
      .from('loan_applications')
      .select('id, ibv_provider_data')
      .eq('id', applicationId)
      .eq('ibv_provider', 'zumrails')
      .single()

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Update provider_data with all connection data from CONNECTIONSUCCESSFULLYCOMPLETED
    const currentProviderData = ((application as any).ibv_provider_data as any) || {}
    
    // Use createIbvProviderData helper to normalize the data
    const updatedProviderData = createIbvProviderData('zumrails', {
      ...currentProviderData,
      requestId, // Primary identifier for webhook matching
      request_id: requestId, // Store as request_id
      cardId, // cardid from response
      card_id: cardId,
      userId, // userid from response
      user_id: userId,
      customerId: userId, // userid can be used as customerId
      customer_id: userId,
      token: requestId, // token maps to requestId
      connected_at: new Date().toISOString(),
      verified_at: new Date().toISOString()
    })

    // Update loan application
    await (supabase.from('loan_applications') as any)
      .update({
        ibv_provider_data: updatedProviderData,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    // Also update IBV request if it exists
    const { data: ibvRequest } = await supabase
      .from('loan_application_ibv_requests')
      .select('id, provider_data')
      .eq('loan_application_id', applicationId)
      .eq('provider', 'zumrails')
      .maybeSingle()

    if (ibvRequest && (ibvRequest as any).id) {
      await (supabase.from('loan_application_ibv_requests') as any)
        .update({
          provider_data: updatedProviderData,
          status: 'verified' as any,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', (ibvRequest as any).id)
    }

    console.log('[Zumrails] Updated connection data', {
      applicationId,
      requestId,
      cardId,
      userId
    })

    // Try to fetch data from Zumrails API immediately
    // This ensures data is available when webhook arrives
    let fetchedData: any = null
    let ibvSummary: any = null
    let fetchError: any = null

    try {
      console.log('[Zumrails] Attempting to fetch data from Zumrails API', {
        requestId,
        applicationId
      })

      fetchedData = await fetchZumrailsDataByRequestId(requestId)
      
      if (fetchedData) {
        // Transform Zumrails response to IBVSummary format
        ibvSummary = transformZumrailsToIBVSummary(fetchedData, requestId)

        // Update provider_data with fetched information
        const finalProviderData = createIbvProviderData('zumrails', {
          ...updatedProviderData,
          account_info: fetchedData,
          fetched_at: new Date().toISOString()
        })

        // Update loan application with fetched data
        await (supabase.from('loan_applications') as any)
          .update({
            ibv_status: 'verified',
            ibv_provider_data: finalProviderData,
            ibv_results: ibvSummary, // Store transformed summary
            ibv_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId)

        // Also update IBV request if it exists
        if (ibvRequest && (ibvRequest as any).id) {
          await (supabase.from('loan_application_ibv_requests') as any)
            .update({
              provider_data: finalProviderData,
              status: 'verified' as any,
              results: ibvSummary, // Store transformed summary
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', (ibvRequest as any).id)
        }

        console.log('[Zumrails] Successfully fetched and stored data', {
          applicationId,
          requestId,
          hasAccounts: ibvSummary?.accounts?.length || 0
        })
      }
    } catch (error: any) {
      // Don't fail the request if fetch fails - data might not be ready yet
      // Webhook will handle fetching when data becomes available
      fetchError = error
      console.warn('[Zumrails] Failed to fetch data immediately (this is OK, webhook will retry)', {
        requestId,
        applicationId,
        error: error?.message || error
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Request ID and connection data updated successfully',
      dataFetched: !!fetchedData,
      fetchError: fetchError ? fetchError.message : null
    })
  } catch (error: any) {
    console.error('[Zumrails Update Request ID] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

