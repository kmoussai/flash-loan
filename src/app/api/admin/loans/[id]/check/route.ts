import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { requireAdmin, createAuthErrorResponse } from '@/src/lib/supabase/api-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/loans/[id]/check
 * Check if all pending payments for a loan have corresponding ZumRails transactions
 * Admin/Staff only
 */
export async function GET(
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

    const supabase = await createServerSupabaseAdminClient()

    // Step 1: Get all payments for this loan (we need to check both pending and non-pending)
    const { data: allPayments, error: paymentsError } = await supabase
      .from('loan_payments')
      .select('id, payment_number, amount, payment_date, status')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: true })

    if (paymentsError) {
      console.error('[Check Loan] Error fetching payments:', paymentsError)
      return NextResponse.json(
        {
          error: 'Failed to fetch payments',
          details: paymentsError.message
        },
        { status: 500 }
      )
    }

    if (!allPayments || allPayments.length === 0) {
      return NextResponse.json({
        success: true,
        allPaymentsHaveTransactions: true,
        message: 'No payments found for this loan',
        pendingPaymentsCount: 0,
        paymentsWithTransactions: 0,
        paymentsWithoutTransactions: 0,
        missingTransactions: [],
        scheduledNonPendingPayments: []
      })
    }

    // Separate pending and non-pending payments
    const pendingPayments = allPayments.filter((p: any) => p.status === 'pending')
    const nonPendingPayments = allPayments.filter((p: any) => p.status !== 'pending')

    const allPaymentIds = allPayments.map((p: any) => p.id)

    // Step 2: Get all ZumRails transactions for all payments
    const { data: allTransactions, error: transactionsError } = await supabase
      .from('payment_transactions')
      .select('loan_payment_id, status, provider, provider_data')
      .in('loan_payment_id', allPaymentIds)
      .eq('provider', 'zumrails')

    if (transactionsError) {
      console.error('[Check Loan] Error fetching transactions:', transactionsError)
      return NextResponse.json(
        {
          error: 'Failed to fetch transactions',
          details: transactionsError.message
        },
        { status: 500 }
      )
    }

    // Create a map of payment_id -> transactions
    const transactionsByPaymentId = new Map<string, any[]>()
    ;(allTransactions || []).forEach((tx: any) => {
      if (tx.loan_payment_id) {
        if (!transactionsByPaymentId.has(tx.loan_payment_id)) {
          transactionsByPaymentId.set(tx.loan_payment_id, [])
        }
        transactionsByPaymentId.get(tx.loan_payment_id)!.push(tx)
      }
    })

    // Step 3: Check pending payments - they should have ZumRails transactions
    const pendingPaymentIdsWithTransactions = new Set<string>()
    const paymentsWithoutTransactions: any[] = []

    pendingPayments.forEach((payment: any) => {
      const transactions = transactionsByPaymentId.get(payment.id) || []
      // Check for active transactions (initiated, pending, processing, completed, or scheduled)
      const hasActiveTransaction = transactions.some((tx: any) => {
        const txStatus = tx.status
        // Also check provider_data for ZumRails status
        const providerData = tx.provider_data || {}
        const zumRailsStatus = providerData.transaction_status || txStatus
        
        return ['initiated', 'pending', 'processing', 'completed', 'scheduled'].includes(txStatus?.toLowerCase()) ||
               ['InProgress', 'Scheduled', 'Completed', 'Succeeded'].includes(zumRailsStatus)
      })
      
      if (hasActiveTransaction) {
        pendingPaymentIdsWithTransactions.add(payment.id)
      } else {
        paymentsWithoutTransactions.push(payment)
      }
    })

    // Step 4: Check non-pending payments - if they have ZumRails transactions, 
    // those should NOT be in "Scheduled" status (should be cancelled or completed)
    const scheduledNonPendingPayments: any[] = []

    nonPendingPayments.forEach((payment: any) => {
      const transactions = transactionsByPaymentId.get(payment.id) || []
      
      // Only check if payment has ZumRails transactions
      // If no transactions exist, that's OK (don't flag it)
      if (transactions.length > 0) {
        // Check if any transaction is still in "Scheduled" status
        const hasScheduledTransaction = transactions.some((tx: any) => {
          const txStatus = tx.status?.toLowerCase()
          const providerData = tx.provider_data || {}
          const zumRailsStatus = providerData.transaction_status
          
          // Check if status is "Scheduled" (case-insensitive)
          return txStatus === 'scheduled' || 
                 zumRailsStatus === 'Scheduled' ||
                 (txStatus === 'pending' && zumRailsStatus === 'Scheduled')
        })
        
        if (hasScheduledTransaction) {
          scheduledNonPendingPayments.push({
            paymentId: payment.id,
            paymentNumber: payment.payment_number,
            amount: payment.amount,
            paymentDate: payment.payment_date,
            paymentStatus: payment.status
          })
        }
      }
      // If no transactions, that's OK - don't add to scheduledNonPendingPayments
    })

    const allPaymentsHaveTransactions = paymentsWithoutTransactions.length === 0
    const allNonPendingAreProperlyCancelled = scheduledNonPendingPayments.length === 0
    const allChecksPass = allPaymentsHaveTransactions && allNonPendingAreProperlyCancelled

    return NextResponse.json({
      success: true,
      allPaymentsHaveTransactions: allChecksPass,
      pendingPaymentsCount: pendingPayments.length,
      paymentsWithTransactions: pendingPaymentIdsWithTransactions.size,
      paymentsWithoutTransactions: paymentsWithoutTransactions.length,
      missingTransactions: paymentsWithoutTransactions.map((p: any) => ({
        paymentId: p.id,
        paymentNumber: p.payment_number,
        amount: p.amount,
        paymentDate: p.payment_date
      })),
      scheduledNonPendingPaymentsCount: scheduledNonPendingPayments.length,
      scheduledNonPendingPayments: scheduledNonPendingPayments,
      message: allChecksPass
        ? `All checks passed: ${pendingPayments.length} pending payment(s) have ZumRails transactions, and all non-pending payments are properly cancelled/completed`
        : paymentsWithoutTransactions.length > 0
          ? `${paymentsWithoutTransactions.length} of ${pendingPayments.length} pending payment(s) are missing ZumRails transactions`
          : `${scheduledNonPendingPayments.length} non-pending payment(s) still have ZumRails transactions in Scheduled status (should be cancelled/completed)`
    })
  } catch (error: any) {
    console.error('[Check Loan] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check loan payments',
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

