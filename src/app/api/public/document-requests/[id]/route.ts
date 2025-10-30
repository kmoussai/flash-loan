import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { verifyRequestToken } from '@/src/lib/security/token'

// GET /api/public/document-requests/:id?token=...
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const token = request.nextUrl.searchParams.get('token') || ''
    if (!id || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!verifyRequestToken(token, id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServerSupabaseAdminClient()
    const { data: reqRow, error } = await admin
      .from('document_requests' as any)
      .select('id, status, expires_at, magic_link_sent_at, document_type:document_type_id(name, slug)')
      .eq('id', id)
      .single()

    if (error || !reqRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ request: reqRow })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


