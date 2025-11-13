/**
 * Accept Pay Database Helper Functions
 * 
 * ⚠️ SERVER-ONLY: These helpers should ONLY be called from API routes or server-side code.
 * NEVER import these functions in client components.
 * 
 * These helpers integrate with Accept Pay API and manage Accept Pay-related data in Supabase.
 */

import type {
  User,
  UserUpdate,
  Loan,
  LoanUpdate,
  LoanPayment,
  LoanPaymentInsert,
  LoanPaymentUpdate,
  LoanPaymentSchedule,
  LoanPaymentScheduleInsert,
  LoanPaymentScheduleUpdate,
  AcceptPaySyncLog,
  AcceptPaySyncLogInsert,
  AcceptPayCustomerStatus,
  AcceptPayTransactionStatus,
  PaymentScheduleStatus,
  Database
} from './types'
import { createClient } from './client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAcceptPayClient } from '@/src/lib/accept-pay/client'

// ===========================
// CUSTOMER MANAGEMENT
// ===========================

/**
 * Map user data to Accept Pay customer format
 * Combines user, address, and bank account data
 */
export function mapUserToAcceptPayCustomer(
  user: User,
  address: {
    street_number?: string | null
    street_name?: string | null
    apartment_number?: string | null
    city: string
    province: string
    postal_code: string
  },
  bankAccount: {
    institution_number: string
    transit_number: string
    account_number: string
    account_name?: string
    account_holder?: string
  }
): {
  FirstName: string
  LastName: string
  Address: string
  City: string
  State: string
  Zip: string
  Country: string
  Phone: string
  Institution_Number: string
  Transit_Number: string
  Account_Number: string
  Email: string
  PADTType?: string
} {
  // Build full address string
  const addressParts = [
    address.street_number,
    address.street_name,
    address.apartment_number ? `Apt ${address.apartment_number}` : null
  ].filter(Boolean)
  const fullAddress = addressParts.join(' ') || ''

  return {
    FirstName: user.first_name || '',
    LastName: user.last_name || '',
    Address: fullAddress,
    City: address.city,
    State: address.province,
    Zip: address.postal_code,
    Country: 'CA', // Canada
    Phone: user.phone?.replace(/\D/g, '') || '', // Remove non-digits
    Institution_Number: bankAccount.institution_number,
    Transit_Number: bankAccount.transit_number,
    Account_Number: bankAccount.account_number,
    Email: user.email || '',
    PADTType: 'Business' // Default for EFT
  }
}

/**
 * Create Accept Pay customer and store customer ID in database
 * Returns Accept Pay customer ID
 */
export async function createAcceptPayCustomer(
  userId: string,
  isServer = true
): Promise<{ success: boolean; customerId: number | null; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, customerId: null, error: 'User not found' }
    }

    // Check if customer already exists
    if (user.accept_pay_customer_id) {
      return {
        success: true,
        customerId: user.accept_pay_customer_id,
        error: null
      }
    }

    // Get current address
    const { data: address } = await supabase
      .from('addresses')
      .select('*')
      .eq('client_id', userId)
      .eq('is_current', true)
      .single()

    if (!address) {
      return { success: false, customerId: null, error: 'Current address not found' }
    }

    // Get bank account from loan contract (most recent signed contract)
    const { data: contract } = await supabase
      .from('loan_contracts')
      .select('bank_account')
      .eq('loan_application_id', (await supabase
        .from('loan_applications')
        .select('id')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()).data?.id || '')
      .single()

    const bankAccount = contract?.bank_account as {
      institution_number?: string
      transit_number?: string
      account_number?: string
    } | null

    if (!bankAccount?.institution_number || !bankAccount?.transit_number || !bankAccount?.account_number) {
      return { success: false, customerId: null, error: 'Bank account information not found' }
    }

    // Map to Accept Pay format
    const customerData = mapUserToAcceptPayCustomer(user, address, {
      institution_number: bankAccount.institution_number,
      transit_number: bankAccount.transit_number,
      account_number: bankAccount.account_number
    })

    // Create customer in Accept Pay
    const acceptPayClient = getAcceptPayClient()
    const response = await acceptPayClient.createCustomer(customerData)

    // Update user with Accept Pay customer ID
    const { error: updateError } = await supabase
      .from('users')
      .update({
        accept_pay_customer_id: response.Id,
        accept_pay_customer_status: 'active',
        accept_pay_customer_created_at: new Date().toISOString(),
        accept_pay_customer_updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user with Accept Pay customer ID:', updateError)
      return { success: false, customerId: null, error: updateError.message }
    }

    return { success: true, customerId: response.Id, error: null }
  } catch (error: any) {
    console.error('Error creating Accept Pay customer:', error)
    return { success: false, customerId: null, error: error.message || 'Unknown error' }
  }
}

