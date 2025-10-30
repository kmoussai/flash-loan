import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient, createServerSupabaseClient } from '@/src/lib/supabase/server'

// GET /api/user/document-requests
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use admin client to make the join easier and ignore RLS
    const admin = createServerSupabaseAdminClient()
    const { data, error } = await admin
      .from('document_requests' as any)
      .select('id, status, expires_at, magic_link_sent_at, document_type:document_type_id(name, slug), loan_applications!inner(id, client_id)')
      .eq('loan_applications.client_id', user.id)
      .in('status', ['requested', 'uploaded'])
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ requests: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


