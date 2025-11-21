/**
 * Accept Pay Database Helper Functions
 *
 * ⚠️ SERVER-ONLY: These helpers should ONLY be called from API routes or server-side code.
 * NEVER import these functions in client components.
 *
 * These helpers integrate with Accept Pay API and manage Accept Pay-related data in Supabase.
 */

import {
  User,
  UserUpdate,
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
  Database,
  AcceptPayTransactionSchedule,
  TransactionType
} from './types'
import { Loan } from '@/src/types'
import { createClient } from './client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAcceptPayClient } from '@/src/lib/accept-pay/client'
import { updateLoan } from './loan-helpers'

// ===========================
// ACCEPT PAY CONSTANTS
// ===========================

/**
 * Accept Pay Payment Types (EFT)
 * 
 * According to Accept Pay documentation:
 * - PaymentType is required for EFT transactions
 * - Available types can be fetched from /enumerations/paymenttype
 * 
 * Standard Canadian EFT/PAD codes:
 * - 450 = One-time PAD (Pre-Authorized Debit) - Used for single transactions
 * - 451 = Recurring PAD - Used for scheduled recurring payments
 * 
 * Note: The Accept Pay example shows PaymentType: 450
 * Verify available types by calling: GET /enumerations/paymenttype
 */
export const ACCEPT_PAY_PAYMENT_TYPES = {
  PersonalLoans: 351,
  AdvencePayroll: 204,
} as const

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
    Zip: address.postal_code.replaceAll(' ', ''),
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
): Promise<{
  success: boolean
  customerId: number | null
  error: string | null
}> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    // Get user data
    const { data, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    const user = data as User | null

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
      return {
        success: false,
        customerId: null,
        error: 'Current address not found'
      }
    }

    // Get bank account from loan contract (most recent signed contract)
    const { data: applicationData } = await supabase
      .from('loan_applications')
      .select('id')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const applicationId = (applicationData as { id: string } | null)?.id || ''

    const { data: contractData } = await supabase
      .from('loan_contracts')
      .select('bank_account')
      .eq('loan_application_id', applicationId)
      .single()

    const contract = contractData as { bank_account: any } | null

    const bankAccount = contract?.bank_account as {
      institution_number?: string
      transit_number?: string
      account_number?: string
    } | null

    if (
      !bankAccount?.institution_number ||
      !bankAccount?.transit_number ||
      !bankAccount?.account_number
    ) {
      return {
        success: false,
        customerId: null,
        error: 'Bank account information not found'
      }
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
    const updatePayload: UserUpdate = {
      accept_pay_customer_id: response.Id,
      accept_pay_customer_status: 'active',
      accept_pay_customer_created_at: new Date().toISOString(),
      accept_pay_customer_updated_at: new Date().toISOString()
    }
    const { error: updateError } = await (supabase.from('users') as any)
      .update(updatePayload)
      .eq('id', userId)

    if (updateError) {
      console.error(
        'Error updating user with Accept Pay customer ID:',
        updateError
      )
      return { success: false, customerId: null, error: updateError.message }
    }

    return { success: true, customerId: response.Id, error: null }
  } catch (error: any) {
    console.error('Error creating Accept Pay customer:', error)
    return {
      success: false,
      customerId: null,
      error: error.message || 'Unknown error'
    }
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

  const userData = data as { accept_pay_customer_id: number | null } | null
  return userData?.accept_pay_customer_id ?? null
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

  const updatePayload: UserUpdate = {
    accept_pay_customer_status: status,
    accept_pay_customer_updated_at: new Date().toISOString()
  }
  const { error } = await (supabase.from('users') as any)
    .update(updatePayload)
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
): Promise<{
  success: boolean
  transactionId: number | null
  error: string | null
}> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    // Get loan data
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select('*, users!loans_user_id_fkey(*)')
      .eq('id', loanId)
      .single()

    if (loanError || !loanData) {
      return { success: false, transactionId: null, error: 'Loan not found' }
    }

    const loan = loanData as Loan & { users: User }

    // Check if loan already has a disbursement transaction
    if (loan.disbursement_transaction_id) {
      const statusMessage = loan.disbursement_status === 'AA' 
        ? 'already completed'
        : loan.disbursement_authorized_at
        ? 'already authorized'
        : loan.disbursement_initiated_at
        ? 'already initiated'
        : 'already has a transaction'
      
      return {
        success: false,
        transactionId: loan.disbursement_transaction_id,
        error: `Loan disbursement ${statusMessage}. Transaction ID: ${loan.disbursement_transaction_id}`
      }
    }

    // Check if loan status is already active (disbursed)
    if (loan.status === 'active' && loan.disbursement_completed_at) {
      return {
        success: false,
        transactionId: loan.disbursement_transaction_id || null,
        error: 'Loan has already been disbursed and is active'
      }
    }

    const user = loan.users as User

    // Get or create Accept Pay customer
    let customerId = loan.accept_pay_customer_id || user.accept_pay_customer_id
    if (!customerId) {
      const customerResult = await createAcceptPayCustomer(user.id, isServer)
      if (!customerResult.success || !customerResult.customerId) {
        return {
          success: false,
          transactionId: null,
          error: 'Failed to create Accept Pay customer'
        }
      }
      customerId = customerResult.customerId
    }

    // Get minimum process date
    const acceptPayClient = getAcceptPayClient()
    const minDateResponse = await acceptPayClient.getMinProcessDate()
    const processDate = minDateResponse.ProcessDate

    // Create disbursement transaction (CR = Credit)
    const transactionResponse = await acceptPayClient.createTransaction({
      CustomerId: customerId,
      ProcessDate: processDate,
      Amount: loan.principal_amount,
      TransactionType: TransactionType.Credit, // Credit = deposit to borrower
      PaymentType: ACCEPT_PAY_PAYMENT_TYPES.AdvencePayroll,
      PADTType: 'Personal',
      Status: 'Authorized',
      Schedule: AcceptPayTransactionSchedule.OneTime, // One time deposit
      Memo: `Loan disbursement - Loan #${loan.loan_number || loanId}`,
      Reference: `LOAN-${loan.loan_number || loanId}`
    })

    // Update loan with transaction details
    const loanUpdatePayload: LoanUpdate = {
      accept_pay_customer_id: customerId,
      disbursement_transaction_id: transactionResponse.Id,
      disbursement_process_date: processDate,
      disbursement_status: '101', // Initiated
      disbursement_initiated_at: new Date().toISOString(),
      status: 'active'
    }
    const updateResult = await updateLoan(loanId, loanUpdatePayload, { 
      isServer: true, 
      useAdminClient: true 
    })

    await createCollectionTransactionsForSchedule(loanId, isServer)

    if (!updateResult.success) {
      console.error(
        'Error updating loan with disbursement details:',
        updateResult.error,
        loanId
      )
      return { 
        success: false, 
        transactionId: null, 
        error: updateResult.error || 'Failed to update loan' 
      }
    }

    return { success: true, transactionId: transactionResponse.Id, error: null }
  } catch (error: any) {
    console.error('Error initiating disbursement:', error)
    return {
      success: false,
      transactionId: null,
      error: error.message || 'Unknown error'
    }
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
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select('disbursement_transaction_id')
      .eq('id', loanId)
      .single()

    const loan = loanData as {
      disbursement_transaction_id: number | null
    } | null

    if (loanError || !loan?.disbursement_transaction_id) {
      return { success: false, error: 'Loan or transaction not found' }
    }

    const acceptPayClient = getAcceptPayClient()
    await acceptPayClient.authorizeTransaction(loan.disbursement_transaction_id)

    // Update loan
    const loanUpdatePayload: LoanUpdate = {
      disbursement_status: '101', // Authorized
      disbursement_authorized_at: new Date().toISOString()
    }
    const { error: updateError } = await (supabase.from('loans') as any)
      .update(loanUpdatePayload)
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
    const { data: loanData } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single()

    const loan = loanData as Loan | null

    if (loan) {
      // Calculate payment amount (principal + interest) / term_months
      const totalAmount =
        loan.principal_amount * (1 + (loan.interest_rate || 0) / 100)
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
      } else {
        // Create Accept Pay collection transactions for all scheduled payments
        // Accept Pay will automatically process them on their due dates
        await createCollectionTransactionsForSchedule(loanId, isServer)
      }
    }
  } else if (errorCode) {
    updateData.disbursement_error_code = errorCode
  }

  const { error } = await (supabase.from('loans') as any)
    .update(updateData)
    .eq('id', loanId)

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

  const loanData = data as {
    disbursement_status: string | null
    disbursement_transaction_id: number | null
  } | null

  return {
    status: loanData?.disbursement_status ?? null,
    transactionId: loanData?.disbursement_transaction_id ?? null
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

    const { error } = await (
      supabase.from('loan_payment_schedule') as any
    ).insert(schedules)

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
 * Create Accept Pay collection transactions for all scheduled payments
 * This is called automatically when a loan is disbursed
 * Accept Pay will process these transactions on their scheduled dates
 */
export async function createCollectionTransactionsForSchedule(
  loanId: string,
  isServer = true
): Promise<void> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    // Get all pending payment schedules for this loan
    const { data: schedules, error: scheduleError } = await supabase
      .from('loan_payment_schedule')
      .select('*')
      .eq('loan_id', loanId)
      .eq('status', 'pending')
      .order('payment_number', { ascending: true })

    if (scheduleError || !schedules || schedules.length === 0) {
      console.warn('No payment schedules found for loan:', loanId)
      return
    }

    const paymentSchedules = schedules as LoanPaymentSchedule[]

    // Get loan with customer info
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select('*, users!loans_user_id_fkey(*)')
      .eq('id', loanId)
      .single()

    if (loanError || !loanData) {
      console.error('Loan not found:', loanId)
      return
    }

    const loan = loanData as Loan & { users: User }
    let customerId =
      loan.accept_pay_customer_id || loan.users.accept_pay_customer_id

    // If customer doesn't exist, create it
    if (!customerId) {
      console.log('Accept Pay customer not found, creating customer for user:', loan.users.id)
      const customerResult = await createAcceptPayCustomer(loan.users.id, isServer)
      
      if (!customerResult.success || !customerResult.customerId) {
        console.error(
          'Failed to create Accept Pay customer for loan:',
          loanId,
          customerResult.error
        )
        return
      }
      
      customerId = customerResult.customerId
      console.log('Created Accept Pay customer:', customerId, 'for loan:', loanId)
    }

    // Get minimum process date
    const acceptPayClient = getAcceptPayClient()
    const minDateResponse = await acceptPayClient.getMinProcessDate()
    const minDate = new Date(minDateResponse.ProcessDate)

    // Create Accept Pay transaction for each scheduled payment
    for (const schedule of paymentSchedules) {
      try {
        const scheduledDate = new Date(schedule.scheduled_date)
        // Use scheduled date if it's >= min process date, otherwise use min process date
        const finalProcessDate =
          scheduledDate >= minDate
            ? schedule.scheduled_date
            : minDateResponse.ProcessDate

        // Create collection transaction (DB = Debit) - Accept Pay will process on ProcessDate
        const transactionResponse = await acceptPayClient.createTransaction({
          CustomerId: customerId,
          ProcessDate: finalProcessDate,
          Amount: schedule.amount,
          TransactionType: 'DB', // Debit = collect from borrower
          PaymentType: ACCEPT_PAY_PAYMENT_TYPES.PersonalLoans,
          PADTType: 'Personal',
          Status: 'Authorized', // Authorized so Accept Pay processes automatically
          Schedule: AcceptPayTransactionSchedule.OneTime, // One-time payment
          Memo: `Loan payment #${schedule.payment_number} - Loan #${loan.loan_number || loanId}`,
          Reference: `PAYMENT-${schedule.id}`
        })

        // Update schedule with transaction ID
        const updatePayload: LoanPaymentScheduleUpdate = {
          accept_pay_transaction_id: transactionResponse.Id,
          status: 'authorized'
        }
        await (supabase.from('loan_payment_schedule') as any)
          .update(updatePayload)
          .eq('id', schedule.id)

        console.log(
          `Created Accept Pay collection transaction ${transactionResponse.Id} for payment #${schedule.payment_number}`
        )
      } catch (error: any) {
        console.error(
          `Failed to create collection transaction for schedule ${schedule.id}:`,
          error
        )
        // Continue with other schedules even if one fails
      }
    }
  } catch (error: any) {
    console.error('Error creating collection transactions:', error)
    // Don't throw - this is called from updateDisbursementStatus
  }
}

