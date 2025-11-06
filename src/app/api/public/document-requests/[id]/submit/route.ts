import { NextRequest, NextResponse } from 'next/server'
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient
} from '@/src/lib/supabase/server'
import { verifyRequestToken } from '@/src/lib/security/token'

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

    if (token) {
      if (groupParam) {
        // Verify token against the group and ensure the request belongs to that group
        if (verifyRequestToken(token, groupParam)) {
          const { data, error } = await admin
            .from('document_requests' as any)
            .select('id, group_id, request_kind')
            .eq('id', id)
            .single()

          if (!error && data && (data as any).group_id === groupParam) {
            requestRow = data
            isAuthorized = true
          }
        }
      } else {
        // Single request token
        if (verifyRequestToken(token, id)) {
          const { data, error } = await admin
            .from('document_requests' as any)
            .select('id, request_kind')
            .eq('id', id)
            .single()

          if (!error && data) {
            requestRow = data
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
          .select('id, request_kind, loan_applications!inner(id, client_id)')
          .eq('id', id)
          .single()

        if (!error && data && (data as any).loan_applications.client_id === user.id) {
          requestRow = data
          submittedBy = user.id
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

    return NextResponse.json({ success: true, submission_id: submissionRecord.id })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


