import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

/**
 * GET /api/admin/applications/[id]/contract/view
 * Returns signed URL for viewing the contract PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createServerSupabaseAdminClient()

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
      return NextResponse.json({
        signed_url: null,
        has_pdf: false
      })
    }

    // Find signed contract with document path first
    let contract = contracts.find(
      (c: any) => 
        c.contract_status === 'signed' && 
        c.contract_document_path
    )

    // If no signed contract with PDF, find any contract with document path
    if (!contract) {
      contract = contracts.find((c: any) => c.contract_document_path)
    }

    // If still no contract with document path, use most recent contract
    if (!contract) {
      contract = contracts[0]
    }

    // If no contract or no document path, return null (will fallback to HTML generation)
    if (!contract || !contract.contract_document_path) {
      console.log('[Contract View] No contract with document path found', {
        applicationId,
        contractsFound: contracts.length,
        contracts: contracts.map((c: any) => ({
          id: c.id,
          status: c.contract_status,
          hasPath: !!c.contract_document_path,
          signedAt: c.client_signed_at
        }))
      })
      return NextResponse.json({
        signed_url: null,
        has_pdf: false
      })
    }

    // Generate signed URL (valid for 1 hour)
    const bucket = adminClient.storage.from('contracts')
    const documentPath = contract.contract_document_path
    
    console.log('[Contract View] Generating signed URL for contract', {
      applicationId,
      contractId: contract.id,
      documentPath,
      contractStatus: contract.contract_status,
      clientSignedAt: contract.client_signed_at
    })

    const { data: urlData, error: urlError } = await bucket.createSignedUrl(
      documentPath,
      3600 // 1 hour expiry
    )

    if (urlError || !urlData?.signedUrl) {
      console.error(
        '[GET /api/admin/applications/:id/contract/view] Failed to generate signed URL:',
        {
          error: urlError,
          documentPath,
          contractId: contract.id
        }
      )
      return NextResponse.json({
        signed_url: null,
        has_pdf: true,
        error: 'Failed to generate view URL',
        details: urlError?.message || 'Unknown error'
      })
    }

    console.log('[Contract View] Successfully generated signed URL', {
      applicationId,
      contractId: contract.id
    })

    return NextResponse.json({
      signed_url: urlData.signedUrl,
      has_pdf: true
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

