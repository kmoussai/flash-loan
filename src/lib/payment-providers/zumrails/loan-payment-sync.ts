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
 * - ZUMRAILS_FUNDING_SRC environment variable must be set (or fundingSourceId in payment_provider_data)
 * - payment_provider_data table must have userId for each client
 * - fundingSourceId must be available (from env, IBV data, or payment_provider_data)
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createCollectionTransaction } from './transactions/create'
import type { ZumRailsProviderData } from './types'

// Static wallet ID (optional - not used when funding source is provided)
const STATIC_WALLET_ID = process.env.ZUMRAILS_WALLET_ID || ''

interface LoanPaymentWithLoan {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  status: string
  loans:
    | {
        id: string
        user_id: string
        status: string
      }
    | Array<{
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
  fundingSourceId?: string
  firstName: string
  lastName: string
  institutionNumber: string
  branchNumber: string
  accountNumber: string
  email?: string
}

interface PaymentProviderData {
  userId?: string
  Id?: string
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

  const { data: paymentsWithTransactions, error: transactionsError } =
    await transactionQuery

  if (transactionsError) {
    console.error(
      '[LoanPaymentSync] Error fetching payment transactions:',
      transactionsError
    )
    throw transactionsError
  }

  // Create a set of payment IDs that have active (non-cancelled) transactions
  // Payments with only cancelled transactions will not be in this set, so new transactions will be created for them
  const paymentIdsWithActiveTransactions = new Set(
    (paymentsWithTransactions || []).map((pt: any) => pt.loan_payment_id)
  )

  // Step 2: Get all loan payments that are eligible for ZumRails transactions
  // We only consider payments with status = 'pending' to avoid creating transactions
  // for deferred/manual/failed/rejected/cancelled/etc. payments.
  // We'll fetch more than limit to account for filtering
  // Include loan contracts to get bank account information
  let query = supabase
    .from('loan_payments')
    .select(
      `
      id,
      loan_id,
      amount,
      payment_date,
      status,
      loans!inner (
        id,
        user_id,
        status,
        crm_original_data,
        loan_contracts!loan_contracts_loan_id_fkey (
          id,
          bank_account,
          contract_terms
        )
      )
    `
    )
    .eq('status', 'pending')
    .eq('loans.status', 'active') // Only include payments from active loans

  // Filter by loan_id if provided
  if (loanId) {
    query = query.eq('loan_id', loanId)
  }

  const { data: allPayments, error: allPaymentsError } = await query
    .order('payment_date', { ascending: true }) // Process oldest payments first
    .limit(limit * 3) // Get more to account for filtering

  if (allPaymentsError) {
    console.error(
      '[LoanPaymentSync] Error fetching all loan payments:',
      allPaymentsError
    )
    throw allPaymentsError
  }

