import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { isStaff } from '@/src/lib/supabase/admin-helpers'

// GET /api/admin/document-requests/:id/view
// Returns signed URL for viewing the uploaded document (admin only)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await isStaff(true)
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reqId = params.id
    if (!reqId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = createServerSupabaseAdminClient()
    
    // Get the uploaded file key, document type, and client information
    const { data: reqRow, error: reqErr } = await admin
      .from('document_requests' as any)
      .select(`
        uploaded_file_key,
        uploaded_meta,
        document_type_id,
        document_type:document_type_id(id, slug, name),
        loan_applications!inner(
          client_id,
          users:client_id(
            id,
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            national_id
          )
        )
      `)
      .eq('id', reqId)
      .single()
    
    if (reqErr || !reqRow || !(reqRow as any).uploaded_file_key) {
      return NextResponse.json({ error: 'Document not found or not uploaded' }, { status: 404 })
    }
    
    const fileKey = (reqRow as any).uploaded_file_key
    const meta = (reqRow as any).uploaded_meta || {}
    const documentType = (reqRow as any).document_type
    const loanApplication = (reqRow as any).loan_applications
    
    // Check if this is an ID document
    const documentSlug = documentType?.slug?.toLowerCase() || ''
    const documentName = documentType?.name?.toLowerCase() || ''
    const isIdDocument = 
      documentSlug.includes('id') ||
      documentSlug.includes('passport') ||
      documentSlug.includes('driver') ||
      documentSlug.includes('license') ||
      documentName.includes('id') ||
      documentName.includes('passport') ||
      documentName.includes('driver') ||
      documentName.includes('license')
    
    // Get signed URL (valid for 1 hour)
    const bucket = admin.storage.from('documents')
    // Remove 'documents/' prefix if present
    const storagePath = fileKey.replace(/^documents\//, '')
    
    const { data: urlData, error: urlError } = await bucket.createSignedUrl(storagePath, 3600)
    
    if (urlError || !urlData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 })
    }
    
    const response: any = {
      signed_url: urlData.signedUrl,
      mime_type: meta.type || 'application/octet-stream',
      file_name: meta.name || 'document',
      is_id_document: isIdDocument
    }
    
    // Include client information for ID documents
    if (isIdDocument && loanApplication?.users) {
      response.client_info = {
        first_name: loanApplication.users.first_name,
        last_name: loanApplication.users.last_name,
        email: loanApplication.users.email,
        phone: loanApplication.users.phone,
        date_of_birth: loanApplication.users.date_of_birth,
        national_id: loanApplication.users.national_id
      }
    }
    
    return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

