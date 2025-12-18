import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { updateLoan } from '@/src/lib/supabase/loan-helpers'
import { syncLoanPaymentsToZumRails } from '@/src/lib/payment-providers/zumrails'
import { Loan } from '@/src/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/deposits/[loanId]/confirm
 * Confirm manual deposit: update loan status to active and create collection transactions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const loanId = params.loanId
    const supabase = createServerSupabaseAdminClient()

    // Verify loan exists and is in pending_disbursement status
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, status, principal_amount, user_id')
      .eq('id', loanId)
      .single<Loan & { user_id: string }>()

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    if (loan.status !== 'pending_disbursement') {
      return NextResponse.json(
        { error: `Loan is not in pending_disbursement status. Current status: ${loan.status}` },
        { status: 400 }
      )
    }

    // Update loan status to active
    const updateResult = await updateLoan(
      loanId,
      {
        status: 'active',
        disbursement_date: new Date().toISOString().split('T')[0]
      },
      { isServer: true, useAdminClient: true }
    )

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error || 'Failed to update loan status' },
        { status: 500 }
      )
    }

    // Create ZumRails collection transactions for all pending loan payments
    // This runs in the background and doesn't block the response
    syncLoanPaymentsToZumRails({ loanId })
      .then((syncResult) => {
        if (syncResult.success) {
          console.log(
            `[Confirm Deposit] Created ${syncResult.created} ZumRails transaction(s) for loan ${loanId}`
          )
        } else {
          console.warn(
            `[Confirm Deposit] ZumRails transaction creation completed with warnings for loan ${loanId}:`,
            {
              created: syncResult.created,
              failed: syncResult.failed,
              errors: syncResult.errors
            }
          )
        }
      })
      .catch((syncError: any) => {
        console.error(
          `[Confirm Deposit] Error creating ZumRails transactions for loan ${loanId}:`,
          syncError
        )
        // Don't fail the request - transactions can be created manually later
      })

    return NextResponse.json({
      success: true,
      message: 'Deposit confirmed successfully. Loan is now active. ZumRails transactions are being created in the background.',
      loan: {
        id: loan.id,
        status: 'active'
      }
    })
  } catch (error: any) {
    console.error('Error confirming deposit:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

