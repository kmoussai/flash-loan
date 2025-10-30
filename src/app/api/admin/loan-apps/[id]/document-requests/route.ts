import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

// GET /api/admin/loan-apps/:id/document-requests
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await isStaff(true)
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const appId = params.id
    if (!appId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const admin = createServerSupabaseAdminClient()
    const { data, error } = await admin
      .from('document_requests' as any)
      .select('id, status, expires_at, magic_link_sent_at, uploaded_file_key, created_at, updated_at, document_type:document_type_id(id, name, slug)')
      .eq('loan_application_id', appId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ requests: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


