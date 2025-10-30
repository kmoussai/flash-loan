import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient, createServerSupabaseClient } from '@/src/lib/supabase/server'
import { sendDocumentRequestMagicLink } from '@/src/lib/supabase/admin-helpers'

// POST /api/admin/loan-apps/:id/request-docs
// Body: { document_type_ids: string[], expires_at?: string, requested_by?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loanApplicationId = params.id
    if (!loanApplicationId) {
      return NextResponse.json({ error: 'Missing loan application id' }, { status: 400 })
    }

    // Require staff
    const hasStaff = await isStaff(true)
    if (!hasStaff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const documentTypeIds: string[] = Array.isArray(body?.document_type_ids) ? body.document_type_ids : []
    const expiresAt: string | undefined = body?.expires_at

    if (!documentTypeIds.length) {
      return NextResponse.json({ error: 'document_type_ids is required' }, { status: 400 })
    }

    const admin = createServerSupabaseAdminClient()

    // Ensure loan application exists
    const { data: appRow, error: appErr } = await admin
      .from('loan_applications' as any)
      .select('id')
      .eq('id', loanApplicationId)
      .single()

    if (appErr || !appRow) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 })
    }

    // Check for existing requests with same document types
    const { data: existingRequests, error: checkErr } = await admin
      .from('document_requests' as any)
      .select('document_type_id, status')
      .eq('loan_application_id', loanApplicationId)
      .in('document_type_id', documentTypeIds)
      .in('status', ['requested', 'uploaded'])

    if (checkErr) {
      return NextResponse.json({ error: 'Failed to check existing requests' }, { status: 400 })
    }

    // Filter out document types that already have pending/active requests
    const existingTypeIds = new Set((existingRequests || []).map((r: any) => r.document_type_id))
    const newDocumentTypeIds = documentTypeIds.filter(dt => !existingTypeIds.has(dt))

    if (newDocumentTypeIds.length === 0) {
      return NextResponse.json({ 
        error: 'All selected document types already have pending or active requests',
        skipped: documentTypeIds 
      }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const rowsToInsert = newDocumentTypeIds.map((dt) => ({
      loan_application_id: loanApplicationId,
      document_type_id: dt,
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

    // Send magic link for each created request
    const createdIds = (inserted || []).map((r: any) => r.id)
    await Promise.all(createdIds.map((id: string) => sendDocumentRequestMagicLink(id)))

    // Include information about which types were skipped
    const skipped = documentTypeIds.filter(dt => !newDocumentTypeIds.includes(dt))

    return NextResponse.json({ 
      ok: true, 
      request_ids: createdIds,
      skipped: skipped.length > 0 ? skipped : undefined
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


