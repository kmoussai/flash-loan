/**
 * Handler for Zumrails User/Customer webhooks
 * Handles User Connected events to fetch IBV data
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'
import { fetchZumrailsDataByRequestId } from '@/src/lib/ibv/zumrails-server'
import { transformZumrailsToIBVSummary } from '@/src/lib/ibv/zumrails-transform'
import type { ZumrailsUserWebhook, ProcessWebhookResult } from './types'
import { updateLoanApplicationIBVStatus } from './helpers'

export async function handleUserWebhook(
  webhook: ZumrailsUserWebhook
): Promise<ProcessWebhookResult> {
  const event = webhook.Event
  const data = webhook.Data

  // Only process 'Connected' events for IBV data fetching
  if (event !== 'Connected') {
    console.log('[Zumrails Webhook] User webhook event not for IBV fetching', {
      event,
      type: webhook.Type,
      webhook
    })
    return {
      processed: true,
      applicationId: null,
      updated: false,
      message: `User webhook event '${event}' does not require IBV data fetching`
    }
  }

  // Extract fields from webhook
  // User Connected webhook structure:
  // - Id: Zum Rails userId (the user ID in Zum Rails system)
  // - ClientUserId: Our local user/application ID
  // - ExtraField1: application_id
  // - ExtraField2: loan_application_ibv_request id
  // - AggregationRequestId: Request ID for fetching IBV data
  const aggregationRequestId = data.AggregationRequestId
  const clientUserId = data.ClientUserId
  const extraField1 = data.ExtraField1
  const extraField2 = data.ExtraField2
  const zumrailsUserId = data.Id

  console.log('[Zumrails Webhook] User Connected webhook received', {
    aggregationRequestId,
    clientUserId,
    extraField1,
    extraField2,
    zumrailsUserId,
    event
  })

  if (!aggregationRequestId) {
    return {
      processed: false,
      applicationId: null,
      updated: false,
      message: 'No AggregationRequestId found in User Connected webhook'
    }
  }

  const supabase = createServerSupabaseAdminClient()
  let applicationId: string | null = null
  let ibvRequestId: string | null = null

  // Method 1: Use ExtraField2 (ibv_request id) for quick matching
  if (extraField2) {
    const { data: ibvRequest, error: ibvError } = await (supabase as any)
      .from('loan_application_ibv_requests')
      .select('id, loan_application_id')
      .eq('id', extraField2)
      .eq('provider', 'zumrails')
      .maybeSingle()

    if (!ibvError && ibvRequest) {
      ibvRequestId = ibvRequest.id
      applicationId = ibvRequest.loan_application_id
      console.log('[Zumrails Webhook] Found application via ExtraField2', {
        ibvRequestId,
        applicationId
      })
    }
  }

  // Method 2: Use ExtraField1 (application_id) if ExtraField2 didn't work
  if (!applicationId && extraField1) {
    applicationId = extraField1
    console.log('[Zumrails Webhook] Using ExtraField1 as application_id', {
      applicationId
    })

    // Try to find IBV request for this application
    if (applicationId) {
      const { data: ibvRequest } = await (supabase as any)
        .from('loan_application_ibv_requests')
        .select('id')
        .eq('loan_application_id', applicationId)
        .eq('provider', 'zumrails')
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ibvRequest) {
        ibvRequestId = ibvRequest.id
      }
    }
  }

  // Method 3: Use ClientUserId to find application
  if (!applicationId && clientUserId) {
    // Try to find application by clientUserId (if it was stored as application_id)
    const { data: application } = await (supabase as any)
      .from('loan_applications')
      .select('id')
      .eq('id', clientUserId)
      .maybeSingle()

    if (application) {
      applicationId = application.id
      console.log('[Zumrails Webhook] Found application via ClientUserId', {
        applicationId
      })
    }
  }

  if (!applicationId) {
    console.log(
      '[Zumrails Webhook] No matching application found for User Connected webhook',
      {
        aggregationRequestId,
        clientUserId,
        extraField1,
        extraField2
      }
    )
    return {
      processed: false,
      applicationId: null,
      updated: false,
      shouldRetry: true,
      message: `No matching application found. AggregationRequestId: ${aggregationRequestId}, ClientUserId: ${clientUserId}, ExtraField1: ${extraField1}, ExtraField2: ${extraField2}`
    }
  }

  // Fetch application details (including client_id for payment_provider_data)
  const { data: application, error: appError } = await (supabase as any)
    .from('loan_applications')
    .select('id, client_id, ibv_provider_data, ibv_status')
    .eq('id', applicationId)
    .single()

  if (appError || !application) {
    console.error('[Zumrails Webhook] Failed to fetch application', appError)
    return {
      processed: false,
      applicationId,
      updated: false,
      message: 'Failed to fetch application details'
    }
  }

  const appData = application as any

  // Fetch IBV data from Zumrails API using AggregationRequestId
  try {
    console.log('[Zumrails Webhook] Fetching IBV data from Zumrails API', {
      aggregationRequestId,
      applicationId
    })

    const fetchedData = await fetchZumrailsDataByRequestId(aggregationRequestId)
    const ibvSummary = transformZumrailsToIBVSummary(
      fetchedData,
      aggregationRequestId
    )

    const currentProviderData = (appData.ibv_provider_data as any) || {}

    // Update provider_data with fetched information
    const updatedProviderData = createIbvProviderData('zumrails', {
      ...currentProviderData,
      // Store AggregationRequestId for future use
      aggregation_request_id: aggregationRequestId,
      request_id: aggregationRequestId, // Also store as request_id for compatibility
      account_info: fetchedData,
      fetched_at: new Date().toISOString(),
      // Store webhook fields for reference
      client_user_id: clientUserId,
      extra_field1: extraField1,
      extra_field2: extraField2
    })

    // Update loan application
    const { error: updateError } = await (
      supabase.from('loan_applications') as any
    )
      .update({
        ibv_status: 'verified',
        ibv_provider_data: updatedProviderData,
        ibv_results: ibvSummary,
        ibv_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error(
        '[Zumrails Webhook] Failed to update application with fetched data',
        updateError
      )
      throw updateError
    }

    // Update IBV request if we have the ID
    if (ibvRequestId) {
      // Get current provider_data from IBV request to preserve existing data
      const { data: currentIbvRequest } = await (supabase as any)
        .from('loan_application_ibv_requests')
        .select('provider_data')
        .eq('id', ibvRequestId)
        .single()

      const currentIbvProviderData =
        (currentIbvRequest?.provider_data as any) || {}

      const { error: ibvUpdateError } = await (
        supabase.from('loan_application_ibv_requests') as any
      )
        .update({
          status: 'verified' as any,
          results: ibvSummary,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider_data: {
            ...currentIbvProviderData,
            // Store AggregationRequestId for future use
            aggregation_request_id: aggregationRequestId,
            request_id: aggregationRequestId, // Also store as request_id for compatibility
            account_info: fetchedData,
            fetched_at: new Date().toISOString(),
            // Store webhook fields for reference
            client_user_id: clientUserId,
            extra_field1: extraField1,
            extra_field2: extraField2
          }
        })
        .eq('id', ibvRequestId)

      if (ibvUpdateError) {
        console.error(
          '[Zumrails Webhook] Failed to update IBV request',
          ibvUpdateError
        )
      } else {
        console.log(
          '[Zumrails Webhook] Updated IBV request with AggregationRequestId',
          {
            ibvRequestId,
            aggregationRequestId
          }
        )
      }
    }

    // Update IBV status
    await updateLoanApplicationIBVStatus(
      applicationId,
      'verified',
      ibvRequestId || undefined
    )

    // Save Zum Rails userId to payment_provider_data if available
    if (zumrailsUserId && appData.client_id) {
      try {
        const clientId = appData.client_id

        // Get existing payment provider data to merge
        const { data: existingData } = await (supabase as any)
          .from('payment_provider_data')
          .select('provider_data')
          .eq('client_id', clientId)
          .eq('provider', 'zumrails')
          .maybeSingle()

        const mergedProviderData = {
          ...(existingData?.provider_data || {}),
          userId: zumrailsUserId,
          ...(aggregationRequestId && { requestId: aggregationRequestId })
        }

        await (supabase as any).from('payment_provider_data').upsert(
          {
            client_id: clientId,
            provider: 'zumrails',
            provider_data: mergedProviderData,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'client_id,provider'
          }
        )

        console.log(
          '[Zumrails Webhook] Saved Zum Rails userId to payment_provider_data',
          {
            userId: zumrailsUserId,
            clientId,
            applicationId
          }
        )
      } catch (error: any) {
        // Don't fail the webhook if saving userId fails - log and continue
        console.warn(
          '[Zumrails Webhook] Failed to save userId to payment_provider_data',
          {
            error: error?.message || error,
            userId: zumrailsUserId,
            applicationId
          }
        )
      }
    }

    console.log(
      '[Zumrails Webhook] Successfully fetched and updated IBV data',
      {
        applicationId,
        aggregationRequestId,
        ibvRequestId,
        zumrailsUserId
      }
    )

    return {
      processed: true,
      applicationId,
      updated: true,
      message: `IBV data fetched and updated successfully using AggregationRequestId: ${aggregationRequestId}`
    }
  } catch (error: any) {
    console.error(
      '[Zumrails Webhook] Failed to fetch IBV data from Zumrails API',
      error
    )

    // Update status to failed if we have application
    if (applicationId) {
      await updateLoanApplicationIBVStatus(
        applicationId,
        'failed',
        ibvRequestId || undefined
      )
    }

    return {
      processed: true,
      applicationId,
      updated: false,
      message: `Failed to fetch IBV data: ${error.message || 'Unknown error'}`
    }
  }
}
