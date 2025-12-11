/**
 * Loan Payment Sync Helper
 * 
 * Processes loan payments that don't have corresponding payment_transactions.
 * Creates ZumRails transactions and updates loan_payments with transaction information.
 * 
 * This function is designed to be called from a cron job to sync pending payments.
 * 
 * Usage example (in a cron job API route):
 * ```typescript
 * import { syncLoanPaymentsToZumRails } from '@/src/lib/payment-providers/zumrails'
 * 
 * export async function GET(request: NextRequest) {
 *   const result = await syncLoanPaymentsToZumRails({ limit: 50 })
 *   return NextResponse.json(result)
 * }
 * ```
 * 
 * Requirements:
 * - ZUMRAILS_WALLET_ID environment variable must be set (or pass walletId option)
 * - payment_provider_data table must have userId for each client
 * - fundingSourceId must be available (from IBV data or payment_provider_data)
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createCollectionTransaction } from './transactions'
import type { ZumRailsProviderData } from './types'

// Static wallet ID (as per requirements)
const STATIC_WALLET_ID = process.env.ZUMRAILS_WALLET_ID || ''

interface LoanPaymentWithLoan {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  status: string
  loans: {
    id: string
    user_id: string
    status: string
  } | Array<{
    id: string
    user_id: string
    status: string
  }>
}

interface PaymentProviderData {
  userId?: string
  walletId?: string
  fundingSourceId?: string
  [key: string]: any
}

interface SyncResult {
  success: boolean
  processed: number
  created: number
  failed: number
  errors: Array<{ loanPaymentId: string; error: string }>
}

/**
 * Get loan payments that don't have corresponding payment_transactions
 */
async function getLoanPaymentsWithoutTransactions(
  supabase: any,
  limit: number = 100,
  loanId?: string
): Promise<LoanPaymentWithLoan[]> {
  // Since Supabase doesn't support LEFT JOIN with NOT EXISTS easily,
  // we'll use a two-step approach: get all payments and filter out those with transactions
  
  // Step 1: Get payment IDs that have active (non-cancelled) transactions
  let transactionQuery = supabase
    .from('payment_transactions')
    .select('loan_payment_id, status, provider_data')
    .not('loan_payment_id', 'is', null)
    .eq('provider', 'zumrails') // Only check zumrails transactions
    .in('status', ['initiated', 'pending', 'processing', 'completed']) // Exclude cancelled and failed

  // Filter by loan_id if provided (more efficient)
  if (loanId) {
    transactionQuery = transactionQuery.eq('loan_id', loanId)
  }

  const { data: paymentsWithTransactions, error: transactionsError } = await transactionQuery

  if (transactionsError) {
    console.error('[LoanPaymentSync] Error fetching payment transactions:', transactionsError)
    throw transactionsError
  }

  // Create a set of payment IDs that have active (non-cancelled) transactions
  // Payments with only cancelled transactions will not be in this set, so new transactions will be created for them
  const paymentIdsWithActiveTransactions = new Set(
    (paymentsWithTransactions || []).map((pt: any) => pt.loan_payment_id)
  )

  // Step 2: Get all loan payments (excluding cancelled and rebate payments)
  // We'll fetch more than limit to account for filtering
  let query = supabase
    .from('loan_payments')
    .select(`
      id,
      loan_id,
      amount,
      payment_date,
      status,
      loans!inner (
        id,
        user_id,
        status
      )
    `)
    .not('status', 'in', '(cancelled,rebate)')
    .eq('loans.status', 'active') // Only include payments from active loans

  // Filter by loan_id if provided
  if (loanId) {
    query = query.eq('loan_id', loanId)
  }

  const { data: allPayments, error: allPaymentsError } = await query
    .order('payment_date', { ascending: true }) // Process oldest payments first
    .limit(limit * 3) // Get more to account for filtering

  if (allPaymentsError) {
    console.error('[LoanPaymentSync] Error fetching all loan payments:', allPaymentsError)
    throw allPaymentsError
  }

  // Step 3: Filter payments that don't have active (non-cancelled) transactions
  // This includes payments with no transactions AND payments with only cancelled transactions
  const paymentsWithoutTransactions = (allPayments || [])
    .filter((payment: any) => {
      // Filter out payments that already have active (non-cancelled) transactions
      if (paymentIdsWithActiveTransactions.has(payment.id)) {
        return false
      }
      
      return true
    }) as LoanPaymentWithLoan[]

  return paymentsWithoutTransactions.slice(0, limit)
}