/**
 * Initiate payment collection transaction in Accept Pay
 * Note: This is now mainly used for manual retries. Collection transactions
 * are automatically created when a loan is disbursed.
 */
export async function initiatePaymentCollection(
  scheduleId: string,
  isServer = true
): Promise<{
  success: boolean
  transactionId: number | null
  error: string | null
}> {
  const supabase: SupabaseClient<Database> = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  try {
    // Get payment schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('loan_payment_schedule')
      .select(
        '*, loans!loan_payment_schedule_loan_id_fkey(*, users!loans_user_id_fkey(*))'
      )
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return {
        success: false,
        transactionId: null,
        error: 'Payment schedule not found'
      }
    }

    const scheduleData = schedule as LoanPaymentSchedule & {
      loans: Loan & { users: User }
    }
    const loan = scheduleData.loans

    // Get or create customer ID
    let customerId =
      loan.accept_pay_customer_id || loan.users.accept_pay_customer_id
    if (!customerId) {
      console.log('Accept Pay customer not found, creating customer for user:', loan.users.id)
      const customerResult = await createAcceptPayCustomer(loan.users.id, isServer)
      
      if (!customerResult.success || !customerResult.customerId) {
        return {
          success: false,
          transactionId: null,
          error: `Failed to create Accept Pay customer: ${customerResult.error || 'Unknown error'}`
        }
      }
      
      customerId = customerResult.customerId
      console.log('Created Accept Pay customer:', customerId, 'for user:', loan.users.id)
    }

    // Get minimum process date
    const acceptPayClient = getAcceptPayClient()
    const minDateResponse = await acceptPayClient.getMinProcessDate()
    const processDate = minDateResponse.ProcessDate

    // Use scheduled date if it's >= min process date, otherwise use min process date
    const scheduledDate = new Date(scheduleData.scheduled_date)
    const minDate = new Date(minDateResponse.ProcessDate)
    const finalProcessDate =
      scheduledDate >= minDate
        ? scheduleData.scheduled_date
        : minDateResponse.ProcessDate

    // Create collection transaction (DB = Debit)
    const transactionResponse = await acceptPayClient.createTransaction({
      CustomerId: customerId,
      ProcessDate: finalProcessDate,
      Amount: scheduleData.amount,
      TransactionType: 'DB', // Debit = collect from borrower
      PaymentType: ACCEPT_PAY_PAYMENT_TYPES.PersonalLoans,
      PADTType: 'Personal',
      Status: 'Authorized',
      Memo: `Loan payment #${scheduleData.payment_number}`,
      Reference: `PAYMENT-${scheduleData.id}`
    })

    // Update schedule
    const updatePayload: LoanPaymentScheduleUpdate = {
      accept_pay_transaction_id: transactionResponse.Id,
      status: 'scheduled'
    }
    const { error: updateError } = await (
      supabase.from('loan_payment_schedule') as any
    )
      .update(updatePayload)
      .eq('id', scheduleId)

    if (updateError) {
      console.error('Error updating payment schedule:', updateError)
      return { success: false, transactionId: null, error: updateError.message }
    }

    return { success: true, transactionId: transactionResponse.Id, error: null }
  } catch (error: any) {
    console.error('Error initiating payment collection:', error)
    return {
      success: false,
      transactionId: null,
      error: error.message || 'Unknown error'
    }
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

    if (scheduleError || !schedule) {
      return { success: false, error: 'Payment schedule not found' }
    }

    const scheduleData = schedule as {
      accept_pay_transaction_id: number | null
    }
    if (!scheduleData.accept_pay_transaction_id) {
      return { success: false, error: 'Transaction not found' }
    }

    const acceptPayClient = getAcceptPayClient()
    await acceptPayClient.authorizeTransaction(
      scheduleData.accept_pay_transaction_id
    )

    // Update schedule
    const updatePayload: LoanPaymentScheduleUpdate = {
      status: 'authorized'
    }
    const { error: updateError } = await (
      supabase.from('loan_payment_schedule') as any
    )
      .update(updatePayload)
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

    const scheduleData = schedule as LoanPaymentSchedule & {
      loans: Loan
    }

    const updateData: LoanPaymentScheduleUpdate = {}

    if (status === 'AA') {
      // Approved - create payment record and update loan balance
      updateData.status = 'collected'

      // Create loan payment record
      const loan = scheduleData.loans
      const paymentInsert: LoanPaymentInsert = {
        loan_id: scheduleData.loan_id,
        amount: scheduleData.amount,
        payment_date: new Date().toISOString(),
        status: 'confirmed',
        accept_pay_customer_id: loan.accept_pay_customer_id,
        accept_pay_transaction_id: scheduleData.accept_pay_transaction_id,
        process_date: scheduleData.scheduled_date,
        accept_pay_status: status,
        collection_completed_at: new Date().toISOString()
      }
      const { data: payment, error: paymentError } = await (
        supabase.from('loan_payments') as any
      )
        .insert(paymentInsert)
        .select()
        .single()

      if (paymentError || !payment) {
        return { success: false, error: 'Failed to create payment record' }
      }

      const paymentData = payment as LoanPayment
      updateData.loan_payment_id = paymentData.id

      // Update loan remaining balance
      const { data: loanData } = await supabase
        .from('loans')
        .select('remaining_balance')
        .eq('id', scheduleData.loan_id)
        .single()

      if (loanData) {
        const loanDataTyped = loanData as { remaining_balance: number | null }
        const newBalance = Math.max(
          0,
          (loanDataTyped.remaining_balance || 0) - scheduleData.amount
        )
        await (supabase.from('loans') as any)
          .update({ remaining_balance: newBalance })
          .eq('id', scheduleData.loan_id)
      }
    } else if (errorCode) {
      updateData.status = 'failed'
    }

    const { error: updateError } = await (
      supabase.from('loan_payment_schedule') as any
    )
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

    if (scheduleError || !schedule) {
      return { success: false, error: 'Payment schedule not found' }
    }

    const scheduleData = schedule as {
      accept_pay_transaction_id: number | null
    }
    if (!scheduleData.accept_pay_transaction_id) {
      return { success: false, error: 'Transaction not found' }
    }

    const acceptPayClient = getAcceptPayClient()
    await acceptPayClient.voidTransaction(
      scheduleData.accept_pay_transaction_id
    )

    // Update schedule
    const updatePayload: LoanPaymentScheduleUpdate = {
      status: 'cancelled'
    }
    const { error: updateError } = await (
      supabase.from('loan_payment_schedule') as any
    )
      .update(updatePayload)
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

    const lastSyncData = lastSync as { last_sync_at: string } | null
    const changedSince =
      lastSyncData?.last_sync_at ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Default to 7 days ago

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
          const loanData = loan as { id: string }
          await updateDisbursementStatus(
            loanData.id,
            status,
            update.ErrorCode,
            isServer
          )
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
          const scheduleData = schedule as { id: string }
          await updatePaymentStatus(
            scheduleData.id,
            status,
            update.ErrorCode,
            isServer
          )
          transactionsSynced++
        }
      } catch (error: any) {
        errors.push(
          `Error processing transaction ${update.Id}: ${error.message}`
        )
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

  const { error } = await (supabase.from('accept_pay_sync_log') as any).insert(
    syncLog
  )

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

  const syncLogData = data as { last_sync_at: string }
  return syncLogData.last_sync_at
}
