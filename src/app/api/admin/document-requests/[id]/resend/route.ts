import { NextRequest, NextResponse } from 'next/server'
import { isStaff, sendDocumentRequestMagicLink } from '@/src/lib/supabase/admin-helpers'

// POST /api/admin/document-requests/:id/resend
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reqId = params.id
    if (!reqId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const hasStaff = await isStaff(true)
    if (!hasStaff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await sendDocumentRequestMagicLink(reqId)
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to resend' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, email: result.email, redirectTo: result.redirectTo })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


