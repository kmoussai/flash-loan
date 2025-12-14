/**
 * Generic Zumrails Webhook Handler
 * Handles all Zumrails webhook types and events
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'
import { fetchZumrailsDataByRequestId } from '@/src/lib/ibv/zumrails-server'
import { transformZumrailsToIBVSummary } from '@/src/lib/ibv/zumrails-transform'

// ===========================
// Type Definitions
// ===========================

export interface ZumrailsWebhookBase {
  Type: string
  Event: string
  EventGeneratedAt?: string
  Data: Record<string, any>
}

export interface ZumrailsUserWebhook extends ZumrailsWebhookBase {
  Type: 'User' | 'Customer'
  Event: 'Created' | 'Updated' | 'StatusChange'
  Data: {
    UserId?: string
    CustomerId?: string
    Id?: string
    Status?: string
    status?: string
    VerificationStatus?: string
    verificationStatus?: string
    ConnectionStatus?: string
    connectionStatus?: string
    PaymentProfiles?: any[]
    paymentProfiles?: any[]
    ConnectedAccount?: boolean
    connectedAccount?: boolean
    HasConnectedAccount?: boolean
    IsVerified?: boolean
    isVerified?: boolean
    [key: string]: any
  }
}

export interface ZumrailsInsightsWebhook extends ZumrailsWebhookBase {
  Type: 'Insights'
  Event: 'Completed' | 'Failed'
  Data: {
    CustomerId: string
    RequestId?: string
    CreatedAt?: string
    UserId?: string
    ClientUserId?: string | null
    [key: string]: any
  }
}

export interface ZumrailsTransactionWebhook extends ZumrailsWebhookBase {
  Type: 'Transaction'
  Event: 'Created' | 'Updated' | 'StatusChange'
  Data: {
    UserId?: string
    CustomerId?: string
    TransactionId?: string
    Status?: string
    [key: string]: any
  }
}

export type ZumrailsWebhook =
  | ZumrailsUserWebhook
  | ZumrailsInsightsWebhook
  | ZumrailsTransactionWebhook
  | ZumrailsWebhookBase

// ===========================
// Helper Functions
// ===========================

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

  // First, try to find in IBV requests table by request_id in provider_data using JSONB filter
  // Try different field name variations (request_id, requestId, token)
  let ibvRequest: any = null
  let applicationId: string | null = null

  // Query using JSONB contains filter for request_id
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

  // Get full application data if we have an ID
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

    // Also get IBV request if we don't have it yet
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

  // Search in loan_applications by customerId in provider_data
  // Try different field name variations
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

    // Get IBV request if it exists (only if we have an applicationId)
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
 * This should be called when IBV verification completes to store the request ID
 * The request ID is used to match webhook events (especially Insights webhooks)
 */
