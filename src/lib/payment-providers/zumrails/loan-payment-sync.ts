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
import {
  createBatchTransactionsWithValidation,
  transactionsToCSV,
  filterZumRailsTransactions,
  type BatchTransactionInput
} from './transactions'
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

interface LoanPaymentWithClientData {
  loanPaymentId: string
  loanId: string
  amount: number
  paymentDate: string
  clientId: string
  userId: string
  firstName: string
  lastName: string
  institutionNumber: string
  branchNumber: string
  accountNumber: string
  email?: string
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
  // Include loan contracts to get bank account information
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
        status,
        loan_contracts!loan_contracts_loan_id_fkey (
          id,
          bank_account,
          contract_terms
        )
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
 * Generate a consistent transaction comment that includes loan payment ID for matching
 * Format: "Loan payment | loan:{loanId} | payment:{loanPaymentId}"
 * 
 * @param loanId - The loan ID
 * @param loanPaymentId - The loan payment ID (used for matching)
 * @returns Formatted comment string
 */
function generateComment(loanId: string, loanPaymentId: string): string {
  return `Loan payment | loan:${loanId} | payment:${loanPaymentId}`
}

/**
 * Extract loan payment ID from transaction comment
 * Supports both old and new comment formats for backward compatibility
 * 
 * @param comment - The transaction comment from ZumRails
 * @returns The loan payment ID if found, null otherwise
 */
function extractLoanPaymentIdFromComment(comment: string | null | undefined): string | null {
  if (!comment) {
    return null
  }

  // New format: "Loan payment | loan:{loanId} | payment:{loanPaymentId}"
  // Match "payment:" followed by UUID or alphanumeric string
  const newFormatMatch = comment.match(/payment:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-zA-Z0-9_-]+)/i)
  if (newFormatMatch && newFormatMatch[1]) {
    return newFormatMatch[1]
  }

  // Old format: "Loan payment for loan {loanId}, payment {loanPaymentId}"
  // Match "payment " followed by UUID or alphanumeric string
  const oldFormatMatch = comment.match(/payment\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-zA-Z0-9_-]+)/i)
  if (oldFormatMatch && oldFormatMatch[1]) {
    return oldFormatMatch[1]
  }

  // Fallback: try to find any UUID in the comment (last resort)
  const uuidMatch = comment.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
  if (uuidMatch && uuidMatch[1]) {
    return uuidMatch[1]
  }

  return null
}

/**
 * Get client data from loan contract including bank account information
 */
