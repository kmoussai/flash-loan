import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { initializeZumrailsSession } from '@/src/lib/ibv/zumrails-server'
import { createIbvProviderData } from '@/src/lib/supabase/ibv-helpers'

/**
 * Initialize IBV via ZumRails from an email link.
 *
 * POST /api/ibv/initialize-from-email
 * Body: { requestId: string }
 *
 * - Validates the IBV request (loan_application_ibv_requests row)
 * - Generates a ZumRails connect token on-demand
 * - Updates IBV request + loan application with ZumRails provider data
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      requestId?: string
    }

    const requestId = typeof body.requestId === 'string' ? body.requestId : null

    if (!requestId) {
      return NextResponse.json(
        { error: 'REQUEST_ID_REQUIRED' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // 1) Load IBV request with loan application to get client_id reliably
    const { data: ibvRequest, error: ibvError } = await (supabase as any)
      .from('loan_application_ibv_requests')
      .select(`
        id,
        loan_application_id,
        client_id,
        provider,
        status,
        loan_applications!loan_application_ibv_requests_loan_application_id_fkey (
          client_id
        )
      `)
      .eq('id', requestId)
      .single()

    if (ibvError || !ibvRequest) {
      return NextResponse.json(
        { error: 'IBV_REQUEST_NOT_FOUND' },
        { status: 404 }
      )
    }

    const ibv = ibvRequest as {
      id: string
      loan_application_id: string
      client_id: string | null
      provider: string | null
      status: string | null
      loan_applications: {
        client_id: string
      } | null
    }

    // Only allow initializing for non-completed requests
    const terminalStatuses = ['verified', 'cancelled', 'failed', 'expired']
    if (ibv.status && terminalStatuses.includes(ibv.status)) {
      return NextResponse.json(
        { error: 'IBV_REQUEST_ALREADY_COMPLETED' },
        { status: 409 }
      )
    }

    // Get client_id from loan application (more reliable than IBV request)
    const clientId = ibv.loan_applications?.client_id || ibv.client_id

    if (!clientId) {
      return NextResponse.json(
        { error: 'CLIENT_ID_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 2) Load client for ZumRails session
    const { data: client, error: clientError } = await (supabase as any)
      .from('users')
      .select('id, first_name, last_name, email, phone, preferred_language')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('[IBV Initialize] Client lookup error:', {
        clientId,
        error: clientError,
        ibvRequestId: ibv.id,
        loanApplicationId: ibv.loan_application_id
      })
      return NextResponse.json(
        { error: 'CLIENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const c = client as any

    // 3) Load current address separately (if exists)
    const { data: addressData } = await (supabase as any)
      .from('addresses')
      .select('street_number, street_name, apartment_number, city, province, postal_code')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .single()

    const address = addressData as {
      street_number?: string | null
      street_name?: string | null
      apartment_number?: string | null
      city?: string | null
      province?: string | null
      postal_code?: string | null
    } | null

    // Optional: build address line 1 if we have street data from current address
    let addressLine1: string | undefined
    if (address && (address.street_number || address.street_name)) {
      const parts = [address.street_number, address.street_name].filter(Boolean)
      if (parts.length > 0) {
        addressLine1 = parts.join(' ')
        if (address.apartment_number) {
          addressLine1 += `, Apt ${address.apartment_number}`
        }
      }
    }

    const preferredLanguage =
      c.preferred_language === 'fr' ? 'fr' : 'en'

    const requestedAt = new Date().toISOString()

    // 3) Generate ZumRails connect token using shared server helper
    const {
      connectToken,
      customerId,
      iframeUrl,
      expiresAt
    } = await initializeZumrailsSession(
      {
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone,
        email: c.email,
        ...(address &&
          address.city &&
          address.province &&
          address.postal_code && {
            addressCity: address.city,
            addressLine1,
            addressProvince: address.province,
            addressPostalCode: String(address.postal_code).replace(/\s+/g, '')
          }),
        clientUserId: ibv.loan_application_id,
        language: preferredLanguage
      },
      ibv.loan_application_id,
      ibv.id
    )

    // 4) Normalize provider data for ZumRails
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
      initiated_by: 'email_link',
      requested_at: requestedAt,
      iframe_url: iframeUrl
    })

    // 5) Update IBV request with ZumRails data
    const { error: updateIbvError } = await (supabase as any)
      .from('loan_application_ibv_requests')
      .update({
        provider: 'zumrails',
        status: 'pending',
        request_url: iframeUrl,
        provider_data: providerData,
        updated_at: requestedAt
      })
      .eq('id', ibv.id)
      .eq('loan_application_id', ibv.loan_application_id)

    if (updateIbvError) {
      console.error(
        '[IBV Initialize] Failed to update IBV request with ZumRails data:',
        updateIbvError
      )
    }

    // 6) Update loan application IBV fields
    const { error: updateAppError } = await (supabase as any)
      .from('loan_applications')
      .update({
        ibv_provider: 'zumrails',
        ibv_status: 'pending',
        ibv_provider_data: providerData
      })
      .eq('id', ibv.loan_application_id)

    if (updateAppError) {
      console.error(
        '[IBV Initialize] Failed to update loan application with ZumRails data:',
        updateAppError
      )
    }

    // 7) Return connect token to client so ZumRails SDK can be initialized
    return NextResponse.json(
      {
        success: true,
        connectToken,
        customerId,
        iframeUrl,
        expiresAt,
        applicationId: ibv.loan_application_id,
        ibvRequestId: ibv.id
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[IBV Initialize] Error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}


