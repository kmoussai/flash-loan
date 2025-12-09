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
// Webhook Processors
// ===========================

/**
 * Process User/Customer webhook
 */
export function processUserWebhook(webhook: ZumrailsUserWebhook): {
  shouldUpdate: boolean
  status?: 'verified' | 'failed' | 'cancelled' | 'processing'
} {
  //   const data = webhook.Data
  //   const event = webhook.Event

  return { shouldUpdate: false }
}

/**
 * Process Insights webhook
 * Insights Completed usually indicates verification/data aggregation is complete
 */
export function processInsightsWebhook(webhook: ZumrailsInsightsWebhook): {
  shouldUpdate: boolean
  status?: 'verified' | 'failed' | 'processing'
} {
  const event = webhook.Event

  if (event === 'Completed') {
    // Insights completed - verification/data aggregation is done
    return { shouldUpdate: true, status: 'verified' }
  } else if (event === 'Failed') {
    return { shouldUpdate: true, status: 'failed' }
  }

  return { shouldUpdate: false }
}

/**
 * Process Transaction webhook
 */
export function processTransactionWebhook(
  webhook: ZumrailsTransactionWebhook
): {
  shouldUpdate: boolean
  status?: 'verified' | 'failed'
} {
  // Transaction webhooks might indicate payment/verification status
  //   const data = webhook.Data
  //   const status = data.Status || data.status

  return { shouldUpdate: false }
}

// ===========================
// Main Webhook Processor
// ===========================

export interface ProcessWebhookResult {
  processed: boolean
  applicationId: string | null
  updated: boolean
  message?: string
}

/**
 * Generic webhook processor
 * Routes to appropriate handler based on webhook type
 */
export async function processZumrailsWebhook(
  webhook: ZumrailsWebhook
): Promise<ProcessWebhookResult> {
  // Extract request ID (primary identifier - unique per IBV session)
  const requestId = extractRequestId(webhook)

  if (!requestId) {
    return {
      processed: false,
      applicationId: null,
      updated: false,
      message: 'No request ID found in webhook payload'
    }
  }

  // Find matching loan application by request ID only
  const result = await findLoanApplicationByRequestId(requestId)
  console.log('[Zumrails Webhook] Search by request ID', {
    requestId,
    found: !!result.applicationId
  })

  const { applicationId, application, ibvRequest } = result

  if (!applicationId) {
    return {
      processed: false,
      applicationId: null,
      updated: false,
      message: `No matching application found for request ID: ${requestId}`
    }
  }

  // Route to appropriate processor based on webhook type
  let processResult: {
    shouldUpdate: boolean
    status?: 'verified' | 'failed' | 'cancelled' | 'processing'
  } = { shouldUpdate: false }

  switch (webhook.Type) {
    case 'User':
    case 'Customer':
      processResult = processUserWebhook(webhook as ZumrailsUserWebhook)
      break

    case 'Insights':
      processResult = processInsightsWebhook(webhook as ZumrailsInsightsWebhook)
      break

    case 'Transaction':
      processResult = processTransactionWebhook(
        webhook as ZumrailsTransactionWebhook
      )
      break

    default:
      console.log(
        `[Zumrails Webhook] Unhandled webhook type: ${webhook.Type}`,
        webhook
      )
      return {
        processed: true,
        applicationId,
        updated: false,
        message: `Webhook type ${webhook.Type} received but not processed`
      }
  }

  // Update application if needed
  if (processResult.shouldUpdate && processResult.status) {
    // For Insights "Completed" webhooks, fetch the actual data from Zumrails
    if (
      webhook.Type === 'Insights' &&
      (webhook as ZumrailsInsightsWebhook).Event === 'Completed' &&
      requestId
    ) {
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
        await (supabase.from('loan_applications') as any)
          .update({
            ibv_status: 'verified',
            ibv_provider_data: updatedProviderData,
            ibv_results: ibvSummary, // Store transformed IBVSummary
            ibv_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId)

        // Also update IBV request if it exists
        if (ibvRequest?.id) {
          await (supabase.from('loan_application_ibv_requests') as any)
            .update({
              status: 'verified' as any,
              results: ibvSummary, // Store transformed IBVSummary
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', ibvRequest.id)
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
      processResult.status,
      ibvRequest?.id
    )

    return {
      processed: true,
      applicationId,
      updated: true,
      message: `Application updated with status: ${processResult.status}${
        webhook.Type === 'Insights' &&
        (webhook as ZumrailsInsightsWebhook).Event === 'Completed' &&
        requestId
          ? ' and data fetched from Zumrails API'
          : ''
      }`
    }
  }

  return {
    processed: true,
    applicationId,
    updated: false,
    message: 'Webhook received but no update needed'
  }
}