function getClientDataFromContract(
  loan: any
): {
  firstName: string
  lastName: string
  email?: string
  institutionNumber?: string
  branchNumber?: string
  accountNumber?: string
} | null {
  // Get loan contract (can be array or single object)
  const contracts = Array.isArray(loan.loan_contracts) 
    ? loan.loan_contracts 
    : loan.loan_contracts 
      ? [loan.loan_contracts] 
      : []

  // Get the most recent signed contract
  const contract = contracts
    .filter((c: any) => c && c.bank_account)
    .sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return dateB - dateA
    })[0]

  if (!contract || !contract.bank_account) {
    return null
  }

  const bankAccount = contract.bank_account as any
  const contractTerms = contract.contract_terms as any

  // Get client name from contract terms (borrower information)
  const firstName = contractTerms?.borrower?.firstName || 
                    contractTerms?.borrower?.first_name || 
                    contractTerms?.borrowerName?.split(' ')[0] || 
                    ''
  const lastName = contractTerms?.borrower?.lastName || 
                   contractTerms?.borrower?.last_name || 
                   contractTerms?.borrowerName?.split(' ').slice(1).join(' ') || 
                   ''

  return {
    firstName: firstName || '',
    lastName: lastName || '',
    email: contractTerms?.borrower?.email || undefined,
    institutionNumber: bankAccount.institution_number || undefined,
    branchNumber: bankAccount.transit_number || undefined,
    accountNumber: bankAccount.account_number || undefined
  }
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

    // Step 1: Collect all valid transactions with required data
    const validTransactions: LoanPaymentWithClientData[] = []

    for (const loanPayment of loanPayments) {
      try {
        // Handle nested loan structure from Supabase query
        const loan = Array.isArray(loanPayment.loans) 
          ? loanPayment.loans[0] 
          : loanPayment.loans
        
        if (!loan || !loan.user_id) {
          result.failed++
          result.errors.push({
            loanPaymentId: loanPayment.id,
            error: `Loan data not found for payment ${loanPayment.id}`
          })
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
          continue
        }

        // Get client data from loan contract including bank account
        const clientData = getClientDataFromContract(loan)
        if (!clientData) {
          result.failed++
          result.errors.push({
            loanPaymentId: loanPayment.id,
            error: `Loan contract with bank account not found for loan ${loanPayment.loan_id}`
          })
          continue
        }

        // Validate bank account data
        if (!clientData.institutionNumber || !clientData.branchNumber || !clientData.accountNumber) {
          result.failed++
          result.errors.push({
            loanPaymentId: loanPayment.id,
            error: `Missing bank account information in loan contract for loan ${loanPayment.loan_id}`
          })
          continue
        }

        // Validate client name
        if (!clientData.firstName || !clientData.lastName) {
          result.failed++
          result.errors.push({
            loanPaymentId: loanPayment.id,
            error: `Missing client name in loan contract for loan ${loanPayment.loan_id}`
          })
          continue
        }

        // Format payment date for ZumRails (YYYY-MM-DD)
        const paymentDate = loanPayment.payment_date.includes('T')
          ? loanPayment.payment_date.split('T')[0]
          : loanPayment.payment_date

        validTransactions.push({
          loanPaymentId: loanPayment.id,
          loanId: loanPayment.loan_id,
          amount: loanPayment.amount,
          paymentDate,
          clientId,
          userId: providerData.userId,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          institutionNumber: clientData.institutionNumber,
          branchNumber: clientData.branchNumber,
          accountNumber: clientData.accountNumber,
          email: clientData.email
        })
      } catch (error: any) {
        result.failed++
        result.errors.push({
          loanPaymentId: loanPayment.id,
          error: error.message || String(error)
        })
        console.error(
          `[LoanPaymentSync] Error preparing payment ${loanPayment.id}:`,
          error
        )
      }
    }

    // Step 2: Convert to batch CSV format
    if (validTransactions.length === 0) {
      console.log('[LoanPaymentSync] No valid transactions to process')
      return result
    }

    console.log(`[LoanPaymentSync] Processing ${validTransactions.length} transactions in batch`)

    const batchTransactions: BatchTransactionInput[] = validTransactions.map(tx => ({
      firstName: tx.firstName,
      lastName: tx.lastName,
      institutionNumber: tx.institutionNumber,
      branchNumber: tx.branchNumber,
      accountNumber: tx.accountNumber,
      amountInCents: Math.round(tx.amount * 100), // Convert to cents
      transactionComment: generateComment(tx.loanId, tx.loanPaymentId),
      memo: 'FLASH LOAN INC',
      scheduledDate: tx.paymentDate,
      emailId: tx.email,
      clientUserId: tx.userId
    }))

    const csvContent = transactionsToCSV(batchTransactions)
    const fileName = `loan-payments-${Date.now()}.csv`

    // Step 3: Process batch
    try {
      const batchResult = await createBatchTransactionsWithValidation(csvContent, {
        fileName,
        transactionType: 'AccountsReceivable',
        transactionMethod: 'Eft',
        walletId: walletId,
        skipFileAlreadyProcessedInLast24Hours: true,
        withdrawSumTotalFromFundingSource: false
      })

      if (!batchResult.success) {
        // Batch validation or processing failed
        result.failed += validTransactions.length
        result.errors.push({
          loanPaymentId: 'batch',
          error: batchResult.error || 'Batch processing failed'
        })
        console.error('[LoanPaymentSync] Batch processing failed:', batchResult.error)
        return result
      }

      // Step 4: Match transactions back to loan payments
      // Extract batch number from processing result
      const batchNumber = batchResult.processing?.result
      
      if (!batchNumber) {
        console.error('[LoanPaymentSync] No batch number returned from processing')
        result.failed += validTransactions.length
        result.errors.push({
          loanPaymentId: 'batch',
          error: 'Batch processing succeeded but no batch number returned'
        })
        return result
      }

      console.log(`[LoanPaymentSync] Batch processed successfully with batch number: ${batchNumber}`)

      // Query transactions created in this batch using BatchNumber filter
      const filterResult = await filterZumRailsTransactions({
        WalletId: walletId,
        BatchNumber: batchNumber,
        ZumRailsType: 'AccountsReceivable',
        Pagination: {
          PageNumber: 1,
          ItemsPerPage: 100
        }
      })

      const zumRailsTransactions = filterResult.result?.Items || []

      console.log(`[LoanPaymentSync] Found ${zumRailsTransactions.length} ZumRails transactions in batch ${batchNumber}`)
      console.log(`[LoanPaymentSync] Trying to match ${validTransactions.length} loan payments`)

      // Simple matching: Match transactions by loan payment ID from transaction comment
      const matchedTransactions = new Map<string, any>()
      
      // Create a map of loan payment IDs for quick lookup
      const loanPaymentIdSet = new Set(validTransactions.map(tx => tx.loanPaymentId))
      
      // Match ZumRails transactions by extracting loan payment ID from comment
      for (const zumTx of zumRailsTransactions) {
        const extractedLoanPaymentId = extractLoanPaymentIdFromComment(zumTx.Comment)
        
        if (extractedLoanPaymentId && loanPaymentIdSet.has(extractedLoanPaymentId)) {
          matchedTransactions.set(extractedLoanPaymentId, zumTx)
          console.log(`[LoanPaymentSync] ✓ Matched transaction ${zumTx.Id} to loan payment ${extractedLoanPaymentId}`)
        }
      }

      console.log(`[LoanPaymentSync] Matched ${matchedTransactions.size} out of ${validTransactions.length} loan payments`)

      // Step 5: Create payment_transaction records for matched transactions
      for (const tx of validTransactions) {
        const zumRailsTx = matchedTransactions.get(tx.loanPaymentId)
        
        if (zumRailsTx) {
          try {
            // Create payment_transaction record
            const providerData: ZumRailsProviderData = {
              transaction_id: zumRailsTx.Id,
              client_transaction_id: tx.loanPaymentId,
              zumrails_type: zumRailsTx.ZumRailsType || 'AccountsReceivable',
              transaction_method: zumRailsTx.TransactionMethod || 'Eft',
              transaction_status: zumRailsTx.TransactionStatus || 'Scheduled',
              amount: zumRailsTx.Amount || tx.amount,
              currency: zumRailsTx.Currency || 'CAD',
              created_at: zumRailsTx.CreatedAt || new Date().toISOString(),
              memo: zumRailsTx.Memo,
              comment: generateComment(tx.loanId, tx.loanPaymentId),
              scheduled_start_date: tx.paymentDate,
              user: zumRailsTx.User,
              wallet: zumRailsTx.Wallet,
              funding_source: zumRailsTx.FundingSource,
              raw_response: zumRailsTx
            }

            const { error } = await supabase
              .from('payment_transactions')
              .insert({
                provider: 'zumrails',
                transaction_type: 'collection',
                loan_id: tx.loanId,
                loan_payment_id: tx.loanPaymentId,
                amount: tx.amount,
                status: 'initiated', // Will be updated by webhook
                provider_data: providerData as any
              } as any)

            if (error) {
              console.error(`[LoanPaymentSync] Error creating payment transaction for ${tx.loanPaymentId}:`, error)
              result.failed++
              result.errors.push({
                loanPaymentId: tx.loanPaymentId,
                error: `Failed to create payment_transaction: ${error.message}`
              })
            } else {
              result.created++
              console.log(
                `[LoanPaymentSync] Created transaction for payment ${tx.loanPaymentId}: ${zumRailsTx.Id}`
              )
            }
          } catch (error: any) {
            result.failed++
            result.errors.push({
              loanPaymentId: tx.loanPaymentId,
              error: error.message || String(error)
            })
            console.error(
              `[LoanPaymentSync] Error creating payment transaction for ${tx.loanPaymentId}:`,
              error
            )
          }
        } else {
          // Transaction not matched - log detailed information for debugging
          result.failed++
          const errorMsg = `Transaction created in batch but could not be matched. Expected comment: "${generateComment(tx.loanId, tx.loanPaymentId)}". Found ${zumRailsTransactions.length} transactions in batch, ${matchedTransactions.size} matched.`
          result.errors.push({
            loanPaymentId: tx.loanPaymentId,
            error: errorMsg
          })
          console.warn(
            `[LoanPaymentSync] Could not match transaction for payment ${tx.loanPaymentId}`,
            {
              expectedComment: generateComment(tx.loanId, tx.loanPaymentId),
              loanPaymentId: tx.loanPaymentId,
              amount: tx.amount,
              scheduledDate: tx.paymentDate,
              totalTransactionsInBatch: zumRailsTransactions.length,
              matchedCount: matchedTransactions.size,
              availableComments: zumRailsTransactions.map(t => t.Comment).filter(Boolean)
            }
          )
        }
      }
    } catch (error: any) {
      result.failed += validTransactions.length
      result.errors.push({
        loanPaymentId: 'batch',
        error: error.message || String(error)
      })
      console.error('[LoanPaymentSync] Batch processing error:', error)
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
