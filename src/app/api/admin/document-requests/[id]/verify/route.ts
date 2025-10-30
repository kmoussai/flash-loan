import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

// POST /api/admin/document-requests/:id/verify
// Body: { status: 'verified' | 'rejected' }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hasStaff = await isStaff(true)
    if (!hasStaff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reqId = params.id
    if (!reqId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const status: 'verified' | 'rejected' | undefined = body?.status
    if (!status || !['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const admin = createServerSupabaseAdminClient()
    const { error } = await admin
      .from('document_requests' as any)
      // @ts-ignore
      .update({ status })
      .eq('id', reqId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


