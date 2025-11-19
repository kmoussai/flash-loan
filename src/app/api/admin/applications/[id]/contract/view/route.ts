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
    const { data: contract, error: contractError } = await (adminClient as any)
      .from('loan_contracts')
      .select('id, contract_document_path')
      .eq('loan_application_id', applicationId)
      .maybeSingle()

    if (contractError) {
      console.error('Error fetching contract:', contractError)
      return NextResponse.json(
        { error: 'Failed to fetch contract' },
        { status: 500 }
      )
    }

    // If no contract or no document path, return null (will fallback to HTML generation)
    if (!contract || !contract.contract_document_path) {
      return NextResponse.json({
        signed_url: null,
        has_pdf: false
      })
    }

    // Generate signed URL (valid for 1 hour)
    const bucket = adminClient.storage.from('contracts')
    const { data: urlData, error: urlError } = await bucket.createSignedUrl(
      contract.contract_document_path,
      3600 // 1 hour expiry
    )

    if (urlError || !urlData?.signedUrl) {
      console.error(
        '[GET /api/admin/applications/:id/contract/view] Failed to generate signed URL:',
        urlError
      )
      return NextResponse.json({
        signed_url: null,
        has_pdf: true,
        error: 'Failed to generate view URL'
      })
    }

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

