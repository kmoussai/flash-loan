import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

// GET /api/admin/document-types
export async function GET(_request: NextRequest) {
  try {
    const staff = await isStaff(true)
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = createServerSupabaseAdminClient()
    const { data, error } = await admin
      .from('document_types' as any)
      .select('id, name, slug, mime_whitelist, max_size_bytes, default_request_kind, default_form_schema, description')
      .order('name', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ document_types: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


