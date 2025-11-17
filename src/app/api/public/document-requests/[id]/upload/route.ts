import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient, createServerSupabaseClient } from '@/src/lib/supabase/server'
import { verifyRequestToken } from '@/src/lib/security/token'
import { createNotification } from '@/src/lib/supabase'
import type { NotificationCategory } from '@/src/types'

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
    
    let requestRow: any = null

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
            .select('id, group_id, request_kind')
            .eq('id', id)
            .single()
          
          if (!reqErr && reqRow && (reqRow as any).group_id === groupParam) {
            requestRow = reqRow
            isAuthorized = true
          }
        }
      } else {
        // Single request mode: verify token against request ID
        if (verifyRequestToken(token, id)) {
          const { data: reqRow, error: reqErr } = await admin
            .from('document_requests' as any)
            .select('id, request_kind')
            .eq('id', id)
            .single()

          if (!reqErr && reqRow) {
            requestRow = reqRow
            isAuthorized = true
          }
        }
      }
    } else {
      // Session-based auth (authenticated user)
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && id) {
        // Verify the request belongs to this user
        const { data: reqRow, error: reqErr } = await admin
          .from('document_requests' as any)
          .select('id, request_kind, loan_applications!inner(id, client_id)')
          .eq('id', id)
          .single()
        
        if (!reqErr && reqRow && (reqRow as any).loan_applications.client_id === user.id) {
          requestRow = reqRow
          isAuthorized = true
        }
      }
    }
    
    if (!id || !isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!requestRow || (requestRow as any).request_kind !== 'document') {
      return NextResponse.json({ error: 'Uploads are only allowed for document requests' }, { status: 400 })
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

    // Create notifications for admin/support staff about the document upload
    try {
      // Get document request details with loan application and client info
      const { data: requestDetails } = await admin
        .from('document_requests' as any)
        .select(`
          id,
          document_type_id,
          document_type:document_type_id(name, slug),
          loan_applications!inner(
            id,
            client_id,
            assigned_to,
            users:client_id(
              first_name,
              last_name
            )
          )
        `)
        .eq('id', id)
        .single()

      if (requestDetails) {
        const loanApp = (requestDetails as any).loan_applications
        const documentType = (requestDetails as any).document_type
        const documentName = documentType?.name || 'document'
        const clientFirstName = loanApp?.users?.first_name || ''
        const clientLastName = loanApp?.users?.last_name || ''
        const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ').trim() || 'A client'

        // Get all admin and support staff
        const { data: staffMembers } = await admin
          .from('staff' as any)
          .select('id, role')
          .in('role', ['admin', 'support'])

        const staffRecipients = new Set<string>()

        // Add assigned staff member if exists
        if (loanApp?.assigned_to) {
          staffRecipients.add(loanApp.assigned_to)
        }

        // Add all admin and support staff
        staffMembers?.forEach((staff: { id: string } | null) => {
          if (staff?.id) {
            staffRecipients.add(staff.id)
          }
        })

        // Create notifications for all staff recipients
        if (staffRecipients.size > 0) {
          await Promise.all(
            Array.from(staffRecipients).map(staffId =>
              createNotification(
                {
                  recipientId: staffId,
                  recipientType: 'staff',
                  title: 'Document uploaded',
                  message: `${clientName} uploaded ${documentName}.`,
                  category: 'document_uploaded' as NotificationCategory,
                  metadata: {
                    type: 'document_upload' as const,
                    documentRequestId: id,
                    loanApplicationId: loanApp?.id,
                    clientId: loanApp?.client_id,
                    documentType: documentName,
                    fileName: file.name,
                    uploadedAt: new Date().toISOString()
                  }
                },
                { client: admin }
              )
            )
          )
        }
      }
    } catch (notificationError) {
      console.error('[Document Upload] Failed to create staff notification:', notificationError)
      // Don't fail the upload if notification fails
    }

    return NextResponse.json({ success: true, path: `documents/${key}` })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}