/**
 * Get payment provider data for a client
 */
async function getPaymentProviderData(
  supabase: any,
  clientId: string
): Promise<PaymentProviderData | null> {
  const { data, error } = await supabase
    .from('payment_provider_data')
    .select('provider_data')
    .eq('client_id', clientId)
    .eq('provider', 'zumrails')
    .maybeSingle()

  if (error) {
    console.error('[LoanPaymentSync] Error fetching payment provider data:', error)
    return null
  }

  return data?.provider_data || null
}

/**
 * Get funding source ID from IBV data or payment provider data
 */
async function getFundingSourceId(
  supabase: any,
  clientId: string
): Promise<string | null> {
  // Try to get from payment_provider_data first
  const providerData = await getPaymentProviderData(supabase, clientId)
  if (providerData?.fundingSourceId) {
    return providerData.fundingSourceId
  }

  // Try to get from loan application IBV data
  const { data: loanApplication, error } = await supabase
    .from('loan_applications')
    .select('ibv_provider_data')
    .eq('client_id', clientId)
    .eq('ibv_provider', 'zumrails')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !loanApplication) {
    return null
  }

  const ibvData = loanApplication.ibv_provider_data as any
  // Check if funding source is stored in IBV data
  if (ibvData?.funding_source_id) {
    return ibvData.funding_source_id
  }

  // Check if account info contains funding source
  if (ibvData?.account_info?.fundingSourceId) {
    return ibvData.account_info.fundingSourceId
  }

  return null
}

/**
 * Create payment transaction record in database
 */
async function createPaymentTransaction(
  supabase: any,
  loanPaymentId: string,
  loanId: string,
  amount: number,
  zumRailsResponse: any
): Promise<void> {
  const providerData: ZumRailsProviderData = {
    transaction_id: zumRailsResponse.result.Id,
    client_transaction_id: loanPaymentId,
    zumrails_type: zumRailsResponse.result.ZumRailsType || 'AccountsReceivable',
    transaction_method: zumRailsResponse.result.TransactionMethod || 'Eft',
    transaction_status: zumRailsResponse.result.TransactionStatus || 'InProgress',
    amount: zumRailsResponse.result.Amount || amount,
    currency: zumRailsResponse.result.Currency || 'CAD',
    created_at: zumRailsResponse.result.CreatedAt || new Date().toISOString(),
    memo: zumRailsResponse.result.Memo,
    comment: zumRailsResponse.result.Comment,
    user: zumRailsResponse.result.User,
    wallet: zumRailsResponse.result.Wallet,
    funding_source: zumRailsResponse.result.FundingSource,
    raw_response: zumRailsResponse.result
  }

  const { error } = await supabase.from('payment_transactions').insert({
    provider: 'zumrails',
    transaction_type: 'collection',
    loan_id: loanId,
    loan_payment_id: loanPaymentId,
    amount: amount,
    status: 'initiated', // Will be updated by webhook
    provider_data: providerData
  })

  if (error) {
    console.error('[LoanPaymentSync] Error creating payment transaction:', error)
    throw error
  }
}

/**
 * Main function to sync loan payments to ZumRails
 * 
 * @param options Configuration options
 * @param options.limit Maximum number of payments to process in one run
 * @param options.walletId Wallet ID to use (defaults to STATIC_WALLET_ID)
 * @returns Sync result with statistics
 */
