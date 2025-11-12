import { NextRequest, NextResponse } from 'next/server'
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient
} from '@/src/lib/supabase/server'
import { verifyRequestToken } from '@/src/lib/security/token'
import { createNotification } from '@/src/lib/supabase'
import type {
  NotificationCategory,
  NotificationRecipient,
  RequestSubmissionNotificationMetadata
} from '@/src/types'

interface SubmissionBody {
  form_data?: Record<string, any>
}

// POST /api/public/document-requests/:id/submit
// Body: { form_data: Record<string, any> }
// Supports token-based (magic link) or session-based submissions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Missing request id' }, { status: 400 })
    }

    const token = request.nextUrl.searchParams.get('token') || undefined
    const groupParam = request.nextUrl.searchParams.get('group') || undefined

    const admin = createServerSupabaseAdminClient()

    let isAuthorized = false
    let submittedBy: string | null = null
    let requestRow: any = null

    let loanApplication: { id: string; client_id: string; assigned_to: string | null } | null = null

    if (token) {
      if (groupParam) {
        // Verify token against the group and ensure the request belongs to that group
        if (verifyRequestToken(token, groupParam)) {
          const { data, error } = await admin
            .from('document_requests' as any)
            .select('id, group_id, request_kind, loan_applications!inner(id, client_id, assigned_to)')
            .eq('id', id)
            .single()

          if (!error && data && (data as any).group_id === groupParam) {
            requestRow = data
            loanApplication = (data as any).loan_applications ?? null
            isAuthorized = true
          }
        }
      } else {
        // Single request token
        if (verifyRequestToken(token, id)) {
          const { data, error } = await admin
            .from('document_requests' as any)
            .select('id, request_kind, loan_applications!inner(id, client_id, assigned_to)')
            .eq('id', id)
            .single()

          if (!error && data) {
            requestRow = data
            loanApplication = (data as any).loan_applications ?? null
            isAuthorized = true
          }
        }
      }
    } else {
      // Session-based authorization
      const supabase = await createServerSupabaseClient()
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await admin
          .from('document_requests' as any)
          .select('id, request_kind, loan_applications!inner(id, client_id, assigned_to)')
          .eq('id', id)
          .single()

        if (!error && data && (data as any).loan_applications.client_id === user.id) {
          requestRow = data
          submittedBy = user.id
          loanApplication = (data as any).loan_applications ?? null
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized || !requestRow) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { request_kind } = requestRow as { request_kind: string }

    if (request_kind === 'document') {
      return NextResponse.json(
        { error: 'Use the upload endpoint for document requests' },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as SubmissionBody
    if (!body || typeof body.form_data !== 'object' || body.form_data === null) {
      return NextResponse.json(
        { error: 'form_data payload is required' },
        { status: 400 }
      )
    }

    const formData = body.form_data

    const nowIso = new Date().toISOString()

    const { data: submission, error: insertErr } = await admin
      .from('request_form_submissions' as any)
      // @ts-ignore
      .insert({
        document_request_id: id,
        submitted_by: submittedBy,
        form_data: formData,
        submitted_at: nowIso,
        updated_at: nowIso
      })
      .select('id')
      .single()

    if (insertErr || !submission) {
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to save submission' },
        { status: 400 }
      )
    }

    const submissionRecord = submission as { id: string }

    await admin
      .from('document_requests' as any)
      // @ts-ignore
      .update({
        status: 'uploaded',
        uploaded_meta: {
          form_submission: true,
          submitted_at: nowIso
        },
        updated_at: nowIso
      })
      .eq('id', id)

    const loanApplicationId = loanApplication?.id ?? null
    const clientId = loanApplication?.client_id ?? submittedBy ?? null

    let clientName: string | null = null
    if (clientId) {
      const { data: clientProfile } = await admin
        .from('users' as any)
        .select('first_name, last_name, email')
        .eq('id', clientId)
        .maybeSingle()

      if (clientProfile) {
        const firstName = (clientProfile as any).first_name as string | null
        const lastName = (clientProfile as any).last_name as string | null
        clientName = [firstName, lastName].filter(Boolean).join(' ').trim() || (clientProfile as any).email || null
      }
    }

    const submissionMetadata: RequestSubmissionNotificationMetadata = {
      type: 'request_submission',
      requestId: id,
      requestKind: request_kind,
      submissionId: submissionRecord.id,
      clientId: clientId ?? null,
      clientName: clientName,
      loanApplicationId,
      submittedAt: nowIso
    }

    const kindLabels: Record<string, { title: string; category: NotificationCategory; message: string }> = {
      employment: {
        title: 'Employment information received',
        category: 'employment_request_submission',
        message: 'A client completed an employment information request.'
      },
      reference: {
        title: 'Reference details submitted',
        category: 'reference_request_submission',
        message: 'A client completed a reference request.'
      },
      address: {
        title: 'Address details submitted',
        category: 'address_request_submission',
        message: 'A client completed an address verification request.'
      },
      document: {
        title: 'Document uploaded',
        category: 'document_request_submission',
        message: 'A client uploaded requested documents.'
      },
      other: {
        title: 'Request completed',
        category: 'other_request_submission',
        message: 'A client completed a pending request.'
      }
    }

    const notificationConfig = kindLabels[request_kind] ?? kindLabels.other

    const recipientIds = new Set<string>()
    if (loanApplication?.assigned_to) {
      recipientIds.add(loanApplication.assigned_to)
    } else {
      const { data: adminStaff } = await admin
        .from('staff' as any)
        .select('id')
        .eq('role', 'admin')

      adminStaff?.forEach((staff: { id: string }) => {
        if (staff?.id) {
          recipientIds.add(staff.id)
        }
      })
    }

    const notificationMessage = clientName
      ? notificationConfig.message.replace('A client', clientName)
      : notificationConfig.message

    await Promise.all(
      Array.from(recipientIds).map(recipientId =>
        createNotification(
          {
            recipientId,
            recipientType: 'staff' as NotificationRecipient,
            title: notificationConfig.title,
            message: notificationMessage,
            category: notificationConfig.category,
            metadata: submissionMetadata
          },
          { client: admin }
        )
      )
    )

    return NextResponse.json({ success: true, submission_id: submissionRecord.id })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


