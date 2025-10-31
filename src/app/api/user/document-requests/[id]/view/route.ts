import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient, createServerSupabaseClient } from '@/src/lib/supabase/server'

// GET /api/user/document-requests/:id/view
// Returns signed URL for viewing the uploaded document
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reqId = params.id
    if (!reqId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if token-based (public) or session-based (authenticated)
    const token = request.nextUrl.searchParams.get('token')
    const groupParam = request.nextUrl.searchParams.get('group')
    
    const admin = createServerSupabaseAdminClient()
    
    // Verify access
    let hasAccess = false
    
    if (token && groupParam) {
      // Group token - verify token matches group
      const { verifyRequestToken } = await import('@/src/lib/security/token')
      if (verifyRequestToken(token, groupParam)) {
        const { data: reqRow } = await admin
          .from('document_requests' as any)
          .select('id, group_id')
          .eq('id', reqId)
          .single()
        if (reqRow && (reqRow as any).group_id === groupParam) {
          hasAccess = true
        }
      }
    } else if (token) {
      // Single request token
      const { verifyRequestToken } = await import('@/src/lib/security/token')
      hasAccess = verifyRequestToken(token, reqId)
    } else if (user) {
      // Session-based: verify request belongs to user
      const { data: reqRow, error: reqErr } = await admin
        .from('document_requests' as any)
        .select('id, loan_applications!inner(id, client_id)')
        .eq('id', reqId)
        .single()
      
      if (!reqErr && reqRow && (reqRow as any).loan_applications.client_id === user.id) {
        hasAccess = true
      }
    }
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get the uploaded file key
    const { data: reqRow, error: reqErr } = await admin
      .from('document_requests' as any)
      .select('uploaded_file_key, uploaded_meta')
      .eq('id', reqId)
      .single()
    
    if (reqErr || !reqRow || !(reqRow as any).uploaded_file_key) {
      return NextResponse.json({ error: 'Document not found or not uploaded' }, { status: 404 })
    }
    
    const fileKey = (reqRow as any).uploaded_file_key
    const meta = (reqRow as any).uploaded_meta || {}
    
    // Get signed URL (valid for 1 hour)
    const bucket = admin.storage.from('documents')
    // Remove 'documents/' prefix if present
    const storagePath = fileKey.replace(/^documents\//, '')
    
    const { data: urlData, error: urlError } = await bucket.createSignedUrl(storagePath, 3600)
    
    if (urlError || !urlData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 })
    }
    
    return NextResponse.json({
      signed_url: urlData.signedUrl,
      mime_type: meta.type || 'application/octet-stream',
      file_name: meta.name || 'document'
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

