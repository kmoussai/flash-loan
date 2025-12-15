/**
 * Handler for Zumrails Insights webhooks
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'
import { fetchZumrailsDataByRequestId } from '@/src/lib/ibv/zumrails-server'
import { transformZumrailsToIBVSummary } from '@/src/lib/ibv/zumrails-transform'
import type { ZumrailsInsightsWebhook, ProcessWebhookResult } from './types'
import { findLoanApplicationByRequestId, updateLoanApplicationIBVStatus } from './helpers'

export async function handleInsightsWebhook(
  webhook: ZumrailsInsightsWebhook
): Promise<ProcessWebhookResult> {
  const event = webhook.Event
  const requestId = webhook.Data.RequestId

  if (!requestId) {
    return {
      processed: false,
      applicationId: null,
      updated: false,
      message: 'No request ID found in Insights webhook payload'
    }
  }

  const result = await findLoanApplicationByRequestId(requestId)
  console.log('[Zumrails Webhook] Insights webhook - search by request ID', {
    requestId,
    found: !!result.applicationId
  })

  const { applicationId, application, ibvRequest } = result

  if (!applicationId) {
    console.log(
      '[Zumrails Webhook] No matching application found - likely timing issue',
      {
        requestId,
        message:
          'Request ID not yet stored in database. This may be a timing issue - webhook arrived before frontend updated the request ID.'
      }
    )

    return {
      processed: false,
      applicationId: null,
      updated: false,
      shouldRetry: true,
      message: `No matching application found for request ID: ${requestId}. This may be a timing issue - webhook may have arrived before request ID was stored.`
    }
  }

  let status: 'verified' | 'failed' | 'processing' | undefined
  if (event === 'Completed') {
    status = 'verified'
  } else if (event === 'Failed') {
    status = 'failed'
  }

  if (!status) {
    return {
      processed: true,
      applicationId,
      updated: false,
      message: `Insights webhook event '${event}' received but no status update needed`
    }
  }

  if (event === 'Completed' && requestId) {
    try {
      console.log(
        '[Zumrails Webhook] Fetching data from Zumrails API for request ID',
        requestId
      )

      const fetchedData = await fetchZumrailsDataByRequestId(requestId)
      const ibvSummary = transformZumrailsToIBVSummary(fetchedData, requestId)

      const supabase = createServerSupabaseAdminClient()
      const currentProviderData =
        (application?.ibv_provider_data as any) || {}

      const updatedProviderData = createIbvProviderData('zumrails', {
        ...currentProviderData,
        request_id: requestId,
        account_info: fetchedData,
        fetched_at: new Date().toISOString()
      })

      const { error: updateError } = await (supabase.from('loan_applications') as any)
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

      if (ibvRequest?.id) {
        const { error: ibvUpdateError } = await (
          supabase.from('loan_application_ibv_requests') as any
        )
          .update({
            status: 'verified' as any,
            results: ibvSummary,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', ibvRequest.id)

        if (ibvUpdateError) {
          console.error(
            '[Zumrails Webhook] Failed to update IBV request',
            ibvUpdateError
          )
        }
      }

      console.log(
        '[Zumrails Webhook] Successfully fetched and updated data',
        {
          applicationId,
          requestId
        }
      )
    } catch (error: any) {
      console.error(
        '[Zumrails Webhook] Failed to fetch data from Zumrails API',
        error
      )
    }
  }

  await updateLoanApplicationIBVStatus(
    applicationId,
    status,
    ibvRequest?.id
  )

  return {
    processed: true,
    applicationId,
    updated: true,
    message: `Application updated with status: ${status}$${
      event === 'Completed' && requestId
        ? ' and data fetched from Zumrails API'
        : ''
    }`
  }
}