/**
 * Get Accept Pay customer ID for a user
 */
export async function getAcceptPayCustomerId(
  userId: string,
  isServer = true
): Promise<number | null> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('users')
    .select('accept_pay_customer_id')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.accept_pay_customer_id
}

/**
 * Update Accept Pay customer status in database
 */
export async function updateAcceptPayCustomerStatus(
  userId: string,
  status: AcceptPayCustomerStatus,
  isServer = true
): Promise<{ success: boolean; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { error } = await supabase
    .from('users')
    .update({
      accept_pay_customer_status: status,
      accept_pay_customer_updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('Error updating Accept Pay customer status:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// ===========================
// DISBURSEMENT OPERATIONS
// ===========================

/**
 * Initiate loan disbursement transaction in Accept Pay
 */
export async function initiateDisbursement(
  loanId: string,
  isServer = true
): Promise<{ success: boolean; transactionId: number | null; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    // Get loan data
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, users!loans_user_id_fkey(*)')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return { success: false, transactionId: null, error: 'Loan not found' }
    }

    const user = loan.users as User

    // Get or create Accept Pay customer
    let customerId = loan.accept_pay_customer_id || user.accept_pay_customer_id
    if (!customerId) {
      const customerResult = await createAcceptPayCustomer(user.id, isServer)
      if (!customerResult.success || !customerResult.customerId) {
        return { success: false, transactionId: null, error: 'Failed to create Accept Pay customer' }
      }
      customerId = customerResult.customerId
    }

    // Get minimum process date
    const acceptPayClient = getAcceptPayClient()
    const minDateResponse = await acceptPayClient.getMinProcessDate()
    const processDate = minDateResponse.MinProcessDate

    // Create disbursement transaction (CR = Credit)
    const transactionResponse = await acceptPayClient.createTransaction({
      CustomerId: customerId,
      ProcessDate: processDate,
      Amount: loan.principal_amount,
      TransactionType: 'CR', // Credit = deposit to borrower
      PaymentType: 450, // EFT payment type (adjust as needed)
      PADTType: 'Business',
      Status: 'Authorized',
      Memo: `Loan disbursement - Loan #${loan.loan_number || loanId}`,
      Reference: `LOAN-${loan.loan_number || loanId}`
    })

    // Update loan with transaction details
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        accept_pay_customer_id: customerId,
        disbursement_transaction_id: transactionResponse.Id,
        disbursement_process_date: processDate,
        disbursement_status: '101', // Initiated
        disbursement_initiated_at: new Date().toISOString()
      })
      .eq('id', loanId)

    if (updateError) {
      console.error('Error updating loan with disbursement details:', updateError)
      return { success: false, transactionId: null, error: updateError.message }
    }

    return { success: true, transactionId: transactionResponse.Id, error: null }
  } catch (error: any) {
    console.error('Error initiating disbursement:', error)
    return { success: false, transactionId: null, error: error.message || 'Unknown error' }
  }
}

/**
 * Authorize a disbursement transaction
 */
