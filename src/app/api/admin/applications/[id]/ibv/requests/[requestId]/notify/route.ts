import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createNotification } from '@/src/lib/supabase'
import { sendEmail } from '@/src/lib/email/smtp'
import { generateIbvReminderEmail } from '@/src/lib/email/templates/ibv-reminder'
import type { NotificationCategory } from '@/src/types'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; requestId: string } }
) {
  const applicationId = params.id
  const ibvRequestId = params.requestId

  if (!applicationId || !ibvRequestId) {
    return NextResponse.json(
      { error: 'Application ID and request ID are required' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServerSupabaseAdminClient()

    const { data: ibvRequest, error: requestError } = await (supabase as any)
      .from('loan_application_ibv_requests')
      .select('id, loan_application_id, client_id, request_url, provider_data, provider, status')
      .eq('id', ibvRequestId)
      .eq('loan_application_id', applicationId)
      .single()

    if (requestError || !ibvRequest) {
      return NextResponse.json(
        { error: 'IBV request not found' },
        { status: 404 }
      )
    }

    const { data: application, error: appError } = await (supabase as any)
      .from('loan_applications')
      .select(
        `
        id,
        client_id,
        ibv_provider_data,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          preferred_language
        )
      `
      )
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const client = (application as any).users as {
      id: string
      first_name?: string | null
      last_name?: string | null
      email?: string | null
      preferred_language?: string | null
    }

    if (!client?.email) {
      return NextResponse.json(
        { error: 'Client email is missing. Cannot send notification.' },
        { status: 422 }
      )
    }

    const providerData = (ibvRequest as any)?.provider_data as Record<string, any> | null
    const provider = (ibvRequest as any)?.provider
    // Extract provider-specific identifier from provider_data JSONB
    const requestGuid = providerData?.request_guid ||
      providerData?.request_GUID ||
      providerData?.requestGuid ||
      (provider === 'zumrails' ? providerData?.customerId : null) ||
      providerData?.request_GUID ||
      null

    const baseApiUrl =
      process.env.INVERITE_API_BASE_URL || 'https://sandbox.inverite.com'
    const customerStartBase =
      process.env.INVERITE_CUSTOMER_START_BASE_URL ||
      `${baseApiUrl.replace(/\/$/, '')}/customer/v2/web/start`
    const sanitizedStartBase = customerStartBase.replace(/\/$/, '')
    const computedStartUrl = requestGuid
      ? `${sanitizedStartBase}/${requestGuid}/0/modern`
      : null

    const verificationLink =
      (ibvRequest as any)?.request_url ||
      providerData?.start_url ||
      providerData?.iframe_url ||
      computedStartUrl

    if (!verificationLink) {
      return NextResponse.json(
        {
          error:
            'This IBV request does not have an accessible verification link yet.'
        },
        { status: 409 }
      )
    }

    const preferredLanguage =
      client.preferred_language === 'fr' ? 'fr' : 'en'
    const applicantName =
      `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
      client.email

    const redirectUrl =
      (ibvRequest as any)?.provider_data?.redirect_url ||
      (application as any)?.ibv_provider_data?.redirect_url ||
      null

    const emailContent = generateIbvReminderEmail({
      applicantName,
      verificationLink,
      preferredLanguage: preferredLanguage as 'en' | 'fr',
      redirectUrl
    })

    const emailResult = await sendEmail({
      to: client.email,
      subject: emailContent.subject,
      html: emailContent.html
    })

    if (!emailResult.success) {
      return NextResponse.json(
        {
          error:
            emailResult.error ||
            'Failed to send IBV reminder. SMTP may be misconfigured.'
        },
        { status: 503 }
      )
    }

    const nowIso = new Date().toISOString()
    const updatedProviderData = {
      ...(providerData || {}),
      last_notification_at: nowIso,
      last_notification_channel: 'email',
      last_notification_to: client.email
    }

    await (supabase as any)
      .from('loan_application_ibv_requests')
      .update({
        provider_data: updatedProviderData,
        updated_at: nowIso
      })
      .eq('id', ibvRequestId)
      .eq('loan_application_id', applicationId)

    // Create notification for client when pending request notification is sent
    try {
      await createNotification(
        {
          recipientId: client.id,
          recipientType: 'client',
          title: 'Bank verification reminder',
          message: `Please complete your bank account verification to continue processing your loan application. Check your email for the verification link.`,
          category: 'ibv_request_notification_sent' as NotificationCategory,
          metadata: {
            type: 'ibv_event',
            loanApplicationId: applicationId,
            clientId: client.id,
            provider: 'inverite',
            status: (ibvRequest as any)?.status || 'pending',
            requestGuid: requestGuid,
            requestId: ibvRequestId,
            notificationSentAt: nowIso,
            iframeUrl: verificationLink || null
          }
        },
        { client: supabase }
      )
    } catch (notificationError) {
      console.error('[IBV Notify] Failed to create client notification:', notificationError)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message:
        preferredLanguage === 'fr'
          ? `Notification envoyée à ${client.email}`
          : `Notification sent to ${client.email}`,
      notified_at: nowIso
    })
  } catch (error: any) {
    console.error('[IBV Notify] Error sending reminder:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


