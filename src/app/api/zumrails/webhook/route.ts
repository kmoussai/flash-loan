// Route: POST /api/zumrails/webhook
// Receives webhook events from Zumrails
// Documentation: https://docs.zumrails.com/api-reference/webhooks

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import crypto from 'crypto'

/**
 * Verify webhook signature using HMAC SHA256
 * Documentation: https://docs.zumrails.com/api-reference/webhooks#verifying-authenticity
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {

  console.log('verifyWebhookSignature', payload, signature, secret)
  if (!signature) {
    return false
  }

  // Calculate HMAC SHA256 signature
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload, 'utf-8')
  const calculatedSignature = hmac.digest('hex')

  // Compare signatures using constant-time comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, 'hex')
    const calcBuffer = Buffer.from(calculatedSignature, 'hex')
    if (sigBuffer.length !== calcBuffer.length) {
      return false
    }
    return crypto.timingSafeEqual(
      new Uint8Array(sigBuffer),
      new Uint8Array(calcBuffer)
    )
  } catch {
    // If signature is not hex, compare as strings (less secure but handles edge cases)
    return signature === calculatedSignature
  }
}

/**
 * Extract customer ID from webhook payload based on Type
 */
function extractCustomerId(payload: any): string | null {
  const data = payload.Data || payload.data || payload

  // Try different possible fields based on Zumrails documentation
  return (
    data?.UserId ||
    data?.CustomerId ||
    data?.customerId ||
    data?.customer_id ||
    data?.Id ||
    null
  )
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.ZUMRAILS_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Zumrails Webhook] Missing ZUMRAILS_WEBHOOK_SECRET')
      // In development, allow webhooks without secret (for testing)
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        )
      }
    }

    // Get signature from header
    const signature = request.headers.get('zumrails-signature')
    
    // Get raw body for signature verification
    // Note: Next.js 13+ requires special handling for raw body
    const rawBody = await request.text()
    
    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('[Zumrails Webhook] Invalid signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else if (process.env.NODE_ENV === 'production' && !signature) {
      console.warn('[Zumrails Webhook] Missing signature in production')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Parse JSON payload
    const body = JSON.parse(rawBody)
    
    console.log('[Zumrails Webhook] Received event', {
      type: body.Type,
      event: body.Event,
      hasData: !!body.Data
    })
    
    // Extract webhook metadata
    const webhookType = body.Type // User, Transaction, Customer, etc.
    const event = body.Event // Created, Updated, StatusChange, etc.
    const data = body.Data || body.data || body

    // Extract customer/user ID from payload
    const customerId = extractCustomerId(body)

    if (!customerId) {
      console.warn('[Zumrails Webhook] Missing customer/user ID', {
        type: webhookType,
        event,
        payload: body
      })
      // Some webhook types might not have customer ID (e.g., TaxRate, CommonFee)
      // Return 200 to acknowledge receipt even if we can't process it
      return NextResponse.json({ 
        received: true,
        message: 'Webhook received but no customer ID found'
      })
    }

    const supabase = createServerSupabaseAdminClient()

    // Find matching IBV request by customer ID in provider_data
    // Check loan_application_ibv_requests table first (more specific)
    const { data: ibvRequests, error: ibvError } = await supabase
      .from('loan_application_ibv_requests')
      .select('id, loan_application_id, status, provider_data')
      .eq('provider', 'zumrails')
      .not('provider_data', 'is', null)

    // Find the matching IBV request by checking customer ID in provider_data
    let ibvRequest: any = null
    if (!ibvError && ibvRequests) {
      ibvRequest = ibvRequests.find((req: any) => {
        const providerData = req.provider_data as any
        return providerData?.customerId === customerId
      })
    }

    let matchingApp = null
    let applicationId = null

    if (!ibvError && ibvRequest) {
      // Check if customer ID matches in provider_data
      const providerData = ibvRequest.provider_data as any
      if (providerData?.customerId === customerId) {
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
          matchingApp = matching
        }
      } else {
        // Get full application data
        const { data: app } = await supabase
          .from('loan_applications')
          .select('id, ibv_provider_data, ibv_status')
          .eq('id', applicationId)
          .single()

        matchingApp = app as any
      }

    if (applicationId && matchingApp) {
      // Handle different webhook types and events for IBV verification
      // Based on Zumrails documentation: https://docs.zumrails.com/api-reference/webhooks
      // 
      // Expected webhooks for IBV/Data Aggregation:
      // 1. Type: "User" | "Customer", Event: "StatusChange" - User verification status changed
      // 2. Type: "User" | "Customer", Event: "Updated" - User data was updated (may include verification status)
      // 3. Type: "User" | "Customer", Event: "Created" - User was created (initial connection)
      //
      // The Data payload typically contains:
      // - UserId / CustomerId: The user identifier
      // - Status: "Pending", "Verified", "Active", "Failed", etc.
      // - Details: Additional verification information (bank name, account info, etc.)
      
      let shouldUpdate = false
      let updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Handle User/Customer webhook types for IBV verification
      if (webhookType === 'User' || webhookType === 'Customer') {
        // Extract status from various possible fields
        const status = 
          data?.Status || 
          data?.status || 
          data?.VerificationStatus ||
          data?.verificationStatus ||
          data?.ConnectionStatus ||
          data?.connectionStatus

        // Handle StatusChange event - indicates verification status change
        if (event === 'StatusChange') {
          console.log('[Zumrails Webhook] StatusChange event', {
            applicationId,
            customerId,
            status,
            data
          })

          // Map Zumrails statuses to our IBV statuses
          if (status === 'Verified' || status === 'verified' || status === 'Active' || status === 'active' || status === 'Completed' || status === 'completed') {
            updateData.ibv_status = 'verified'
            updateData.ibv_verified_at = new Date().toISOString()
            shouldUpdate = true
          } else if (status === 'Failed' || status === 'failed' || status === 'Error' || status === 'error') {
            updateData.ibv_status = 'failed'
            shouldUpdate = true
          } else if (status === 'Cancelled' || status === 'cancelled') {
            updateData.ibv_status = 'cancelled'
            shouldUpdate = true
          } else if (status === 'Pending' || status === 'pending' || status === 'Processing' || status === 'processing') {
            updateData.ibv_status = 'processing'
            shouldUpdate = true
          }
        }
        // Handle Updated event - user data was updated (may include verification completion)
        else if (event === 'Updated') {
          console.log('[Zumrails Webhook] Updated event', {
            applicationId,
            customerId,
            status,
            data
          })

          // Check if this update indicates verification completion
          // Look for payment profiles, connected accounts, or verification flags
          const hasPaymentProfile = data?.PaymentProfiles?.length > 0 || data?.paymentProfiles?.length > 0
          const hasConnectedAccount = data?.ConnectedAccount || data?.connectedAccount || data?.HasConnectedAccount
          const isVerified = data?.IsVerified || data?.isVerified || status === 'Verified' || status === 'verified'

          if (hasPaymentProfile || hasConnectedAccount || isVerified) {
            updateData.ibv_status = 'verified'
            updateData.ibv_verified_at = new Date().toISOString()
            shouldUpdate = true
          }
        }
        // Handle Created event - initial user creation (connection started)
        else if (event === 'Created') {
          console.log('[Zumrails Webhook] Created event', {
            applicationId,
            customerId,
            data
          })

          // User was created, mark as processing
          updateData.ibv_status = 'processing'
          shouldUpdate = true
        }
      }

      // Log unhandled events for debugging
      if (!shouldUpdate) {
        console.log('[Zumrails Webhook] Event received but not processed', {
          applicationId,
          type: webhookType,
          event,
          customerId
        })
      }

      // Update loan application if needed
      if (shouldUpdate) {
        await (supabase
          .from('loan_applications') as any)
          .update(updateData)
          .eq('id', applicationId)

        // Also update IBV request if it exists
        if (ibvRequest && (ibvRequest as any).id) {
          await (supabase
            .from('loan_application_ibv_requests') as any)
            .update({
              status: (updateData.ibv_status as any) || 'pending',
              completed_at: updateData.ibv_verified_at || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', (ibvRequest as any).id)
        }

        console.log('[Zumrails Webhook] Updated application', {
          applicationId,
          type: webhookType,
          event,
          updateData
        })
      } else {
        console.log('[Zumrails Webhook] Application found but no update needed', {
          applicationId,
          type: webhookType,
          event
        })
      }
    } else {
      console.warn('[Zumrails Webhook] No matching application found', { 
        customerId,
        type: webhookType,
        event
      })
    }

    // Always return 200 to acknowledge receipt
    // Per documentation: https://docs.zumrails.com/api-reference/webhooks#retry-in-case-of-failure
    // Non-200 responses will trigger retries (3x in sandbox, 5x in production)
    return NextResponse.json({ 
      received: true,
      processed: !!applicationId
    })
  } catch (error: any) {
    console.error('[Zumrails Webhook] Error processing webhook:', error)
    
    // Log error but return 200 to prevent retry storms
    // In production, you might want to log to an error tracking service
    // and only return 200 for transient errors
    
    // For parsing errors or other critical issues, you might return 400
    // to indicate the webhook shouldn't be retried
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload', received: false },
        { status: 400 }
      )
    }

    // Return 200 for other errors to prevent Zumrails retries
    // Log to error tracking service in production
    return NextResponse.json(
      { error: 'Internal error', received: true },
      { status: 200 }
    )
  }
}
