import { NextRequest, NextResponse } from 'next/server'
import { syncLoanPaymentsToZumRails } from '@/src/lib/payment-providers/zumrails'
import { requireAdmin, createAuthErrorResponse } from '@/src/lib/supabase/api-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/loans/[id]/sync
 * Trigger sync of loan payments to ZumRails for a specific loan
 * Admin/Staff only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const authResult = await requireAdmin()
    if (!authResult.authorized) {
      return createAuthErrorResponse(authResult)
    }

    const loanId = params.id

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      )
    }

    // Trigger sync for this specific loan
    const result = await syncLoanPaymentsToZumRails({
      loanId,
      limit: 1000 // High limit to ensure all payments for this loan are processed
    })

    // Log detailed error information
    if (result.failed > 0 && result.errors && result.errors.length > 0) {
      console.error(`[Sync Loan] ${result.failed} payments failed for loan ${loanId}:`)
      result.errors.forEach((error, index) => {
        console.error(
          `[Sync Loan] Error ${index + 1}/${result.errors.length}:`,
          {
            loanPaymentId: error.loanPaymentId,
            error: error.error
          }
        )
      })
    }

    // Log success summary
    console.log(
      `[Sync Loan] Loan ${loanId} sync completed:`,
      {
        processed: result.processed,
        created: result.created,
        failed: result.failed,
        success: result.success
      }
    )

    return NextResponse.json({
      success: result.success,
      message: `Sync completed: ${result.created} created, ${result.failed} failed out of ${result.processed} processed`,
      result: {
        ...result,
        // Include detailed error information
        errorDetails: result.errors || []
      }
    })
  } catch (error: any) {
    console.error('[Sync Loan] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync loan payments',
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

