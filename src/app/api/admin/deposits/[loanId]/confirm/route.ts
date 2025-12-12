import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { updateLoan } from '@/src/lib/supabase/loan-helpers'
// Accept Pay calls are disabled
// import { 
//   createCollectionTransactionsForSchedule,
//   getAcceptPayCustomerId,
//   createAcceptPayCustomer
// } from '@/src/lib/supabase/accept-pay-helpers'
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

    // Accept Pay calls are disabled - skipping customer creation and collection transactions
    console.log('Accept Pay calls are disabled - skipping customer creation and collection transactions')
    
    // Ensure Accept Pay customer exists before creating collection transactions
    // DISABLED: Accept Pay calls are currently disabled
    // try {
    //   const customerId = await getAcceptPayCustomerId(loan.user_id, true)
    //   
    //   if (!customerId) {
    //     console.log('Accept Pay customer not found, creating customer for user:', loan.user_id)
    //     const customerResult = await createAcceptPayCustomer(loan.user_id, true)
    //     
    //     if (!customerResult.success || !customerResult.customerId) {
    //       console.error(
    //         'Failed to create Accept Pay customer before deposit confirmation:',
    //         customerResult.error
    //       )
    //       return NextResponse.json(
    //         { 
    //           error: 'Failed to create Accept Pay customer', 
    //           details: customerResult.error || 'Customer creation failed'
    //         },
    //         { status: 500 }
    //       )
    //     }
    //     
    //     console.log('Created Accept Pay customer:', customerResult.customerId, 'for user:', loan.user_id)
    //   }
    // } catch (customerError: any) {
    //   console.error('Error checking/creating Accept Pay customer:', customerError)
    //   return NextResponse.json(
    //     { 
    //       error: 'Failed to ensure Accept Pay customer exists', 
    //       details: customerError.message 
    //     },
    //     { status: 500 }
    //   )
    // }

    // Create Accept Pay collection transactions for all payment schedules
    // DISABLED: Accept Pay calls are currently disabled
    // try {
    //   await createCollectionTransactionsForSchedule(loanId, true)
    // } catch (collectionError: any) {
    //   console.error('Error creating collection transactions:', collectionError)
    //   // Don't fail the whole operation, but log the error
    //   // The admin can manually create collections later if needed
    // }

    return NextResponse.json({
      success: true,
      message: 'Deposit confirmed successfully. Loan is now active. (Accept Pay collection transactions are disabled)',
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

