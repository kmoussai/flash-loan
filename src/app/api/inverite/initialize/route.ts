// Route: POST /api/inverite/initialize
// Creates an Inverite sandbox request and returns a request GUID without exposing the API key to the client

import { NextResponse } from 'next/server'

type InitBody = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  redirectParams?: Record<string, string> // Additional params to include in redirect URL
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as InitBody

    const apiKey = process.env.INVERITE_API_KEY
    const baseUrl =
      process.env.INVERITE_API_BASE_URL || 'https://sandbox.inverite.com'
    // Path may differ depending on Inverite account/config; allow override via env
    const createPath =
      process.env.INVERITE_CREATE_REQUEST_PATH || '/api/v2/create'
    const siteId = process.env.INVERITE_SITE_ID

    if (!siteId) {
      return NextResponse.json(
        {
          error: 'MISSING_CONFIGURATION',
          message: 'INVERITE_SITE_ID is required by Inverite (siteID).'
        },
        { status: 400 }
      )
    }

    // If configuration is missing, return explicit error
    if (!apiKey || !baseUrl) {
      return NextResponse.json(
        {
          error: 'MISSING_CONFIGURATION',
          message:
            'INVERITE_API_KEY or INVERITE_API_BASE_URL is not configured.'
        },
        { status: 500 }
      )
    }

    const url = `${baseUrl}${createPath}`

    // Get origin from request headers for redirect URL (dev only)
    // Extract locale from referer URL if available
    const referer = request.headers.get('referer') || request.headers.get('origin')
    let redirectUrl: string | null = null
    
    if (referer && process.env.NODE_ENV !== 'production') {
      try {
        const refererUrl = new URL(referer)
        // Extract locale from pathname (format: /en/... or /fr/...)
        const pathMatch = refererUrl.pathname.match(/^\/(en|fr)\//)
        const locale = pathMatch ? pathMatch[1] : 'en' // Default to 'en' if not found
        
        // Build redirect URL with query parameters
        const baseUrl = `${refererUrl.origin}/${locale}/apply1/inverite/callback`
        const urlObj = new URL(baseUrl)
        
        // Add any custom redirect params from request body
        if (body.redirectParams && typeof body.redirectParams === 'object') {
          Object.entries(body.redirectParams).forEach(([key, value]) => {
            if (value) {
              urlObj.searchParams.set(key, String(value))
            }
          })
        }
        
        // Add timestamp for tracking
        urlObj.searchParams.set('ts', Date.now().toString())
        
        redirectUrl = urlObj.toString()
      } catch (e) {
        console.warn('[Inverite] Failed to parse referer URL:', e)
        // Fallback: try to get locale from request if available
        const fallbackLocale = 'en'
        const origin = new URL(referer).origin
        const fallbackUrl = new URL(`${origin}/${fallbackLocale}/apply1/inverite/callback`)
        if (body.redirectParams) {
          Object.entries(body.redirectParams).forEach(([key, value]) => {
            if (value) fallbackUrl.searchParams.set(key, String(value))
          })
        }
        fallbackUrl.searchParams.set('ts', Date.now().toString())
        redirectUrl = fallbackUrl.toString()
      }
    }

    // Build webhook URL
    // In production, use your actual domain
    const webhookUrl =
      process.env.INVERITE_WEBHOOK_URL ||
      (referer
        ? `${new URL(referer).origin}/api/inverite/webhook`
        : null)

    // Minimal payload; adapt fields as required by Inverite. Optional user info can help prefill.
    const payload: Record<string, any> = {
      siteID: siteId,
      firstname: body.firstName,
      lastname: body.lastName,
      email: body.email,
      phone: body.phone,
      ip: '0.0.0.0'
    }

    // Add webhook URL if configured
    if (webhookUrl) {
      payload.webhookurl = webhookUrl
      console.log('[Inverite] Setting webhook URL:', webhookUrl)
    }

    // Add redirect URL in dev if available (helps with postMessage origin issues)
    if (redirectUrl) {
      payload.redirecturl = redirectUrl
      console.log('[Inverite] Setting redirect URL:', redirectUrl)
    }

    // Remove undefined entries
    Object.keys(payload).forEach(
      k => payload[k] === undefined && delete payload[k]
    )

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Try common auth header styles; Inverite may require one of these
    headers['Auth'] = apiKey
    // headers['Authorization'] = `Bearer ${apiKey}`

    // Log outbound request (without secrets)
    console.log('[Inverite] Creating request', { url, payload })

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    // Read raw response once; parse JSON from it below
    const rawText = await resp.text().catch(() => '')

    // Prepare redacted body for logging
    let redactedBody: any = rawText
    try {
      const parsed = rawText ? JSON.parse(rawText) : {}
      if (parsed && typeof parsed === 'object') {
        redactedBody = { ...parsed }
        if (redactedBody.password) redactedBody.password = 'REDACTED'
      }
    } catch {
      // keep as raw text truncated
      redactedBody = rawText?.slice(0, 4000)
    }

    // Log inbound response status and redacted body (no secrets)
    console.log('[Inverite] Response', {
      status: resp.status,
      ok: resp.ok,
      body: redactedBody
    })

    if (!resp.ok) {
      return NextResponse.json(
        {
          error: 'INVERITE_REQUEST_FAILED',
          details: rawText || resp.statusText
        },
        { status: 502 }
      )
    }

    const data = (() => {
      try {
        return rawText ? JSON.parse(rawText) : {}
      } catch {
        return {}
      }
    })() as any
    // Attempt several common property names, then fallback
    const requestGuid = data.request_guid

    if (!requestGuid) {
      return NextResponse.json(
        {
          error: 'MALFORMED_RESPONSE',
          message: 'Inverite response missing request GUID'
        },
        { status: 502 }
      )
    }

    const iframeUrl = data.iframeurl

    return NextResponse.json({ requestGuid, iframeUrl }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
