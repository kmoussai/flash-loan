import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

// DELETE /api/admin/document-requests/:id
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hasStaff = await isStaff(true)
    if (!hasStaff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reqId = params.id
    if (!reqId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = createServerSupabaseAdminClient()

    // Check if request exists and get the uploaded file key to optionally delete from storage
    const { data: reqData } = await admin
      .from('document_requests' as any)
      .select('uploaded_file_key, loan_applications!inner(client_id)')
      .eq('id', reqId)
      .single()

    // Delete the request (this will cascade to document_uploads via foreign key)
    const { error } = await admin
      .from('document_requests' as any)
      .delete()
      .eq('id', reqId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Optionally delete uploaded file from storage if it exists
    if (reqData?.uploaded_file_key) {
      const fileKey = reqData.uploaded_file_key as string
      // Extract user_id from path: documents/{user_id}/{request_id}/filename
      const parts = fileKey.split('/')
      if (parts.length >= 2 && parts[0] === 'documents') {
        const userId = parts[1]
        const fullPath = `${userId}/${parts.slice(2).join('/')}`
        await admin.storage
          .from('documents')
          .remove([fullPath])
          .catch((err) => {
            console.error('[DELETE document-requests] Failed to delete file from storage:', err)
            // Don't fail the request if storage delete fails
          })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

