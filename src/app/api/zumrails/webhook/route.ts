// Route: POST /api/zumrails/webhook
// Receives webhook events from Zumrails
// Documentation: https://docs.zumrails.com/api-reference/webhooks

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  processZumrailsWebhook,
  type ZumrailsWebhook
} from '@/src/lib/ibv/zumrails-webhook'

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
  const calculatedSignature = hmac.digest('base64')

  // Compare signatures - Zumrails sends base64 encoded signatures
  // Compare base64 strings directly (both are base64)
  return signature.trim() === calculatedSignature.trim()
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
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Parse JSON payload
    const body = JSON.parse(rawBody) as ZumrailsWebhook

    console.log('[Zumrails Webhook] Received event', {
      type: body.Type,
      event: body.Event,
      eventGeneratedAt: body.EventGeneratedAt,
      hasData: !!body.Data
    })

    // Process webhook using generic helper
    const result = await processZumrailsWebhook(body)

    console.log('[Zumrails Webhook] Processing result', {
      processed: result.processed,
      applicationId: result.applicationId,
      updated: result.updated,
      shouldRetry: result.shouldRetry,
      message: result.message
    })

    // If this is a timing issue (request ID not yet stored), return 503 Service Unavailable
    // This tells Zumrails to retry the webhook later
    // Per documentation: https://docs.zumrails.com/api-reference/webhooks#retry-in-case-of-failure
    // Non-200 responses will trigger retries (3x in sandbox, 5x in production)
    if (result.shouldRetry) {
      console.log('[Zumrails Webhook] Returning 503 to trigger retry', {
        requestId: result.applicationId,
        message: result.message
      })
      return NextResponse.json(
        {
          received: true,
          processed: false,
          updated: false,
          applicationId: result.applicationId,
          message: result.message,
          retry: true
        },
        { status: 503 } // Service Unavailable - triggers retry
      )
    }

    // Successfully processed or not applicable - return 200
    return NextResponse.json({
      received: true,
      processed: result.processed,
      updated: result.updated,
      applicationId: result.applicationId,
      message: result.message
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
