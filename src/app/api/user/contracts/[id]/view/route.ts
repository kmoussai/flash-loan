import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient, createServerSupabaseClient } from '@/src/lib/supabase/server'

/**
 * GET /api/user/contracts/[id]/view
 * Streams the contract PDF directly to avoid JWT expiration issues with signed URLs
 * Returns the PDF file as a stream
 * Only accessible by the contract owner (client)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id
    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID is required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    // Use admin client to fetch contract (bypasses RLS for storage access)
    // But we'll verify ownership manually
    const adminClient = createServerSupabaseAdminClient()

    // Get contract and verify ownership
    const { data: contract, error: contractError } = await (adminClient as any)
      .from('loan_contracts')
      .select(`
        id,
        contract_document_path,
        contract_status,
        client_signed_at,
        created_at,
        loan_applications!inner (
          id,
          client_id
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      console.error('[GET /api/user/contracts/:id/view] Error fetching contract:', contractError)
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Verify the contract belongs to the authenticated user
    if ((contract as any).loan_applications.client_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this contract' },
        { status: 403 }
      )
    }

    // If no document path, return error
    if (!contract.contract_document_path) {
      console.log('[Contract View] No contract document path found', {
        contractId,
        contractStatus: contract.contract_status
      })
      return NextResponse.json(
        { error: 'Contract PDF not found' },
        { status: 404 }
      )
    }

    const bucket = adminClient.storage.from('contracts')
    const documentPath = contract.contract_document_path
    
    console.log('[Contract View] Fetching contract PDF', {
      contractId: contract.id,
      documentPath,
      contractStatus: contract.contract_status,
      userId: user.id
    })

    // Download the file directly from storage (no signed URL needed)
    const { data: fileData, error: downloadError } = await bucket.download(documentPath)

    if (downloadError || !fileData) {
      console.error(
        '[GET /api/user/contracts/:id/view] Failed to download PDF:',
        {
          error: downloadError,
          documentPath,
          contractId: contract.id
        }
      )
      
      return NextResponse.json(
        { error: 'Failed to download contract PDF', details: downloadError?.message },
        { status: 500 }
      )
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Stream the PDF directly
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="contract_${contract.id}.pdf"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error: any) {
    console.error(
      '[GET /api/user/contracts/:id/view] Error:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