export async function updateIbvRequestId(
  applicationId: string,
  requestId: string
): Promise<boolean> {
  const supabase = createServerSupabaseAdminClient()

  try {
    // Get current provider_data
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

    // Update provider_data with request_id
    const updatedProviderData = {
      ...currentProviderData,
      request_id: requestId,
      // Also ensure token matches request_id if it exists
      ...(currentProviderData.token && { token: requestId })
    }

    // Update loan application
    await (supabase.from('loan_applications') as any)
      .update({
        ibv_provider_data: updatedProviderData,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    // Also update IBV request if it exists
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

  // Update loan application
  await (supabase.from('loan_applications') as any)
    .update(updateData)
    .eq('id', applicationId)

  // Also update IBV request if it exists
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

// ===========================
// Webhook Type-Specific Handlers
// ===========================

/**
 * Handle User/Customer webhook
 * TODO: Implementation needed
 */
async function handleUserWebhook(
  webhook: ZumrailsUserWebhook
): Promise<ProcessWebhookResult> {
  // TODO: Implement User/Customer webhook handling
  console.log('[Zumrails Webhook] User webhook received (not implemented)', {
    type: webhook.Type,
    event: webhook.Event
  })

  return {
    processed: true,
    applicationId: null,
    updated: false,
    message: 'User webhook received but handler not yet implemented'
  }
}

/**
 * Handle Insights webhook
 * Insights webhooks indicate completion/failure of data aggregation
 */
async function handleInsightsWebhook(
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

  // Find application by request ID
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

  // Determine status based on event
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

  // For Insights "Completed" webhooks, fetch the actual data from Zumrails
  if (event === 'Completed' && requestId) {
    try {
      console.log(
        '[Zumrails Webhook] Fetching data from Zumrails API for request ID',
        requestId
      )

      // Fetch data from Zumrails API
      const fetchedData = await fetchZumrailsDataByRequestId(requestId)

      // Transform Zumrails response to IBVSummary format
      const ibvSummary = transformZumrailsToIBVSummary(fetchedData, requestId)

      // Update application with fetched data
      const supabase = createServerSupabaseAdminClient()
      const currentProviderData =
        (application?.ibv_provider_data as any) || {}

      // Update provider_data with fetched information
      const updatedProviderData = createIbvProviderData('zumrails', {
        ...currentProviderData,
        request_id: requestId,
        account_info: fetchedData,
        fetched_at: new Date().toISOString()
      })

      // Update loan application with fetched data
      // Store both raw data and transformed IBVSummary
      const { error: updateError } = await (supabase.from('loan_applications') as any)
        .update({
          ibv_status: 'verified',
          ibv_provider_data: updatedProviderData,
          ibv_results: ibvSummary, // Store transformed IBVSummary
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

      // Also update IBV request if it exists
      if (ibvRequest?.id) {
        const { error: ibvUpdateError } = await (
          supabase.from('loan_application_ibv_requests') as any
        )
          .update({
            status: 'verified' as any,
            results: ibvSummary, // Store transformed IBVSummary
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
      // Continue with status update even if fetch fails
      // The status will still be updated to 'verified'
    }
  }

  // Update application status
  await updateLoanApplicationIBVStatus(
    applicationId,
    status,
    ibvRequest?.id
  )

  return {
    processed: true,
    applicationId,
    updated: true,
    message: `Application updated with status: ${status}${
      event === 'Completed' && requestId
        ? ' and data fetched from Zumrails API'
        : ''
    }`
  }
}

/**
 * Handle Transaction webhook
 * TODO: Implementation needed
 */
async function handleTransactionWebhook(
  webhook: ZumrailsTransactionWebhook
): Promise<ProcessWebhookResult> {
  // TODO: Implement Transaction webhook handling
  console.log('[Zumrails Webhook] Transaction webhook received (not implemented)', {
    type: webhook.Type,
    event: webhook.Event, webhook
  })

  return {
    processed: true,
    applicationId: null,
    updated: false,
    message: 'Transaction webhook received but handler not yet implemented'
  }
}

// ===========================
// Main Webhook Processor
// ===========================

export interface ProcessWebhookResult {
  processed: boolean
  applicationId: string | null
  updated: boolean
  message?: string
  shouldRetry?: boolean // Indicates if webhook should be retried (for timing issues)
}

/**
 * Main webhook dispatcher
 * Routes webhooks to type-specific handlers based on webhook type
 * Each handler is responsible for its own ID extraction and application lookup
 */
export async function processZumrailsWebhook(
  webhook: ZumrailsWebhook
): Promise<ProcessWebhookResult> {
  console.log('[Zumrails Webhook] Dispatching webhook', {
    type: webhook.Type,
    event: webhook.Event,
    eventGeneratedAt: webhook.EventGeneratedAt
  })

  // Route to appropriate handler based on webhook type
  // Each handler handles its own ID extraction and application lookup
  switch (webhook.Type) {
    case 'User':
    case 'Customer':
      return handleUserWebhook(webhook as ZumrailsUserWebhook)

    case 'Insights':
      return handleInsightsWebhook(webhook as ZumrailsInsightsWebhook)

    case 'Transaction':
      return handleTransactionWebhook(webhook as ZumrailsTransactionWebhook)

    default:
      console.log(
        `[Zumrails Webhook] Unhandled webhook type: ${webhook.Type}`,
        webhook
      )
      return {
        processed: true,
        applicationId: null,
        updated: false,
        message: `Webhook type ${webhook.Type} received but not processed`
      }
  }
}
