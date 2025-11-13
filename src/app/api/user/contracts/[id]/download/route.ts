import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient, createServerSupabaseClient } from '@/src/lib/supabase/server'

/**
 * GET /api/user/contracts/[id]/download
 * Returns signed URL for downloading the signed contract PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id
    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createServerSupabaseAdminClient()

    // Get contract and verify ownership
    const { data: contract, error: contractError } = await (adminClient as any)
      .from('loan_contracts')
      .select(`
        id,
        contract_document_path,
        loan_applications!inner (
          id,
          client_id
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Verify the contract belongs to the authenticated user
    if ((contract as any).loan_applications.client_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const documentPath = (contract as any).contract_document_path
    if (!documentPath) {
      return NextResponse.json(
        { error: 'Contract document not found' },
        { status: 404 }
      )
    }

    // Generate signed URL (valid for 1 hour)
    // documentPath should already be without bucket prefix (e.g., "{contract_id}/signed_{date}_{contract_id}.pdf")
    const bucket = adminClient.storage.from('contracts')
    const { data: urlData, error: urlError } = await bucket.createSignedUrl(
      documentPath,
      3600
    )

    if (urlError || !urlData?.signedUrl) {
      console.error(
        '[GET /api/user/contracts/:id/download] Failed to generate signed URL:',
        urlError
      )
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      signed_url: urlData.signedUrl,
      file_name: `contract_${contractId}.pdf`
    })
  } catch (error: any) {
    console.error(
      '[GET /api/user/contracts/:id/download] Error:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