export async function syncLoanPaymentsToZumRails(options: {
  limit?: number
  walletId?: string
  loanId?: string
} = {}): Promise<SyncResult> {
  const { limit = 100, walletId = STATIC_WALLET_ID, loanId } = options

  if (!walletId) {
    throw new Error('Wallet ID is required. Set ZUMRAILS_WALLET_ID environment variable or pass walletId option.')
  }

  const supabase = createServerSupabaseAdminClient()
  const result: SyncResult = {
    success: true,
    processed: 0,
    created: 0,
    failed: 0,
    errors: []
  }

  try {
    // Get loan payments without transactions
    const loanPayments = await getLoanPaymentsWithoutTransactions(supabase, limit, loanId)
    result.processed = loanPayments.length

    console.log(`[LoanPaymentSync] Found ${loanPayments.length} loan payments to process`)

    // Process each payment
    for (const loanPayment of loanPayments) {
      try {
        // Handle nested loan structure from Supabase query
        // The query uses loans!inner which returns loans (plural) property
        const loan = Array.isArray(loanPayment.loans) 
          ? loanPayment.loans[0] 
          : loanPayment.loans
        
        if (!loan || !loan.user_id) {
          result.failed++
          result.errors.push({
            loanPaymentId: loanPayment.id,
            error: `Loan data not found for payment ${loanPayment.id}`
          })
          console.warn(
            `[LoanPaymentSync] Skipping payment ${loanPayment.id}: Loan data missing`,
            { loanPayment: JSON.stringify(loanPayment, null, 2) }
          )
          continue
        }

        const clientId = loan.user_id

        // Get payment provider data
        const providerData = await getPaymentProviderData(supabase, clientId)
        if (!providerData?.userId) {
          result.failed++
          result.errors.push({
            loanPaymentId: loanPayment.id,
            error: `No userId found in payment_provider_data for client ${clientId}`
          })
          console.warn(
            `[LoanPaymentSync] Skipping payment ${loanPayment.id}: No userId for client ${clientId}`
          )
          continue
        }

        // Get funding source ID
        // const fundingSourceId = await getFundingSourceId(supabase, clientId)
        // if (!fundingSourceId) {
        //   result.failed++
        //   result.errors.push({
        //     loanPaymentId: loanPayment.id,
        //     error: `No fundingSourceId found for client ${clientId}`
        //   })
        //   console.warn(
        //     `[LoanPaymentSync] Skipping payment ${loanPayment.id}: No fundingSourceId for client ${clientId}`
        //   )
        //   continue
        // }

        // Format payment date for ZumRails (YYYY-MM-DD)
        const paymentDate = loanPayment.payment_date.includes('T')
          ? loanPayment.payment_date.split('T')[0]
          : loanPayment.payment_date

        // Create a short memo (max 15 characters, alphanumeric, dash, space, underscore only)
        // Use first 8 chars of payment ID for uniqueness
        const memo = `FLASH LOAN INC`

        // Create ZumRails transaction
        const zumRailsResponse = await createCollectionTransaction({
          userId: providerData.userId,
          walletId: walletId,
          // fundingSourceId: fundingSourceId,
          amount: loanPayment.amount,
          memo: memo,
          comment: `Loan payment for loan ${loanPayment.loan_id}, payment ${loanPayment.id}`,
          scheduledStartDate: paymentDate,
          clientTransactionId: loanPayment.id
        })

        // Create payment_transaction record
        await createPaymentTransaction(
          supabase,
          loanPayment.id,
          loanPayment.loan_id,
          loanPayment.amount,
          zumRailsResponse
        )

        result.created++
        console.log(
          `[LoanPaymentSync] Created transaction for payment ${loanPayment.id}: ${zumRailsResponse.result.Id}`
        )
      } catch (error: any) {
        result.failed++
        result.errors.push({
          loanPaymentId: loanPayment.id,
          error: error.message || String(error)
        })
        console.error(
          `[LoanPaymentSync] Error processing payment ${loanPayment.id}:`,
          error
        )
      }
    }

    console.log(
      `[LoanPaymentSync] Completed: ${result.created} created, ${result.failed} failed out of ${result.processed} processed`
    )

    return result
  } catch (error: any) {
    result.success = false
    console.error('[LoanPaymentSync] Fatal error:', error)
    throw error
  }
}