export async function authorizeDisbursement(
  loanId: string,
  isServer = true
): Promise<{ success: boolean; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('disbursement_transaction_id')
      .eq('id', loanId)
      .single()

    if (loanError || !loan?.disbursement_transaction_id) {
      return { success: false, error: 'Loan or transaction not found' }
    }

    const acceptPayClient = getAcceptPayClient()
    await acceptPayClient.authorizeTransaction(loan.disbursement_transaction_id)

    // Update loan
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        disbursement_status: '101', // Authorized
        disbursement_authorized_at: new Date().toISOString()
      })
      .eq('id', loanId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error authorizing disbursement:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Update disbursement status from Accept Pay
 */
export async function updateDisbursementStatus(
  loanId: string,
  status: AcceptPayTransactionStatus,
  errorCode?: string,
  isServer = true
): Promise<{ success: boolean; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const updateData: LoanUpdate = {
    disbursement_status: status
  }

  if (status === 'AA') {
    // Approved - mark as completed
    updateData.disbursement_completed_at = new Date().toISOString()
    updateData.status = 'active'
    updateData.disbursement_date = new Date().toISOString().split('T')[0]

    // Get loan details to create payment schedule
    const { data: loan } = await supabase.from('loans').select('*').eq('id', loanId).single()

    if (loan) {
      // Calculate payment amount (principal + interest) / term_months
      const totalAmount = loan.principal_amount * (1 + (loan.interest_rate || 0) / 100)
      const paymentAmount = totalAmount / loan.term_months

      // Create payment schedule
      const scheduleResult = await createPaymentSchedule(
        loanId,
        paymentAmount,
        loan.term_months,
        updateData.disbursement_date || new Date().toISOString().split('T')[0],
        isServer
      )

      if (!scheduleResult.success) {
        console.warn('Failed to create payment schedule:', scheduleResult.error)
        // Don't fail the disbursement update if schedule creation fails
      }
    }
  } else if (errorCode) {
    updateData.disbursement_error_code = errorCode
  }

  const { error } = await supabase.from('loans').update(updateData).eq('id', loanId)

  if (error) {
    console.error('Error updating disbursement status:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Get disbursement status for a loan
 */
export async function getDisbursementStatus(
  loanId: string,
  isServer = true
): Promise<{ status: string | null; transactionId: number | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loans')
    .select('disbursement_status, disbursement_transaction_id')
    .eq('id', loanId)
    .single()

  if (error || !data) {
    return { status: null, transactionId: null }
  }

  return {
    status: data.disbursement_status,
    transactionId: data.disbursement_transaction_id
  }
}

// ===========================
// PAYMENT COLLECTION OPERATIONS
// ===========================

/**
 * Create payment schedule for a loan
 */
export async function createPaymentSchedule(
  loanId: string,
  paymentAmount: number,
  termMonths: number,
  startDate: string,
  isServer = true
): Promise<{ success: boolean; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    const schedules: LoanPaymentScheduleInsert[] = []
    const start = new Date(startDate)

    for (let i = 0; i < termMonths; i++) {
      const scheduledDate = new Date(start)
      scheduledDate.setMonth(start.getMonth() + i + 1)

      schedules.push({
        loan_id: loanId,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        amount: paymentAmount,
        payment_number: i + 1,
        status: 'pending'
      })
    }

    const { error } = await supabase.from('loan_payment_schedule').insert(schedules)

    if (error) {
      console.error('Error creating payment schedule:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error creating payment schedule:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Initiate payment collection transaction in Accept Pay
 */
export async function initiatePaymentCollection(
  scheduleId: string,
  isServer = true
): Promise<{ success: boolean; transactionId: number | null; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    // Get payment schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('loan_payment_schedule')
      .select('*, loans!loan_payment_schedule_loan_id_fkey(*, users!loans_user_id_fkey(*))')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return { success: false, transactionId: null, error: 'Payment schedule not found' }
    }

    const loan = schedule.loans as Loan & { users: User }

    // Get customer ID
    const customerId = loan.accept_pay_customer_id || loan.users.accept_pay_customer_id
    if (!customerId) {
      return { success: false, transactionId: null, error: 'Accept Pay customer not found' }
    }

    // Get minimum process date
    const acceptPayClient = getAcceptPayClient()
    const minDateResponse = await acceptPayClient.getMinProcessDate()
    const processDate = minDateResponse.MinProcessDate

    // Use scheduled date if it's >= min process date, otherwise use min process date
    const scheduledDate = new Date(schedule.scheduled_date)
    const minDate = new Date(minDateResponse.MinProcessDate)
    const finalProcessDate = scheduledDate >= minDate ? schedule.scheduled_date : minDateResponse.MinProcessDate

    // Create collection transaction (DB = Debit)
    const transactionResponse = await acceptPayClient.createTransaction({
      CustomerId: customerId,
      ProcessDate: finalProcessDate,
      Amount: schedule.amount,
      TransactionType: 'DB', // Debit = collect from borrower
      PaymentType: 450, // EFT payment type
      PADTType: 'Business',
      Status: 'Authorized',
      Memo: `Loan payment #${schedule.payment_number}`,
      Reference: `PAYMENT-${schedule.id}`
    })

    // Update schedule
    const { error: updateError } = await supabase
      .from('loan_payment_schedule')
      .update({
        accept_pay_transaction_id: transactionResponse.Id,
        status: 'scheduled'
      })
      .eq('id', scheduleId)

    if (updateError) {
      console.error('Error updating payment schedule:', updateError)
      return { success: false, transactionId: null, error: updateError.message }
    }

    return { success: true, transactionId: transactionResponse.Id, error: null }
  } catch (error: any) {
    console.error('Error initiating payment collection:', error)
    return { success: false, transactionId: null, error: error.message || 'Unknown error' }
  }
}

/**
 * Authorize a payment collection transaction
 */
export async function authorizePayment(
  scheduleId: string,
  isServer = true
): Promise<{ success: boolean; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    const { data: schedule, error: scheduleError } = await supabase
      .from('loan_payment_schedule')
      .select('accept_pay_transaction_id')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule?.accept_pay_transaction_id) {
      return { success: false, error: 'Payment schedule or transaction not found' }
    }

    const acceptPayClient = getAcceptPayClient()
    await acceptPayClient.authorizeTransaction(schedule.accept_pay_transaction_id)

    // Update schedule
    const { error: updateError } = await supabase
      .from('loan_payment_schedule')
      .update({
        status: 'authorized'
      })
      .eq('id', scheduleId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error authorizing payment:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Update payment status from Accept Pay
 */
export async function updatePaymentStatus(
  scheduleId: string,
  status: AcceptPayTransactionStatus,
  errorCode?: string,
  isServer = true
): Promise<{ success: boolean; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    const { data: schedule } = await supabase
      .from('loan_payment_schedule')
      .select('*, loans!loan_payment_schedule_loan_id_fkey(*)')
      .eq('id', scheduleId)
      .single()

    if (!schedule) {
      return { success: false, error: 'Payment schedule not found' }
    }

    const updateData: LoanPaymentScheduleUpdate = {}

    if (status === 'AA') {
      // Approved - create payment record and update loan balance
      updateData.status = 'collected'

      // Create loan payment record
      const loan = schedule.loans as Loan
      const { data: payment, error: paymentError } = await supabase
        .from('loan_payments')
        .insert({
          loan_id: schedule.loan_id,
          amount: schedule.amount,
          payment_date: new Date().toISOString(),
          status: 'confirmed',
          accept_pay_customer_id: loan.accept_pay_customer_id,
          accept_pay_transaction_id: schedule.accept_pay_transaction_id,
          process_date: schedule.scheduled_date,
          accept_pay_status: status,
          collection_completed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (paymentError || !payment) {
        return { success: false, error: 'Failed to create payment record' }
      }

      updateData.loan_payment_id = payment.id

      // Update loan remaining balance
      const { data: loanData } = await supabase
        .from('loans')
        .select('remaining_balance')
        .eq('id', schedule.loan_id)
        .single()

      if (loanData) {
        const newBalance = Math.max(0, (loanData.remaining_balance || 0) - schedule.amount)
        await supabase
          .from('loans')
          .update({ remaining_balance: newBalance })
          .eq('id', schedule.loan_id)
      }
    } else if (errorCode) {
      updateData.status = 'failed'
    }

    const { error: updateError } = await supabase
      .from('loan_payment_schedule')
      .update(updateData)
      .eq('id', scheduleId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error updating payment status:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Void a payment transaction
 */
export async function voidPayment(
  scheduleId: string,
  reason: string,
  isServer = true
): Promise<{ success: boolean; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    const { data: schedule, error: scheduleError } = await supabase
      .from('loan_payment_schedule')
      .select('accept_pay_transaction_id')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule?.accept_pay_transaction_id) {
      return { success: false, error: 'Payment schedule or transaction not found' }
    }

    const acceptPayClient = getAcceptPayClient()
    await acceptPayClient.voidTransaction(schedule.accept_pay_transaction_id)

    // Update schedule
    const { error: updateError } = await supabase
      .from('loan_payment_schedule')
      .update({
        status: 'cancelled'
      })
      .eq('id', scheduleId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error voiding payment:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ===========================
// SYNC OPERATIONS
// ===========================

/**
 * Sync transaction updates from Accept Pay
 * Polls Accept Pay Updates API and updates database accordingly
 */
export async function syncTransactionUpdates(
  isServer = true
): Promise<{ success: boolean; transactionsSynced: number; errors: string[] }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const errors: string[] = []

  try {
    // Get last sync time
    const { data: lastSync } = await supabase
      .from('accept_pay_sync_log')
      .select('last_sync_at')
      .order('last_sync_at', { ascending: false })
      .limit(1)
      .single()

    const changedSince = lastSync?.last_sync_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Default to 7 days ago

    // Get transaction updates from Accept Pay
    const acceptPayClient = getAcceptPayClient()
    const updates = await acceptPayClient.getTransactionUpdates(changedSince)

    let transactionsSynced = 0

    // Process each update
    for (const update of updates as any[]) {
      try {
        const transactionId = update.Id
        const status = update.Status
        const customerId = update.CustomerId

        // Find loan by disbursement transaction ID
        const { data: loan } = await supabase
          .from('loans')
          .select('id')
          .eq('disbursement_transaction_id', transactionId)
          .single()

        if (loan) {
          await updateDisbursementStatus(loan.id, status, update.ErrorCode, isServer)
          transactionsSynced++
          continue
        }

        // Find payment schedule by transaction ID
        const { data: schedule } = await supabase
          .from('loan_payment_schedule')
          .select('id')
          .eq('accept_pay_transaction_id', transactionId)
          .single()

        if (schedule) {
          await updatePaymentStatus(schedule.id, status, update.ErrorCode, isServer)
          transactionsSynced++
        }
      } catch (error: any) {
        errors.push(`Error processing transaction ${update.Id}: ${error.message}`)
      }
    }

    // Log sync
    await logSync(transactionsSynced, errors, isServer)

    return { success: true, transactionsSynced, errors }
  } catch (error: any) {
    errors.push(`Sync error: ${error.message}`)
    await logSync(0, errors, isServer)
    return { success: false, transactionsSynced: 0, errors }
  }
}

/**
 * Log sync operation
 */
export async function logSync(
  transactionsSynced: number,
  errors: string[],
  isServer = true
): Promise<{ success: boolean; error: string | null }> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const syncLog: AcceptPaySyncLogInsert = {
    last_sync_at: new Date().toISOString(),
    transactions_synced: transactionsSynced,
    errors: errors
  }

  const { error } = await supabase.from('accept_pay_sync_log').insert(syncLog)

  if (error) {
    console.error('Error logging sync:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Get last sync time
 */
export async function getLastSyncTime(isServer = true): Promise<string | null> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('accept_pay_sync_log')
    .select('last_sync_at')
    .order('last_sync_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data.last_sync_at
}

