// Route: POST /api/inverite/webhook
// Receives webhook notifications from Inverite when bank verification is completed
// Automatically updates loan application with account information

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

/**
 * Verify webhook signature to ensure request is from Inverite
 * Uses HMAC-SHA256 with the API key as the secret
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  apiKey: string
): boolean {
  if (!signature || !apiKey) {
    return false
  }

  try {
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(body, 'utf8')
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    // Normalize signatures (URL-safe base64)
    const normalizedReceived = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    const normalizedExpected = expectedSignature

    // Compare signatures using constant-time comparison to prevent timing attacks
    // Both must be same length for timingSafeEqual
    if (normalizedReceived.length !== normalizedExpected.length) {
      return false
    }

    // Convert to Uint8Array for timingSafeEqual
    const receivedBytes = new Uint8Array(Buffer.from(normalizedReceived))
    const expectedBytes = new Uint8Array(Buffer.from(normalizedExpected))
    
    return crypto.timingSafeEqual(receivedBytes, expectedBytes)
  } catch (error) {
    console.error('[Inverite Webhook] Signature verification error:', error)
    return false
  }
}

/**
 * Find loan application by request_guid from ibvProviderData
 */
async function findApplicationByRequestGuid(requestGuid: string) {
  const supabase = createServerSupabaseAdminClient()

  // Get all loan applications and filter by ibvProviderData containing the request_guid
  // Note: This is a JSONB query, so we use Postgres JSON operators
  const { data, error } = await supabase
    .from('loan_applications')
    .select('id, ibv_provider_data, client_id')
    .eq('ibv_provider', 'inverite')
    .not('ibv_provider_data', 'is', null)

  if (error) {
    console.error('[Inverite Webhook] Error fetching applications:', error)
    return null
  }

  // Find the application with matching request_guid
  for (const app of (data || []) as any[]) {
    const providerData = app?.ibv_provider_data as any
    if (providerData?.request_guid === requestGuid) {
      return app as { id: string; ibv_provider_data: any; client_id: string }
    }
  }

  return null
}

/**
 * Update loan application with account information from webhook
 */
async function updateApplicationWithAccountData(
  applicationId: string,
  webhookData: any
) {
  const supabase = createServerSupabaseAdminClient()

  // Get current IBV provider data
  const { data: currentApp, error: fetchError } = await supabase
    .from('loan_applications')
    .select('ibv_provider_data')
    .eq('id', applicationId)
    .single()

  if (fetchError || !currentApp) {
    console.error('[Inverite Webhook] Error fetching application:', fetchError)
    return false
  }

  // Merge new account data into existing provider data
  const currentAppData = currentApp as any
  const currentProviderData = (currentAppData?.ibv_provider_data as any) || {}
  
  // Extract request_guid from webhook data
  const responseRequestGuid = webhookData.request || webhookData.request_guid || webhookData.request_GUID || webhookData.guid

  // Store all Inverite webhook data in structured format
  const updatedProviderData = {
    // Keep existing request_guid and verified_at
    request_guid: currentProviderData.request_guid || responseRequestGuid,
    verified_at: currentProviderData.verified_at || webhookData.complete_datetime || new Date().toISOString(),
    
    // Store raw Inverite response for reference
    raw_data: webhookData,
    
    // Store all Inverite response fields
    name: webhookData.name || null,
    complete_datetime: webhookData.complete_datetime || null,
    referenceid: webhookData.referenceid || null,
    status: webhookData.status || null,
    type: webhookData.type || null,
    accounts: webhookData.accounts || [],
    all_bank_pdf_statements: webhookData.all_bank_pdf_statements || [],
    address: webhookData.address || null,
    contacts: webhookData.contacts || [],
    account_validations: webhookData.account_validations || [],
    
    // Legacy fields for backward compatibility (extracted from accounts if available)
    account_info: webhookData.accounts?.[0] || webhookData.account_info || webhookData.account || null,
    account_stats: webhookData.accounts?.[0]?.statistics || webhookData.account_stats || webhookData.stats || null,
    account_statement: webhookData.accounts?.[0]?.transactions || webhookData.account_statement || webhookData.transactions || [],
    
    // Timestamp
    account_data_received_at: new Date().toISOString(),
    account_data_fetched_at: currentProviderData.account_data_fetched_at || null
  }

  // Update the application using proper typing
  const updatePayload: {
    ibv_provider_data: any
    ibv_status: string
    updated_at: string
  } = {
    ibv_provider_data: updatedProviderData,
    ibv_status: 'verified',
    updated_at: new Date().toISOString()
  }
  
  // Type workaround for Supabase strict typing
  const supabaseAny = supabase as any
  const { error: updateError } = await supabaseAny
    .from('loan_applications')
    .update(updatePayload)
    .eq('id', applicationId)

  if (updateError) {
    console.error('[Inverite Webhook] Error updating application:', updateError)
    return false
  }

  console.log('[Inverite Webhook] Successfully updated application:', applicationId)
  return true
}

/**
 * POST handler for Inverite webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get API key from environment
    const apiKey = process.env.INVERITE_API_KEY
    if (!apiKey) {
      console.error('[Inverite Webhook] INVERITE_API_KEY not configured')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }

    // Read raw body for signature verification
    const rawBody = await request.text()
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const signature = request.headers.get('x-mac-signature')
    const isValid = verifyWebhookSignature(rawBody, signature, apiKey)

    if (!isValid) {
      console.warn('[Inverite Webhook] Invalid signature - possible unauthorized request')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook data
    let webhookData: any
    try {
      webhookData = JSON.parse(rawBody)
    } catch (error) {
      console.error('[Inverite Webhook] Failed to parse JSON:', error)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    console.log('[Inverite Webhook] Received webhook:', {
      request_guid: webhookData.request || webhookData.request_guid || webhookData.request_GUID || webhookData.guid,
      status: webhookData.status,
      type: webhookData.type
    })

    // Extract request GUID (check multiple possible field names, including 'request' field)
    const requestGuid =
      webhookData.request ||
      webhookData.request_guid ||
      webhookData.request_GUID ||
      webhookData.guid ||
      webhookData.requestGuid

    if (!requestGuid) {
      console.error('[Inverite Webhook] Missing request_guid in webhook data')
      return NextResponse.json(
        { error: 'Missing request_guid' },
        { status: 400 }
      )
    }

    // Find the loan application by request_guid
    const application = await findApplicationByRequestGuid(requestGuid)

    if (!application) {
      console.warn('[Inverite Webhook] No application found for request_guid:', requestGuid)
      // Return 200 anyway - webhook was valid, we just don't have a matching application
      // This might happen if webhook arrives before application is submitted, or in testing
      return NextResponse.json({
        success: true,
        message: 'Webhook received but no matching application found',
        request_guid: requestGuid
      })
    }

    // Update application with account data
    const appData = application as { id: string; ibv_provider_data: any; client_id: string }
    const success = await updateApplicationWithAccountData(
      appData.id,
      webhookData
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      )
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      application_id: appData.id,
      request_guid: requestGuid
    })
  } catch (error: any) {
    console.error('[Inverite Webhook] Error processing webhook:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Inverite webhook endpoint is active',
    path: '/api/inverite/webhook'
  })
}

