import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient, createServerSupabaseClient } from '@/src/lib/supabase/server'

// POST /api/user/document-requests/:id/upload-complete
// Body: { file_key: string, meta?: any }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reqId = params.id
    if (!reqId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const fileKey: string | undefined = body?.file_key
    const meta: any = body?.meta || {}
    if (!fileKey) return NextResponse.json({ error: 'file_key is required' }, { status: 400 })

    const admin = createServerSupabaseAdminClient()
    // Ensure request belongs to the user via join
    const { data: reqRow, error: reqErr } = await admin
      .from('document_requests' as any)
      .select('id, status, loan_applications!inner(id, client_id)')
      .eq('id', reqId)
      .single()

    if (reqErr || !reqRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    if ((reqRow as any).loan_applications.client_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update request status and file key, append to uploads history
    await admin
      .from('document_requests' as any)
      // @ts-ignore
      .update({ status: 'uploaded', uploaded_file_key: fileKey, uploaded_meta: meta })
      .eq('id', reqId)

    await admin
      .from('document_uploads' as any)
      // @ts-ignore
      .insert({ document_request_id: reqId, file_key: fileKey, meta })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


