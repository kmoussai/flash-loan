// Route: POST /api/zumrails/initialize
// Authenticates with Zumrails, creates a connect token, and returns it for SDK use

import { NextResponse } from 'next/server'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'
import { initializeZumrailsSession } from '@/src/lib/ibv/zumrails-server'

type InitBody = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  redirectParams?: Record<string, string>
}


export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as InitBody

    // Use server helper to get token from cache or authenticate, then create connect token
    const { connectToken, customerId, iframeUrl, expiresAt } = await initializeZumrailsSession({
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email
    })

    // Create normalized provider data
    const providerData = createIbvProviderData('zumrails', {
      customerId,
      connectToken,
      connectTokenExpiresAt: expiresAt,
      connectTokenType: 'AddPaymentProfile',
      configuration: {
        allowEft: true,
        allowInterac: true,
        allowVisaDirect: true,
        allowCreditCard: true
      },
      connectedAt: new Date().toISOString()
    })

    return NextResponse.json(
      {
        connectToken,
        customerId,
        iframeUrl,
        expiresAt,
        providerData // Include for debugging/storage
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Zumrails Initialize] Error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

