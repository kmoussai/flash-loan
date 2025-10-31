import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { verifyRequestToken } from '@/src/lib/security/token'

// GET /api/public/document-request-groups/:id?token=...
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const token = request.nextUrl.searchParams.get('token') || ''
    if (!id || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!verifyRequestToken(token, id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServerSupabaseAdminClient()

    // Validate group
    const { data: groupRow, error: gErr } = await admin
      .from('document_request_groups' as any)
      .select('id, expires_at')
      .eq('id', id)
      .single()

    if (gErr || !groupRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch requests under the group
    const { data: reqs, error } = await admin
      .from('document_requests' as any)
      .select('id, status, expires_at, magic_link_sent_at, document_type:document_type_id(name, slug)')
      .eq('group_id', id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ group: groupRow, requests: reqs || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}



