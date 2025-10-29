import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { getUserType } from '@/src/lib/supabase/db-helpers'
import type { IdDocumentInsert, DocumentType } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

// Allowed file types for ID documents
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * GET /api/client/id-documents
 * Fetch all ID documents for the authenticated client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    // Check if user is a client
    const userType = await getUserType(user.id, true)
    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only' },
        { status: 403 }
      )
    }

    // Get client_id from users table
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      )
    }

    // Fetch ID documents
    const { data: documents, error: documentsError } = await supabase
      .from('id_documents')
      .select('*')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching ID documents:', documentsError)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: documentsError.message },
        { status: 500 }
      )
    }

    // Generate signed URLs for file access (valid for 1 hour)
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc) => {
        const { data: urlData } = await supabase.storage
          .from('id-documents')
          .createSignedUrl(doc.file_path, 3600) // 1 hour expiry

        return {
          ...doc,
          signed_url: urlData?.signedUrl || null
        }
      })
    )

    return NextResponse.json({ documents: documentsWithUrls })
  } catch (error: any) {
    console.error('Error fetching ID documents:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/client/id-documents
 * Upload a new ID document
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    // Check if user is a client
    const userType = await getUserType(user.id, true)
    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only' },
        { status: 403 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('document_type') as DocumentType
    const documentName = formData.get('document_name') as string
    const expiresAt = formData.get('expires_at') as string | null

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    if (!documentType || !documentName) {
      return NextResponse.json(
        { error: 'Document type and name are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: JPEG, PNG, WebP, PDF' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Get client_id
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      )
    }

    // Generate unique file path
    const fileExtension = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('id-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Create database record
    const documentData: IdDocumentInsert = {
      client_id: clientData.id,
      document_type: documentType,
      document_name: documentName,
      file_path: uploadData.path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      status: 'pending',
      expires_at: expiresAt || null
    }

    const { data: document, error: insertError } = await supabase
      .from('id_documents')
      .insert(documentData)
      .select()
      .single()

    if (insertError) {
      // If insert fails, delete the uploaded file
      await supabase.storage
        .from('id-documents')
        .remove([uploadData.path])
      
      console.error('Error creating document record:', insertError)
      return NextResponse.json(
        { error: 'Failed to create document record', details: insertError.message },
        { status: 500 }
      )
    }

    // Generate signed URL for the uploaded file
    const { data: urlData } = await supabase.storage
      .from('id-documents')
      .createSignedUrl(uploadData.path, 3600)

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        signed_url: urlData?.signedUrl || null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading ID document:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/client/id-documents?id=documentId
 * Delete a pending ID document
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    // Check if user is a client
    const userType = await getUserType(user.id, true)
    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only' },
        { status: 403 }
      )
    }

    // Get document ID from query params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Get client_id
    const { data: clientData } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    // Verify document belongs to client and is pending
    const { data: document, error: documentError } = await supabase
      .from('id_documents')
      .select('file_path, status')
      .eq('id', documentId)
      .eq('client_id', clientData?.id)
      .eq('status', 'pending')
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: 'Document not found or cannot be deleted' },
        { status: 404 }
      )
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('id-documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('id_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Error deleting document record:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting ID document:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

