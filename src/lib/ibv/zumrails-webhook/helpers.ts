/**
 * Shared helper functions for Zumrails webhooks
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import type { ZumrailsWebhook, ZumrailsInsightsWebhook } from './types'

/**
 * Extract request ID from webhook payload (primary identifier for matching)
 */
export function extractRequestId(payload: ZumrailsWebhook): string | null {
  const data = payload.Data

  // Insights webhook has RequestId
  if (payload.Type === 'Insights') {
    return (payload as ZumrailsInsightsWebhook).Data.RequestId || null
  }

  // Check for request ID in various fields across all webhook types
  return (
    data.RequestId ||
    data.requestId ||
    data.request_id ||
    data.RequestID ||
    null
  )
}

/**
 * Extract customer/user ID from webhook payload based on Type
 */
export function extractCustomerId(payload: ZumrailsWebhook): string | null {
  const data = payload.Data

  // Insights webhook has CustomerId directly
  if (payload.Type === 'Insights') {
    return (payload as ZumrailsInsightsWebhook).Data.CustomerId || null
  }

  // User/Customer webhooks
  if (payload.Type === 'User' || payload.Type === 'Customer') {
    return (
      data.UserId ||
      data.CustomerId ||
      data.customerId ||
      data.customer_id ||
      data.Id ||
      null
    )
  }

  // Transaction webhooks
  if (payload.Type === 'Transaction') {
    return data.UserId || data.CustomerId || data.customerId || null
  }

  // Generic fallback
  return (
    data.UserId ||
    data.CustomerId ||
    data.customerId ||
    data.customer_id ||
    data.Id ||
    null
  )
}

/**
 * Find loan application by request ID (primary method - request ID is unique per IBV session)
 */
export async function findLoanApplicationByRequestId(
  requestId: string
): Promise<{
  applicationId: string | null
  application: any | null
  ibvRequest: any | null
}> {
  const supabase = createServerSupabaseAdminClient()

  let ibvRequest: any = null
  let applicationId: string | null = null

  const { data: ibvRequestByRequestId, error: ibvError1 } = await (
    supabase as any
  )
    .from('loan_application_ibv_requests')
    .select('id, loan_application_id, status, provider_data')
    .eq('provider', 'zumrails')
    .eq('provider_data->>request_id', requestId)
    .maybeSingle()

  console.log('[Zumrails Webhook] IBV request by request ID', {
    ibvRequestByRequestId,
    ibvError1
  })

  if (!ibvError1 && ibvRequestByRequestId) {
    ibvRequest = ibvRequestByRequestId
    applicationId = ibvRequestByRequestId.loan_application_id
  }

  let application: any = null
  if (applicationId) {
    const { data: app, error: appFetchError } = await supabase
      .from('loan_applications')
      .select('id, ibv_provider_data, ibv_status')
      .eq('id', applicationId)
      .single()

    if (!appFetchError) {
      application = app
    }

    if (!ibvRequest) {
      const { data: ibvReq } = await supabase
        .from('loan_application_ibv_requests')
        .select('id, loan_application_id, status, provider_data')
        .eq('loan_application_id', applicationId)
        .eq('provider', 'zumrails')
        .maybeSingle()

      if (ibvReq) {
        ibvRequest = ibvReq
      }
    }
  }

  return {
    applicationId,
    application,
    ibvRequest
  }
}

/**
 * Find loan application by customer ID (for User/Transaction webhooks)
 * Searches in provider_data for customerId
 */
export async function findLoanApplicationByCustomerId(
  customerId: string
): Promise<{
  applicationId: string | null
  application: any | null
  ibvRequest: any | null
}> {
  const supabase = createServerSupabaseAdminClient()

  let applicationId: string | null = null
  let application: any = null
  let ibvRequest: any = null

  const { data: applications, error: appError } = await (supabase as any)
    .from('loan_applications')
    .select('id, ibv_provider_data, ibv_status')
    .eq('ibv_provider', 'zumrails')
    .or(
      `ibv_provider_data->>customerId.eq.${customerId},ibv_provider_data->>customer_id.eq.${customerId},ibv_provider_data->>CustomerId.eq.${customerId}`
    )
    .order('created_at', { ascending: false })
    .limit(1)

  if (!appError && applications && applications.length > 0) {
    application = applications[0]
    applicationId = application.id

    if (applicationId) {
      const { data: ibvReq } = await supabase
        .from('loan_application_ibv_requests')
        .select('id, loan_application_id, status, provider_data')
        .eq('loan_application_id', applicationId)
        .eq('provider', 'zumrails')
        .maybeSingle()

      if (ibvReq) {
        ibvRequest = ibvReq
      }
    }
  }

  return {
    applicationId,
    application,
    ibvRequest
  }
}

/**
 * Update IBV request/provider data with request ID after IBV completes
 */
export async function updateIbvRequestId(
  applicationId: string,
  requestId: string
): Promise<boolean> {
  const supabase = createServerSupabaseAdminClient()

  try {
    const { data: application, error: appError } = await supabase
      .from('loan_applications')
      .select('id, ibv_provider_data')
      .eq('id', applicationId)
      .eq('ibv_provider', 'zumrails')
      .single()

    if (appError || !application) {
      console.warn('[Zumrails] Application not found for request ID update', {
        applicationId,
        error: appError
      })
      return false
    }

    const currentProviderData =
      ((application as any).ibv_provider_data as any) || {}

    const updatedProviderData = {
      ...currentProviderData,
      request_id: requestId,
      ...(currentProviderData.token && { token: requestId })
    }

    await (supabase.from('loan_applications') as any)
      .update({
        ibv_provider_data: updatedProviderData,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    const { data: ibvRequest, error: ibvError } = await supabase
      .from('loan_application_ibv_requests')
      .select('id, provider_data')
      .eq('loan_application_id', applicationId)
      .eq('provider', 'zumrails')
      .maybeSingle()

    if (!ibvError && ibvRequest && (ibvRequest as any).id) {
      const currentIbvProviderData =
        ((ibvRequest as any).provider_data as any) || {}
      const updatedIbvProviderData = {
        ...currentIbvProviderData,
        request_id: requestId
      }

      await (supabase.from('loan_application_ibv_requests') as any)
        .update({
          provider_data: updatedIbvProviderData,
          updated_at: new Date().toISOString()
        })
        .eq('id', (ibvRequest as any).id)
    }

    console.log('[Zumrails] Updated request ID', {
      applicationId,
      requestId
    })

    return true
  } catch (error) {
    console.error('[Zumrails] Failed to update request ID', error)
    return false
  }
}

/**
 * Update loan application IBV status
 */
export async function updateLoanApplicationIBVStatus(
  applicationId: string,
  status: 'verified' | 'failed' | 'cancelled' | 'processing' | 'pending',
  ibvRequestId?: string
): Promise<void> {
  const supabase = createServerSupabaseAdminClient()

  const updateData: any = {
    ibv_status: status,
    updated_at: new Date().toISOString()
  }

  if (status === 'verified') {
    updateData.ibv_verified_at = new Date().toISOString()
  }

  await (supabase.from('loan_applications') as any)
    .update(updateData)
    .eq('id', applicationId)

  if (ibvRequestId) {
    await (supabase.from('loan_application_ibv_requests') as any)
      .update({
        status: status as any,
        completed_at: status === 'verified' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', ibvRequestId)
  }
}
