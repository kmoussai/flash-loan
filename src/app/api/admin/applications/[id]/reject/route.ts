import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import type { LoanApplicationUpdate } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/applications/[id]/reject
 * Reject a loan application with a standardized or custom reason.
 *
 * Body:
 * {
 *   rejectionReason: string;        // required (chosen reason label/code)
 *   rejectionComment?: string | null; // optional free-text comment
 * }
 */
export async function POST(
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

    let body: any = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const rawReason = (body?.rejectionReason ?? '').toString().trim()
    const rawComment = (body?.rejectionComment ?? '').toString().trim()

    if (!rawReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // Fetch application to validate current status
    const { data: application, error: appError } = await supabase
      .from('loan_applications')
      .select('id, application_status')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      console.error('[POST /api/admin/applications/:id/reject] Error fetching application:', appError)
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const currentStatus = (application as any).application_status as string
    if (currentStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Application is already rejected' },
        { status: 400 }
      )
    }

    if (currentStatus === 'approved' || currentStatus === 'contract_signed') {
      return NextResponse.json(
        { error: 'Cannot reject an approved or contract-signed application' },
        { status: 400 }
      )
    }

    const finalReason =
      rawComment && rawComment.length > 0
        ? `${rawReason}: ${rawComment}`
        : rawReason

    const updateData: LoanApplicationUpdate = {
      application_status: 'rejected',
      rejection_reason: finalReason
      // rejected_at will be set automatically by DB trigger if null
    }

    const { error: updateError } = await (supabase
      .from('loan_applications') as any)
      .update(updateData)
      .eq('id', applicationId)

    if (updateError) {
      console.error('[POST /api/admin/applications/:id/reject] Error updating application:', updateError)
      return NextResponse.json(
        { error: 'Failed to reject application', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Application rejected successfully.',
      application: {
        id: applicationId,
        status: 'rejected',
        rejection_reason: finalReason
      }
    })
  } catch (error: any) {
    console.error('[POST /api/admin/applications/:id/reject] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


