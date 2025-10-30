import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { verifyRequestToken } from '@/src/lib/security/token'

// POST /api/public/document-requests/:id/upload?token=...
// Body: multipart/form-data with field 'file'
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const token = request.nextUrl.searchParams.get('token') || ''
    if (!id || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!verifyRequestToken(token, id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    const admin = createServerSupabaseAdminClient()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `requests/${id}/${Date.now()}_${sanitizedName}`

    const bucket = admin.storage.from('documents')
    const { error: uploadErr } = await bucket.upload(key, buffer, {
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 })

    // Mark uploaded and log upload
    await admin
      .from('document_requests' as any)
      // @ts-ignore
      .update({ status: 'uploaded', uploaded_file_key: `documents/${key}`, uploaded_meta: { name: file.name, size: file.size, type: file.type } })
      .eq('id', id)

    await admin
      .from('document_uploads' as any)
      // @ts-ignore
      .insert({ document_request_id: id, file_key: `documents/${key}`, meta: { name: file.name, size: file.size, type: file.type } })

    return NextResponse.json({ success: true, path: `documents/${key}` })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


