import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient, createServerSupabaseClient } from '@/src/lib/supabase/server'
import { verifyRequestToken } from '@/src/lib/security/token'

// POST /api/public/document-requests/:id/upload?token=...
// Body: multipart/form-data with field 'file'
// 
// Supports both token-based (public) and session-based (authenticated) uploads
// IMPORTANT: This route uses createServerSupabaseAdminClient() which uses service_role key.
// Service_role should bypass Storage RLS policies, but if policies are still enforced,
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const token = request.nextUrl.searchParams.get('token')
    const groupParam = request.nextUrl.searchParams.get('group')
    const admin = createServerSupabaseAdminClient()
    
    // Authentication: Either token-based OR session-based
    let isAuthorized = false
    
    if (token && id) {
      // Token-based auth (public magic link)
      // For groups: verify token against group ID, then check request belongs to group
      // For single requests: verify token against request ID
      if (groupParam) {
        // Group mode: verify token against group ID
        const groupTokenVerified = verifyRequestToken(token, groupParam)
        if (groupTokenVerified) {
          // Also verify the request belongs to this group
          const { data: reqRow, error: reqErr } = await admin
            .from('document_requests' as any)
            .select('id, group_id')
            .eq('id', id)
            .single()
          
          if (!reqErr && reqRow && (reqRow as any).group_id === groupParam) {
            isAuthorized = true
          }
        }
      } else {
        // Single request mode: verify token against request ID
        isAuthorized = verifyRequestToken(token, id)
      }
    } else {
      // Session-based auth (authenticated user)
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && id) {
        // Verify the request belongs to this user
        const { data: reqRow, error: reqErr } = await admin
          .from('document_requests' as any)
          .select('id, loan_applications!inner(id, client_id)')
          .eq('id', id)
          .single()
        
        if (!reqErr && reqRow && (reqRow as any).loan_applications.client_id === user.id) {
          isAuthorized = true
        }
      }
    }
    
    if (!id || !isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `requests/${id}/${Date.now()}_${sanitizedName}`

    const bucket = admin.storage.from('documents')
    
    // Upload using admin client (service_role bypasses RLS)
    const { error: uploadErr, data: uploadData } = await bucket.upload(key, buffer, {
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    })
    
    if (uploadErr) {
      console.error('[Upload] Storage error:', uploadErr)
      // Provide more helpful error message for RLS violations
      if (uploadErr.message?.includes('row-level security') || uploadErr.message?.includes('policy')) {
        return NextResponse.json({ 
          error: 'Storage policy violation. Ensure migration 20251031172101_fix_documents_storage_admin_upload.sql is applied.',
          details: uploadErr.message 
        }, { status: 403 })
      }
      return NextResponse.json({ error: uploadErr.message }, { status: 400 })
    }

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


