import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

/**
 * GET /api/admin/applications/[id]/contract/view
 * Streams the contract PDF directly to avoid JWT expiration issues with signed URLs
 * Returns the PDF file as a stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

  
  try {
    const applicationId = params.id
    const contractId = request.nextUrl.searchParams.get('contractId')
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createServerSupabaseAdminClient()

    let contract: any = null

    // If contractId is provided, fetch that specific contract directly
    if (contractId) {
      const { data: contractData, error: contractError } = await (adminClient as any)
        .from('loan_contracts')
        .select('id, contract_document_path, contract_status, client_signed_at, created_at, loan_application_id')
        .eq('id', contractId)
        .single()

      if (contractError) {
        console.error('Error fetching contract by ID:', contractError)
        return NextResponse.json(
          { error: 'Failed to fetch contract' },
          { status: 500 }
        )
      }

      if (!contractData) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        )
      }

      // Verify the contract belongs to this application
      if (contractData.loan_application_id !== applicationId) {
        return NextResponse.json(
          { error: 'Contract does not belong to this application' },
          { status: 403 }
        )
      }

      contract = contractData
    } else {
      // Get contract for this application
      // Prioritize signed contracts with document paths, then most recent
      const { data: contracts, error: contractError } = await (adminClient as any)
        .from('loan_contracts')
        .select('id, contract_document_path, contract_status, client_signed_at, created_at')
        .eq('loan_application_id', applicationId)
        .order('created_at', { ascending: false })

      if (contractError) {
        console.error('Error fetching contract:', contractError)
        return NextResponse.json(
          { error: 'Failed to fetch contract' },
          { status: 500 }
        )
      }

      if (!contracts || contracts.length === 0) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        )
      }

      // Find signed contract with document path first
      contract = contracts.find(
        (c: any) => 
          c.contract_status === 'signed' && 
          c.contract_document_path
      )
    }

    // If no contract or no document path, return error
    if (!contract || !contract.contract_document_path) {
      console.log('[Contract View] No contract with document path found', {
        applicationId,
        contractId: contractId || 'not provided',
        contractStatus: contract?.contract_status,
        hasPath: !!contract?.contract_document_path
      })
      return NextResponse.json(
        { error: 'Contract PDF not found' },
        { status: 404 }
      )
    }

    const bucket = adminClient.storage.from('contracts')
    const documentPath = contract.contract_document_path
    
    console.log('[Contract View] Fetching contract PDF', {
      applicationId,
      contractId: contract.id,
      documentPath,
      contractStatus: contract.contract_status
    })

    // Download the file directly from storage (no signed URL needed)
    const { data: fileData, error: downloadError } = await bucket.download(documentPath)

    if (downloadError || !fileData) {
      console.error(
        '[GET /api/admin/applications/:id/contract/view] Failed to download PDF:',
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
      '[GET /api/admin/applications/:id/contract/view] Error:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

