import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient
} from '@/src/lib/supabase/server'
import { signRequestToken } from '@/src/lib/security/token'
import { sendEmail } from '@/src/lib/email/smtp'
import { generateDocumentRequestEmail } from '@/src/lib/email/templates/document-request'

// POST /api/admin/loan-apps/:id/request-docs
// Body: { document_type_ids: string[], expires_at?: string, requested_by?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loanApplicationId = params.id
    if (!loanApplicationId) {
      return NextResponse.json(
        { error: 'Missing loan application id' },
        { status: 400 }
      )
    }

    // Require staff
    const hasStaff = await isStaff(true)
    if (!hasStaff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const documentTypeIds: string[] = Array.isArray(body?.document_type_ids)
      ? body.document_type_ids
      : []
    let expiresAt: string | undefined = body?.expires_at

    if (!documentTypeIds.length) {
      return NextResponse.json(
        { error: 'document_type_ids is required' },
        { status: 400 }
      )
    }

    const admin = createServerSupabaseAdminClient()

    // Ensure loan application exists
    const { data: appRow, error: appErr } = await admin
      .from('loan_applications' as any)
      .select('id')
      .eq('id', loanApplicationId)
      .single()

    if (appErr || !appRow) {
      return NextResponse.json(
        { error: 'Loan application not found' },
        { status: 404 }
      )
    }

    // Check for existing requests with same document types
    const { data: existingRequests, error: checkErr } = await admin
      .from('document_requests' as any)
      .select('document_type_id, status')
      .eq('loan_application_id', loanApplicationId)
      .in('document_type_id', documentTypeIds)
      .in('status', ['requested', 'uploaded'])

    if (checkErr) {
      return NextResponse.json(
        { error: 'Failed to check existing requests' },
        { status: 400 }
      )
    }

    // Filter out document types that already have pending/active requests
    const existingTypeIds = new Set(
      (existingRequests || []).map((r: any) => r.document_type_id)
    )
    const newDocumentTypeIds = documentTypeIds.filter(
      dt => !existingTypeIds.has(dt)
    )

    if (newDocumentTypeIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'All selected document types already have pending or active requests',
          skipped: documentTypeIds
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const nowIso = now.toISOString()
    // Default expiry: 7 days from now if not provided
    if (!expiresAt) {
      const def = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      expiresAt = def.toISOString()
    }

    // Create a group for this set of requests
    const { data: groupRow, error: groupErr } = await admin
      .from('document_request_groups' as any)
      // @ts-ignore
      .insert({
        loan_application_id: loanApplicationId,
        expires_at: expiresAt || null,
        created_at: nowIso,
        updated_at: nowIso
      })
      .select('id')
      .single()

    if (groupErr || !groupRow) {
      return NextResponse.json(
        { error: groupErr?.message || 'Failed to create request group' },
        { status: 400 }
      )
    }

    const groupId = (groupRow as any).id as string

    const rowsToInsert = newDocumentTypeIds.map(dt => ({
      loan_application_id: loanApplicationId,
      document_type_id: dt,
      group_id: groupId,
      status: 'requested',
      expires_at: expiresAt || null,
      created_at: nowIso,
      updated_at: nowIso
    }))

    const { data: inserted, error: insErr } = await admin
      .from('document_requests' as any)
      // @ts-ignore
      .insert(rowsToInsert)
      .select('id')

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 })
    }

    // Get client information for email
    const { data: appWithUser, error: userErr } = await admin
      .from('loan_applications' as any)
      .select('users:client_id(id, first_name, last_name, email, preferred_language)')
      .eq('id', loanApplicationId)
      .single()

    // Build a single group link instead of sending per-request links
    const createdIds = (inserted || []).map((r: any) => r.id)
    const { getAppUrl } = await import('@/src/lib/config')
    // Determine expiry for token
    const expMs = expiresAt ? new Date(expiresAt).getTime() : null
    let group_link: string | null = null
    let preferredLanguage: 'en' | 'fr' = 'en'
    
    if (expMs && !isNaN(expMs) && Date.now() < expMs) {
      preferredLanguage =
        (appWithUser as any)?.users?.preferred_language === 'fr' ? 'fr' : 'en'
      const token = signRequestToken(groupId, expMs)
      group_link = `${getAppUrl()}/${preferredLanguage}/upload-documents?group=${encodeURIComponent(groupId)}&token=${encodeURIComponent(token)}`
    }

    // Get document type names for email
    const { data: docTypes, error: docTypesErr } = await admin
      .from('document_types' as any)
      .select('id, name')
      .in('id', newDocumentTypeIds)

    // Send email if we have client email and group link
    let emailSent = false
    let emailError: string | null = null
    
    if (group_link && appWithUser && (appWithUser as any)?.users?.email) {
      const clientEmail = (appWithUser as any).users.email
      const clientFirstName = (appWithUser as any).users.first_name || ''
      const clientLastName = (appWithUser as any).users.last_name || ''
      const applicantName = `${clientFirstName} ${clientLastName}`.trim() || 'Valued Customer'
      const documentNames = (docTypes || []).map((dt: any) => dt.name)

      if (documentNames.length > 0) {
        const emailContent = generateDocumentRequestEmail({
          applicantName,
          documentNames,
          uploadLink: group_link,
          preferredLanguage,
          expiresAt: expiresAt || null
        })

        const emailResult = await sendEmail({
          to: clientEmail,
          subject: emailContent.subject,
          html: emailContent.html
        })

        emailSent = emailResult.success
        emailError = emailResult.error || null

        if (emailSent) {
          // Update all requests in the group with magic_link_sent_at
          await admin
            .from('document_requests' as any)
            // @ts-ignore
            .update({ magic_link_sent_at: nowIso })
            .eq('group_id', groupId)
        }
      }
    }

    // Include information about which types were skipped
    const skipped = documentTypeIds.filter(
      dt => !newDocumentTypeIds.includes(dt)
    )

    return NextResponse.json({
      ok: true,
      group_id: groupId,
      group_link,
      request_ids: createdIds,
      skipped: skipped.length > 0 ? skipped : undefined,
      email_sent: emailSent,
      email_error: emailError || undefined
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
