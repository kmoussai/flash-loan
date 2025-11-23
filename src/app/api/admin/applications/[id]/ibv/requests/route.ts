import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createNotification } from '@/src/lib/supabase'
import type { NotificationCategory } from '@/src/types'

// Force dynamic rendering - prevent caching
export const dynamic = 'force-dynamic'

interface ReinitializeBody {
  note?: string
  locale?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()
    const { data, error } = await (supabase as any)
      .from('loan_application_ibv_requests')
      .select('*')
      .eq('loan_application_id', applicationId)
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('[IBV Requests] Failed to load history:', error)
      return NextResponse.json(
        { error: 'FAILED_TO_LOAD_HISTORY' },
        { status: 500 }
      )
    }

    return NextResponse.json({ requests: data ?? [] })
  } catch (e: any) {
    console.error('[IBV Requests] Error:', e)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const applicationId = params.id

  try {
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as ReinitializeBody
    const note = typeof body.note === 'string' ? body.note.trim() : null

    const supabase = createServerSupabaseAdminClient()

    // Fetch application + client details
    const { data: application, error: appError } = await (supabase as any)
      .from('loan_applications')
      .select(`
        id,
        client_id,
        ibv_provider,
        ibv_status,
        ibv_provider_data,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          preferred_language
        )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'APPLICATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    const client = (application as any).users
    if (!client) {
      return NextResponse.json(
        { error: 'CLIENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const apiKey = process.env.INVERITE_API_KEY
    const baseUrl =
      process.env.INVERITE_API_BASE_URL || 'https://sandbox.inverite.com'
    const createPath =
      process.env.INVERITE_CREATE_REQUEST_PATH || '/api/v2/create'
    const siteId = process.env.INVERITE_SITE_ID

    if (!apiKey || !siteId) {
      return NextResponse.json(
        {
          error: 'MISSING_CONFIGURATION',
          message: 'INVERITE credentials are not configured'
        },
        { status: 500 }
      )
    }

    const payload: Record<string, any> = {
      siteID: siteId,
      firstname: client.first_name,
      lastname: client.last_name,
      // email: client.email,
      phone: client.phone
    }

    // Optional redirect (allows overriding locale)
    const requestedLocale =
      body.locale || client.preferred_language || 'en'
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    // Include application_id in callback URL so we can fetch Inverite data
    const callbackUrl = new URL(`${origin}/${requestedLocale}/quick-apply/inverite/callback`)
    callbackUrl.searchParams.set('application_id', applicationId)
    callbackUrl.searchParams.set('ts', Date.now().toString())
    const redirectUrl = callbackUrl.toString()
    payload.redirecturl = redirectUrl

    const url = `${baseUrl}${createPath}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Auth: apiKey
    }

    console.log('[IBV Requests] Creating Inverite request:', {
      url,
      payload
    })

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    const rawText = await resp.text().catch(() => '')

    if (!resp.ok) {
      console.error('[IBV Requests] Inverite error:', rawText)
      return NextResponse.json(
        {
          error: 'INVERITE_REQUEST_FAILED',
          details: rawText || resp.statusText
        },
        { status: 502 }
      )
    }

    let data: any = {}
    try {
      data = rawText ? JSON.parse(rawText) : {}
    } catch (err) {
      console.warn('[IBV Requests] Unable to parse Inverite response:', err)
    }

    const requestGuid =
      data.request_guid ||
      data.requestGuid ||
      data.request_GUID

    if (!requestGuid) {
      return NextResponse.json(
        {
          error: 'MALFORMED_RESPONSE',
          message: 'Inverite response missing request GUID'
        },
        { status: 502 }
      )
    }

    const iframeUrl = data.iframeurl || data.iframe_url || null
    const requestedAt = new Date().toISOString()

    const customerStartBase =
      process.env.INVERITE_CUSTOMER_START_BASE_URL ||
      `${baseUrl.replace(/\/$/, '')}/customer/v2/web/start`
    const sanitizedStartBase = customerStartBase.replace(/\/$/, '')
    const startUrl = requestGuid
      ? `${sanitizedStartBase}/${requestGuid}/0/modern`
      : iframeUrl

    const providerData = {
      request_guid: requestGuid,
      iframe_url: iframeUrl,
      initiated_by: 'admin',
      requested_at: requestedAt,
      ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
      ...(startUrl ? { start_url: startUrl } : {})
    }

    const insertPayload = {
      loan_application_id: applicationId,
      client_id: client.id,
      provider: 'inverite',
      status: 'pending',
      request_guid: requestGuid,
      request_url: startUrl,
      provider_data: providerData,
      note,
      requested_at: requestedAt
    }

    const { data: insertedRequest, error: insertError } = await (supabase as any)
      .from('loan_application_ibv_requests')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError) {
      console.error('[IBV Requests] Failed to insert history row:', insertError)
      return NextResponse.json(
        { error: 'FAILED_TO_SAVE_REQUEST' },
        { status: 500 }
      )
    }

    const ibvRequestId = insertedRequest?.id

    const { error: updateError } = await (supabase as any)
      .from('loan_applications')
      .update({
        ibv_provider: 'inverite',
        ibv_status: 'pending',
        ibv_provider_data: {
          ...(application.ibv_provider_data ?? {}),
          request_guid: requestGuid,
          iframe_url: iframeUrl,
          ...(startUrl ? { start_url: startUrl } : {}),
          ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
          last_requested_at: requestedAt
        }
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('[IBV Requests] Failed to update application:', updateError)
      return NextResponse.json(
        { error: 'FAILED_TO_UPDATE_APPLICATION' },
        { status: 500 }
      )
    }

    // Create notification for client when IBV request is created
    try {
      const clientFirstName = client.first_name ?? ''
      const clientLastName = client.last_name ?? ''
      const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ').trim() || 'Client'

      await createNotification(
        {
          recipientId: client.id,
          recipientType: 'client',
          title: 'Bank verification requested',
          message: `We need to verify your bank account information to process your loan application. Please complete the verification process.`,
          category: 'ibv_request_created' as NotificationCategory,
          metadata: {
            type: 'ibv_event',
            loanApplicationId: applicationId,
            clientId: client.id,
            provider: 'inverite',
            status: 'pending',
            requestGuid: requestGuid,
            requestId: ibvRequestId,
            createdAt: requestedAt,
            iframeUrl: startUrl || iframeUrl || null
          }
        },
        { client: supabase }
      )
    } catch (notificationError) {
      console.error('[IBV Requests] Failed to create client notification:', notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json(
      {
        success: true,
        request_guid: requestGuid,
        iframe_url: iframeUrl,
        start_url: startUrl,
        redirect_url: redirectUrl,
        requested_at: requestedAt
      },
      { status: 201 }
    )
  } catch (e: any) {
    console.error('[IBV Requests] Error:', e)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

