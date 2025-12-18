import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createNotification } from '@/src/lib/supabase'
import { sendEmail } from '@/src/lib/email/smtp'
import { generateIbvReminderEmail } from '@/src/lib/email/templates/ibv-reminder'
import { getAppUrl } from '@/src/lib/config'
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

    const requestedAt = new Date().toISOString()

    // Check if an existing ZumRails IBV request exists for this application
    // Since tokens are generated on-demand, we can reuse existing requests
    const { data: existingRequest } = await (supabase as any)
      .from('loan_application_ibv_requests')
      .select('id, status')
      .eq('loan_application_id', applicationId)
      .eq('provider', 'zumrails')
      .maybeSingle()

    let ibvRequestId: string | null = null

    if (existingRequest) {
      // Reuse existing request - update it to pending if it's in a terminal state
      const terminalStatuses = ['verified', 'cancelled', 'failed', 'expired']
      const shouldReset = terminalStatuses.includes(existingRequest.status)

      if (shouldReset) {
        // Reset terminal request to pending for a new attempt
        const { error: updateError } = await (supabase as any)
          .from('loan_application_ibv_requests')
          .update({
            status: 'pending',
            request_url: null,
            provider_data: {
              initiated_by: 'admin',
              requested_at: requestedAt,
              previous_status: existingRequest.status,
              reset_at: requestedAt
            },
            note,
            requested_at: requestedAt,
            updated_at: requestedAt
          })
          .eq('id', existingRequest.id)

        if (updateError) {
          console.error('[IBV Requests] Failed to reset existing request:', updateError)
          return NextResponse.json(
            { error: 'FAILED_TO_RESET_REQUEST' },
            { status: 500 }
          )
        }
      } else {
        // Request is already pending/processing - just update metadata
        const { error: updateError } = await (supabase as any)
          .from('loan_application_ibv_requests')
          .update({
            provider_data: {
              initiated_by: 'admin',
              requested_at: requestedAt,
              last_admin_request_at: requestedAt
            },
            note,
            updated_at: requestedAt
          })
          .eq('id', existingRequest.id)

        if (updateError) {
          console.error('[IBV Requests] Failed to update existing request:', updateError)
          // Non-fatal - continue with existing request
        }
      }

      ibvRequestId = existingRequest.id
      console.log('[IBV Requests] Reusing existing ZumRails IBV request:', ibvRequestId)
    } else {
      // Create a new IBV request row for ZumRails.
      // The actual ZumRails connect token will be generated on-demand when the client
      // clicks the email link and hits /api/ibv/initialize-from-email.
      const { data: insertedRequest, error: insertError } = await (supabase as any)
        .from('loan_application_ibv_requests')
        .insert({
          loan_application_id: applicationId,
          client_id: client.id,
          provider: 'zumrails',
          status: 'pending',
          request_url: null,
          provider_data: {
            initiated_by: 'admin',
            requested_at: requestedAt
          },
          note,
          requested_at: requestedAt
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[IBV Requests] Failed to insert history row:', insertError)
        return NextResponse.json(
          { error: 'FAILED_TO_SAVE_REQUEST' },
          { status: 500 }
        )
      }

      ibvRequestId = insertedRequest?.id
      console.log('[IBV Requests] Created new ZumRails IBV request:', ibvRequestId)
    }

    // Update application to reflect that IBV via ZumRails is pending
    const { error: updateError } = await (supabase as any)
      .from('loan_applications')
      .update({
        ibv_provider: 'zumrails',
        ibv_status: 'pending',
        ibv_provider_data: {
          ...(application.ibv_provider_data ?? {}),
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

    // Send email notification to client with verification link
    try {
      if (!client.email) {
        console.warn('[IBV Requests] Client email missing, cannot send notification')
      } else {
        const preferredLanguage =
          client.preferred_language === 'fr' ? 'fr' : 'en'
        const applicantName =
          `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
          client.email

        // Build verification link pointing to our verify page
        const origin =
          request.headers.get('origin') ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          getAppUrl()
        const verificationLink = `${origin}/${preferredLanguage}/ibv/verify?request_id=${ibvRequestId}`

        const emailContent = generateIbvReminderEmail({
          applicantName,
          verificationLink,
          preferredLanguage: preferredLanguage as 'en' | 'fr',
          redirectUrl: null // No redirect needed for ZumRails
        })

        const emailResult = await sendEmail({
          to: client.email,
          subject: emailContent.subject,
          html: emailContent.html
        })

        if (!emailResult.success) {
          console.error('[IBV Requests] Failed to send email:', emailResult.error)
          // Non-fatal - continue even if email fails
        } else {
          // Update provider_data with notification tracking
          const { data: currentRequest } = await (supabase as any)
            .from('loan_application_ibv_requests')
            .select('provider_data')
            .eq('id', ibvRequestId)
            .single()

          const currentProviderData = (currentRequest?.provider_data || {}) as Record<string, any>
          const updatedProviderData = {
            ...currentProviderData,
            last_notification_at: requestedAt,
            last_notification_channel: 'email',
            last_notification_to: client.email
          }

          await (supabase as any)
            .from('loan_application_ibv_requests')
            .update({
              provider_data: updatedProviderData,
              updated_at: requestedAt
            })
            .eq('id', ibvRequestId)

          console.log('[IBV Requests] Email sent successfully to:', client.email)

          // Create notification for client when IBV request is created/reused
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
                  provider: 'zumrails',
                  status: 'pending',
                  requestId: ibvRequestId,
                  createdAt: requestedAt,
                  verificationLink: verificationLink
                }
              },
              { client: supabase }
            )
          } catch (notificationError) {
            console.error('[IBV Requests] Failed to create client notification:', notificationError)
            // Don't fail the request if notification creation fails
          }
        }
      }
    } catch (emailError: any) {
      console.error('[IBV Requests] Error sending email:', emailError)
      // Non-fatal - continue even if email fails
    }

    return NextResponse.json(
      {
        success: true,
        request_id: ibvRequestId,
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