  // Step 3: Filter payments that don't have active (non-cancelled) transactions
  // This includes payments with no transactions AND payments with only cancelled transactions
  const paymentsWithoutTransactions = (allPayments || []).filter(
    (payment: any) => {
      // Filter out payments that already have active (non-cancelled) transactions
      if (paymentIdsWithActiveTransactions.has(payment.id)) {
        return false
      }

      return true
    }
  ) as LoanPaymentWithLoan[]

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
    console.error(
      '[LoanPaymentSync] Error fetching payment provider data:',
      error
    )
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
 * Get client data from loan contract including bank account information
 * Falls back to crm_original_data if contract doesn't have bank account info
 */
function getClientDataFromContract(loan: any): {
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

  // Try to get data from contract first
  if (contract && contract.bank_account) {
    const bankAccount = contract.bank_account as any
    const contractTerms = contract.contract_terms as any

    // Get client name from contract terms (borrower information)
    const firstName =
      contractTerms?.borrower?.firstName ||
      contractTerms?.borrower?.first_name ||
      contractTerms?.borrowerName?.split(' ')[0] ||
      ''
    const lastName =
      contractTerms?.borrower?.lastName ||
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

  // Fallback: Try to get bank account from crm_original_data
  if (loan.crm_original_data) {
    const crmData = loan.crm_original_data as any
    const bankDetails = crmData?.clientProfile?.bankDetails

    if (bankDetails) {
      const institutionNumber = bankDetails.institution
      const branchNumber = bankDetails.transit
      const accountNumber = bankDetails.account

      // Validate that we have all required bank account fields
      if (institutionNumber && branchNumber && accountNumber) {
        const firstName =
          crmData?.clientProfile?.firstName ||
          crmData?.clientProfileFirstName ||
          ''
        const lastName =
          crmData?.clientProfile?.lastName ||
          crmData?.clientProfileLastName ||
          ''

        return {
          firstName: firstName || '',
          lastName: lastName || '',
          email: crmData?.clientProfile?.email || undefined,
          institutionNumber: institutionNumber,
          branchNumber: branchNumber,
          accountNumber: accountNumber
        }
      }
    }
  }

  return null
}

/**
 * Get funding source ID from IBV data or payment provider data
 */
async function getFundingSourceId(
  supabase: any,
  clientId: string
): Promise<string | null> {
  if (process.env.ZUMRAILS_FUNDING_SRC)
    return Promise.resolve(process.env.ZUMRAILS_FUNDING_SRC)
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
    transaction_status:
      zumRailsResponse.result.TransactionStatus || 'InProgress',
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
    console.error(
      '[LoanPaymentSync] Error creating payment transaction:',
      error
    )
    throw error
  }
}

/**
 * Main function to sync loan payments to ZumRails
 *
 * @param options Configuration options
 * @param options.limit Maximum number of payments to process in one run
 * @param options.walletId Wallet ID to use (optional - not used when funding source is provided)
 * @param options.loanId Optional loan ID to filter payments for a specific loan
 * @returns Sync result with statistics
 */
export async function syncLoanPaymentsToZumRails(
  options: {
    limit?: number
    walletId?: string
    loanId?: string
  } = {}
): Promise<SyncResult> {
  const { limit = 100, walletId = STATIC_WALLET_ID, loanId } = options

  // Note: walletId is optional - ZumRails requires either WalletId OR FundingSourceId, not both
  // We're using FundingSourceId from env or payment_provider_data

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
    const loanPayments = await getLoanPaymentsWithoutTransactions(
      supabase,
      limit,
      loanId
    )
    result.processed = loanPayments.length

    console.log(
      `[LoanPaymentSync] Found ${loanPayments.length} loan payments to process`
    )

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
        const userId = providerData?.userId ?? providerData?.Id
        if (!providerData || !userId) {
          result.failed++
          result.errors.push({
            loanPaymentId: loanPayment.id,
            error: `No userId found in payment_provider_data for client ${clientId}`
          })
          continue
        }

        // Get funding source ID
        const fundingSourceId =
          providerData.fundingSourceId ||
          (await getFundingSourceId(supabase, clientId))

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
        if (
          !clientData.institutionNumber ||
          !clientData.branchNumber ||
          !clientData.accountNumber
        ) {
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
          userId: userId,
          fundingSourceId: fundingSourceId || undefined,
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

    // Step 2: Process transactions one by one
    if (validTransactions.length === 0) {
      console.log('[LoanPaymentSync] No valid transactions to process')
      return result
    }

    console.log(
      `[LoanPaymentSync] Processing ${validTransactions.length} transactions individually`
    )

    // Process each transaction individually
    for (const tx of validTransactions) {
      try {
        // Get funding source ID for this transaction
        const fundingSourceId =
          tx.fundingSourceId ||
          (await getFundingSourceId(supabase, tx.clientId))

        if (!fundingSourceId) {
          result.failed++
          result.errors.push({
            loanPaymentId: tx.loanPaymentId,
            error: `No funding source ID found for client ${tx.clientId}`
          })
          console.warn(
            `[LoanPaymentSync] Skipping payment ${tx.loanPaymentId}: No funding source ID`
          )
          continue
        }

        // RACE CONDITION PREVENTION: Insert a "reservation" record FIRST to prevent concurrent duplicates
        // This ensures that if two processes try to create transactions for the same payment,
        // only one will succeed in inserting the reservation, preventing duplicate ZumRails transactions
        console.log(
          `[LoanPaymentSync] Creating transaction for payment ${tx.loanPaymentId}...`
        )

        // Step 1: Try to insert a reservation record first (with placeholder data)
        // This acts as a lock to prevent concurrent duplicate creation
        const reservationData: any = {
          client_transaction_id: tx.loanPaymentId,
          zumrails_type: 'AccountsReceivable',
          transaction_method: 'Eft',
          transaction_status: 'Scheduled',
          amount: tx.amount,
          currency: 'CAD',
          created_at: new Date().toISOString(),
          comment: generateComment(tx.loanId, tx.loanPaymentId),
          scheduled_start_date: tx.paymentDate,
          reservation: true // Flag to indicate this is a reservation, not a completed transaction
        }

        const { data: insertedRecord, error: insertError } = await (
          supabase.from('payment_transactions') as any
        )
          .insert({
            provider: 'zumrails',
            transaction_type: 'collection',
            loan_id: tx.loanId,
            loan_payment_id: tx.loanPaymentId,
            amount: tx.amount,
            status: 'initiated', // Will be updated by webhook
            provider_data: reservationData
          })
          .select()
          .single()

        // If insert fails due to duplicate (unique constraint violation), skip this payment
        if (insertError) {
          // Check if it's a duplicate key error (PostgreSQL error code 23505)
          if (
            insertError.code === '23505' ||
            insertError.message?.includes('duplicate') ||
            insertError.message?.includes('unique')
          ) {
            console.warn(
              `[LoanPaymentSync] Payment ${tx.loanPaymentId} already has a transaction (duplicate detected), skipping...`
            )
            // This is not a failure - another process already created the transaction
            continue
          }

          // Other errors are actual failures
          console.error(
            `[LoanPaymentSync] Error creating payment transaction reservation for ${tx.loanPaymentId}:`,
            insertError
          )
          result.failed++
          result.errors.push({
            loanPaymentId: tx.loanPaymentId,
            error: `Failed to create payment_transaction reservation: ${insertError.message}`
          })
          continue
        }

        // Step 2: Now create the ZumRails transaction (we have the lock)
        // Use loan_payment_id as idempotency key to prevent duplicates at ZumRails level
        // This works in conjunction with our database constraint
        let transactionResponse
        try {
          transactionResponse = await createCollectionTransaction({
            userId: tx.userId,
            fundingSourceId: fundingSourceId,
            amount: tx.amount,
            memo: 'FLASH LOAN INC',
            comment: generateComment(tx.loanId, tx.loanPaymentId),
            scheduledStartDate: tx.paymentDate,
            clientTransactionId: tx.loanPaymentId,
            idempotencyKey: tx.loanPaymentId // Use loan_payment_id as idempotency key
            // Note: walletId is not included - ZumRails requires either WalletId OR FundingSourceId, not both
          })
        } catch (zumRailsError: any) {
          // If ZumRails creation fails, delete the reservation record
          if (insertedRecord?.id) {
            await (supabase.from('payment_transactions') as any)
              .delete()
              .eq('id', insertedRecord.id)
          }

          // Extract detailed error information
          const errorMessage = zumRailsError.message || String(zumRailsError)
          const errorDetails = zumRailsError.response?.data
            ? JSON.stringify(zumRailsError.response.data)
            : zumRailsError.response?.statusText || ''
          const errorStatus = zumRailsError.response?.status || ''

          const fullError = errorDetails
            ? `${errorMessage}${errorStatus ? ` (Status: ${errorStatus})` : ''} - ${errorDetails}`
            : errorMessage

          result.failed++
          result.errors.push({
            loanPaymentId: tx.loanPaymentId,
            error: `Failed to create ZumRails transaction: ${fullError}`
          })
          console.error(
            `[LoanPaymentSync] Error creating ZumRails transaction for payment ${tx.loanPaymentId}:`,
            {
              error: zumRailsError,
              message: errorMessage,
              status: errorStatus,
              details: errorDetails,
              paymentData: {
                loanPaymentId: tx.loanPaymentId,
                amount: tx.amount,
                paymentDate: tx.paymentDate,
                userId: tx.userId,
                fundingSourceId: fundingSourceId
              }
            }
          )
          continue
        }

        // Step 3: Update the reservation record with actual ZumRails transaction data
        const providerData: ZumRailsProviderData = {
          transaction_id: transactionResponse.result.Id,
          client_transaction_id: tx.loanPaymentId,
          zumrails_type:
            transactionResponse.result.ZumRailsType || 'AccountsReceivable',
          transaction_method:
            transactionResponse.result.TransactionMethod || 'Eft',
          transaction_status:
            transactionResponse.result.TransactionStatus || 'Scheduled',
          amount: transactionResponse.result.Amount || tx.amount,
          currency:
            transactionResponse.result.Currency === 'CAD' ||
            transactionResponse.result.Currency === 'USD'
              ? transactionResponse.result.Currency
              : 'CAD',
          created_at:
            transactionResponse.result.CreatedAt || new Date().toISOString(),
          memo: transactionResponse.result.Memo,
          comment: generateComment(tx.loanId, tx.loanPaymentId),
          scheduled_start_date: tx.paymentDate,
          user: transactionResponse.result.User,
          wallet: transactionResponse.result.Wallet,
          // FundingSource is not available in CreateTransactionResponse, will be populated by webhook
          raw_response: transactionResponse.result as any
        }

        const { error: updateError } = await (
          supabase.from('payment_transactions') as any
        )
          .update({
            provider_data: providerData as any
          })
          .eq('id', insertedRecord?.id)

        if (updateError) {
          console.error(
            `[LoanPaymentSync] Error updating payment transaction for ${tx.loanPaymentId}:`,
            updateError
          )
          // Transaction was created in ZumRails but we couldn't update the record
          // This is a partial failure - the transaction exists in ZumRails
          result.failed++
          result.errors.push({
            loanPaymentId: tx.loanPaymentId,
            error: `Failed to update payment_transaction with ZumRails data: ${updateError.message}`
          })
        } else {
          result.created++
          console.log(
            `[LoanPaymentSync] ✓ Created transaction ${transactionResponse.result.Id} for payment ${tx.loanPaymentId}`
          )
        }
      } catch (error: any) {
        result.failed++
        result.errors.push({
          loanPaymentId: tx.loanPaymentId,
          error: error.message || String(error)
        })
        console.error(
          `[LoanPaymentSync] Error creating transaction for payment ${tx.loanPaymentId}:`,
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
