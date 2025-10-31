import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient
} from '@/src/lib/supabase/server'
import { signRequestToken } from '@/src/lib/security/token'

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

    // Build a single group link instead of sending per-request links
    const createdIds = (inserted || []).map((r: any) => r.id)
    const { getAppUrl } = await import('@/src/lib/config')
    // Determine expiry for token
    const expMs = expiresAt ? new Date(expiresAt).getTime() : null
    let group_link: string | null = null
    if (expMs && !isNaN(expMs) && Date.now() < expMs) {
      const { data: appPref } = await admin
        .from('loan_applications' as any)
        .select('users:client_id(preferred_language)')
        .eq('id', loanApplicationId)
        .single()
      const preferredLanguage: 'en' | 'fr' =
        (appPref as any)?.users?.preferred_language === 'fr' ? 'fr' : 'en'
      const token = signRequestToken(groupId, expMs)
      group_link = `${getAppUrl()}/${preferredLanguage}/upload-documents?group=${encodeURIComponent(groupId)}&token=${encodeURIComponent(token)}`
      console.log('group_link', group_link)
    } else {
      console.log('no group link')
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
      skipped: skipped.length > 0 ? skipped : undefined
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
