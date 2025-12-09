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
    // Process in background - don't block response
    processZumrailsWebhook(body).catch((error) => {
      console.error('[Zumrails Webhook] Error processing webhook:', error)
    })

    // Return 200 immediately to acknowledge receipt
    // Per documentation: https://docs.zumrails.com/api-reference/webhooks#retry-in-case-of-failure
    // 200 response indicates successful receipt - Zumrails won't retry
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: any) {
    console.error('[Zumrails Webhook] Error processing webhook:', error)

    // Log error but return 200 to prevent retry storms
    // In production, you might want to log to an error tracking service
    // and only return 200 for transient errors

    // Return 200 for all errors to acknowledge receipt
    // Log errors but don't trigger retries from Zumrails
    // Per documentation: 200 response means webhook was received
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
