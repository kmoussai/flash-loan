/**
 * Generic Zumrails Webhook Handler
 * Handles all Zumrails webhook types and events
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

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
 * Find loan application by customer ID
 */
export async function findLoanApplicationByCustomerId(
  customerId: string
): Promise<{
  applicationId: string | null
  application: any | null
  ibvRequest: any | null
}> {
  const supabase = createServerSupabaseAdminClient()

  // First, try to find in IBV requests table
  const { data: ibvRequests, error: ibvError } = await supabase
    .from('loan_application_ibv_requests')
    .select('id, loan_application_id, status, provider_data')
    .eq('provider', 'zumrails')
    .not('provider_data', 'is', null)

  let ibvRequest: any = null
  let applicationId: string | null = null

  if (!ibvError && ibvRequests) {
    ibvRequest = ibvRequests.find((req: any) => {
      const providerData = req.provider_data as any
      return (
        providerData?.customerId === customerId ||
        providerData?.customer_id === customerId ||
        providerData?.userid === customerId
      )
    })

    if (ibvRequest) {
      applicationId = ibvRequest.loan_application_id
    }
  }

  // If not found in IBV requests, search loan_applications
  if (!applicationId) {
    const { data: applications } = await supabase
      .from('loan_applications')
      .select('id, ibv_provider_data, ibv_status')
      .eq('ibv_provider', 'zumrails')
      .not('ibv_provider_data', 'is', null)

    const matching = (applications as any[])?.find((app: any) => {
      const providerData = app.ibv_provider_data as any
      return (
        providerData?.customerId === customerId ||
        providerData?.customer_id === customerId ||
        providerData?.userid === customerId
      )
    })

    if (matching) {
      applicationId = matching.id
    }
  }

  // Get full application data if we have an ID
  let application: any = null
  if (applicationId) {
    const { data: app } = await supabase
      .from('loan_applications')
      .select('id, ibv_provider_data, ibv_status')
      .eq('id', applicationId)
      .single()

    application = app
  }

  return {
    applicationId,
    application,
    ibvRequest
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
  // Extract customer ID
  const customerId = extractCustomerId(webhook)

  if (!customerId) {
    return {
      processed: false,
      applicationId: null,
      updated: false,
      message: 'No customer ID found in webhook payload'
    }
  }

  // Find matching loan application
  const { applicationId, application, ibvRequest } =
    await findLoanApplicationByCustomerId(customerId)

  if (!applicationId) {
    return {
      processed: false,
      applicationId: null,
      updated: false,
      message: `No matching application found for customer ID: ${customerId}`
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
    await updateLoanApplicationIBVStatus(
      applicationId,
      processResult.status,
      ibvRequest?.id
    )

    return {
      processed: true,
      applicationId,
      updated: true,
      message: `Application updated with status: ${processResult.status}`
    }
  }

  return {
    processed: true,
    applicationId,
    updated: false,
    message: 'Webhook received but no update needed'
  }
}
