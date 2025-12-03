/**
 * Accept Pay Payment Provider Implementation
 * 
 * Implements the PaymentProvider interface for Accept Pay Global API.
 * This provider handles EFT (Electronic Funds Transfer) payments in Canada.
 */

import type { PaymentProvider } from '../interfaces'
import type {
  PaymentProviderName,
  CustomerData,
  ProviderCustomer,
  TransactionData,
  ProviderTransaction,
  TransactionUpdate,
  CreateCustomerResult,
  GetCustomerResult,
  CreateTransactionResult,
  GetTransactionResult,
  AuthorizeTransactionResult,
  VoidTransactionResult,
  SyncTransactionsResult,
  ProviderCapabilities,
  ProviderResult,
  TransactionStatus
} from '../types'
import { getAcceptPayClient } from '@/src/lib/accept-pay/client'
import {
  validateAccountNumber,
  validateProcessDate,
  sanitizeName,
  sanitizeAddress,
  sanitizeCity,
  sanitizeMemo,
  validatePhone,
  validateEmail,
  validateProvince,
  validatePostalCode,
  validateInstitutionNumber,
  validateTransitNumber,
  validateAmount
} from '@/src/lib/accept-pay/validation'
import { getErrorMessage } from '@/src/lib/accept-pay/errors'

// Accept Pay specific types
interface AcceptPayCustomer {
  Id: number
  FirstName?: string
  LastName?: string
  Email?: string
  Phone?: string
  Status?: string
  CreatedDate?: string
  UpdatedDate?: string
  [key: string]: unknown
}

interface AcceptPayTransaction {
  Id: number
  CustomerId: number
  Amount: number
  ProcessDate: string
  Status: string
  TransactionType: 'DB' | 'CR'
  ErrorCode?: string
  ErrorMessage?: string
  AuthorizedDate?: string
  CompletedDate?: string
  [key: string]: unknown
}

interface AcceptPayTransactionUpdate {
  Id: number
  CustomerId: number
  Status: string
  ErrorCode?: string
  ErrorMessage?: string
  UpdatedDate?: string
  [key: string]: unknown
}

interface AcceptPayMinProcessDate {
  ProcessDate: string
  CutOffTime: string
}

// Payment types for Accept Pay
const ACCEPT_PAY_PAYMENT_TYPES = {
  PersonalLoans: 351,
  AdvancePayroll: 204
} as const

// Schedule types (from Accept Pay)
const ACCEPT_PAY_SCHEDULE = {
  OneTime: 8
} as const

/**
 * Accept Pay Payment Provider
 */
export class AcceptPayProvider implements PaymentProvider {
  private client = getAcceptPayClient()

  // ===========================
  // PROVIDER IDENTIFICATION
  // ===========================

  getProviderName(): PaymentProviderName {
    return 'accept_pay'
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supports_recurring: true,
      supports_authorization: true,
      supports_void: true,
      supports_sync: true,
      min_process_days: 1, // EFT requires 1 business day notice
      supported_currencies: ['CAD'],
      supported_countries: ['CA']
    }
  }

  // ===========================
  // CUSTOMER MANAGEMENT
  // ===========================

  async createCustomer(customerData: CustomerData): Promise<CreateCustomerResult> {
    try {
      // Validate customer data
      const validation = this.validateCustomerData(customerData)
      if (!validation.success) {
        return {
          success: false,
          error: validation.error,
          error_code: 'VALIDATION_ERROR',
          error_details: validation.error_details
        }
      }

      // Map to Accept Pay format
      const acceptPayData = this.mapCustomerToAcceptPay(customerData)

      // Create customer in Accept Pay
      const response = await this.client.createCustomer(acceptPayData)

      // Fetch full customer details
      const customer = await this.client.getCustomer(response.Id) as AcceptPayCustomer

      return {
        success: true,
        data: this.mapAcceptPayCustomerToProvider(customer)
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create customer in Accept Pay',
        error_code: 'CREATE_CUSTOMER_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  async getCustomer(customerId: string): Promise<GetCustomerResult> {
    try {
      const id = parseInt(customerId, 10)
      if (isNaN(id)) {
        return {
          success: false,
          error: 'Invalid customer ID format',
          error_code: 'INVALID_ID'
        }
      }

      const customer = await this.client.getCustomer(id) as AcceptPayCustomer

      return {
        success: true,
        data: this.mapAcceptPayCustomerToProvider(customer)
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to retrieve customer from Accept Pay',
        error_code: 'GET_CUSTOMER_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  async updateCustomer(
    customerId: string,
    updates: Partial<CustomerData>
  ): Promise<ProviderResult<ProviderCustomer>> {
    try {
      const id = parseInt(customerId, 10)
      if (isNaN(id)) {
        return {
          success: false,
          error: 'Invalid customer ID format',
          error_code: 'INVALID_ID'
        }
      }

      // Map updates to Accept Pay format
      const acceptPayUpdates: Record<string, unknown> = {}
      
      if (updates.first_name) acceptPayUpdates.FirstName = sanitizeName(updates.first_name)
      if (updates.last_name) acceptPayUpdates.LastName = sanitizeName(updates.last_name)
      if (updates.email) acceptPayUpdates.Email = updates.email
      if (updates.phone) {
        const phoneValidation = validatePhone(updates.phone)
        if (phoneValidation.valid && phoneValidation.cleaned) {
          acceptPayUpdates.Phone = phoneValidation.cleaned
        }
      }
      if (updates.address) {
        acceptPayUpdates.Address = this.buildAddressString(updates.address)
        acceptPayUpdates.City = sanitizeCity(updates.address.city)
        acceptPayUpdates.State = updates.address.province
        acceptPayUpdates.Zip = updates.address.postal_code.replace(/\s/g, '')
        acceptPayUpdates.Country = updates.address.country || 'CA'
      }
      if (updates.bank_account) {
        if (updates.bank_account.institution_number) {
          const instValidation = validateInstitutionNumber(updates.bank_account.institution_number)
          if (instValidation.valid && instValidation.cleaned) {
            acceptPayUpdates.Institution_Number = instValidation.cleaned
          }
        }
        if (updates.bank_account.transit_number) {
          const transitValidation = validateTransitNumber(updates.bank_account.transit_number)
          if (transitValidation.valid && transitValidation.cleaned) {
            acceptPayUpdates.Transit_Number = transitValidation.cleaned
          }
        }
        if (updates.bank_account.account_number) {
          const accountValidation = validateAccountNumber(updates.bank_account.account_number)
          if (accountValidation.valid) {
            acceptPayUpdates.Account_Number = updates.bank_account.account_number.replace(/\D/g, '')
          }
        }
      }

      await this.client.updateCustomer(id, acceptPayUpdates)

      // Fetch updated customer
      const customer = await this.client.getCustomer(id) as AcceptPayCustomer

      return {
        success: true,
        data: this.mapAcceptPayCustomerToProvider(customer)
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update customer in Accept Pay',
        error_code: 'UPDATE_CUSTOMER_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  async suspendCustomer(customerId: string): Promise<ProviderResult<void>> {
    try {
      const id = parseInt(customerId, 10)
      if (isNaN(id)) {
        return {
          success: false,
          error: 'Invalid customer ID format',
          error_code: 'INVALID_ID'
        }
      }

      await this.client.suspendCustomer(id)

      return {
        success: true
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to suspend customer in Accept Pay',
        error_code: 'SUSPEND_CUSTOMER_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  // ===========================
  // TRANSACTION MANAGEMENT
  // ===========================

  async createTransaction(transactionData: TransactionData): Promise<CreateTransactionResult> {
    try {
      // Validate transaction data
      const validation = this.validateTransactionData(transactionData)
      if (!validation.success) {
        return {
          success: false,
          error: validation.error,
          error_code: 'VALIDATION_ERROR',
          error_details: validation.error_details
        }
      }

      // Map to Accept Pay format
      const acceptPayData = this.mapTransactionToAcceptPay(transactionData)

      // Create transaction in Accept Pay
      const response = await this.client.createTransaction(acceptPayData)

      // Fetch full transaction details
      const transaction = await this.client.getTransaction(response.Id) as AcceptPayTransaction

      return {
        success: true,
        data: this.mapAcceptPayTransactionToProvider(transaction)
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create transaction in Accept Pay',
        error_code: 'CREATE_TRANSACTION_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  async getTransaction(transactionId: string): Promise<GetTransactionResult> {
    try {
      const id = parseInt(transactionId, 10)
      if (isNaN(id)) {
        return {
          success: false,
          error: 'Invalid transaction ID format',
          error_code: 'INVALID_ID'
        }
      }

      const transaction = await this.client.getTransaction(id) as AcceptPayTransaction

      return {
        success: true,
        data: this.mapAcceptPayTransactionToProvider(transaction)
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to retrieve transaction from Accept Pay',
        error_code: 'GET_TRANSACTION_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  async getTransactionStatus(transactionId: string): Promise<ProviderResult<{
    status: string
    provider_status: string
    error_code?: string | null
    error_message?: string | null
  }>> {
    try {
      const result = await this.getTransaction(transactionId)
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get transaction status',
          error_code: result.error_code
        }
      }

      return {
        success: true,
        data: {
          status: result.data.status,
          provider_status: result.data.provider_status,
          error_code: result.data.error_code,
          error_message: result.data.error_message
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get transaction status',
        error_code: 'GET_STATUS_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  async authorizeTransaction(transactionId: string): Promise<AuthorizeTransactionResult> {
    try {
      const id = parseInt(transactionId, 10)
      if (isNaN(id)) {
        return {
          success: false,
          error: 'Invalid transaction ID format',
          error_code: 'INVALID_ID'
        }
      }

      await this.client.authorizeTransaction(id)

      return {
        success: true
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to authorize transaction in Accept Pay',
        error_code: 'AUTHORIZE_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  async voidTransaction(transactionId: string, reason?: string): Promise<VoidTransactionResult> {
    try {
      const id = parseInt(transactionId, 10)
      if (isNaN(id)) {
        return {
          success: false,
          error: 'Invalid transaction ID format',
          error_code: 'INVALID_ID'
        }
      }

      // Accept Pay supports both DELETE and POST void methods
      // Using DELETE method as primary
      await this.client.voidTransaction(id)

      return {
        success: true
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to void transaction in Accept Pay',
        error_code: 'VOID_ERROR',
        error_details: { original_error: error.message, reason }
      }
    }
  }

  // ===========================
  // TRANSACTION SYNCHRONIZATION
  // ===========================

  async syncTransactions(changedSince: string | Date): Promise<SyncTransactionsResult> {
    try {
      // Format date for Accept Pay API (YYYY-MM-DD)
      const dateStr = typeof changedSince === 'string' 
        ? this.formatDateForAPI(changedSince)
        : this.formatDateForAPI(changedSince.toISOString())

      // Get transaction updates from Accept Pay
      const updates = await this.client.getTransactionUpdates(dateStr) as AcceptPayTransactionUpdate[]

      // Map to provider transaction updates
      const mappedUpdates: TransactionUpdate[] = updates.map(update => ({
        transaction_id: String(update.Id),
        status: this.mapAcceptPayStatusToProvider(update.Status),
        provider_status: update.Status,
        error_code: update.ErrorCode || null,
        error_message: update.ErrorMessage || (update.ErrorCode ? getErrorMessage(update.ErrorCode) : null),
        updated_at: update.UpdatedDate || new Date().toISOString(),
        raw_data: update
      }))

      return {
        success: true,
        data: mappedUpdates
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to sync transactions from Accept Pay',
        error_code: 'SYNC_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  // ===========================
  // PROVIDER UTILITIES
  // ===========================

  async getMinProcessDate(): Promise<ProviderResult<{
    process_date: string
    cut_off_time?: string
    timezone?: string
  }>> {
    try {
      const response = await this.client.getMinProcessDate() as AcceptPayMinProcessDate

      return {
        success: true,
        data: {
          process_date: response.ProcessDate,
          cut_off_time: response.CutOffTime,
          timezone: 'America/Toronto' // Accept Pay uses EST/EDT
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get minimum process date from Accept Pay',
        error_code: 'GET_MIN_DATE_ERROR',
        error_details: { original_error: error.message }
      }
    }
  }

  validateTransactionData(transactionData: TransactionData): ProviderResult<void> {
    // Validate amount
    const amountValidation = validateAmount(transactionData.amount)
    if (!amountValidation.valid) {
      return {
        success: false,
        error: amountValidation.error,
        error_code: 'INVALID_AMOUNT',
        error_details: { field: 'amount', error: amountValidation.error }
      }
    }

    // Validate process date format
    const dateValidation = validateProcessDate(transactionData.process_date)
    if (!dateValidation.valid) {
      return {
        success: false,
        error: dateValidation.error,
        error_code: 'INVALID_DATE',
        error_details: { field: 'process_date', error: dateValidation.error }
      }
    }

    // Validate customer ID
    const customerId = parseInt(transactionData.customer_id, 10)
    if (isNaN(customerId)) {
      return {
        success: false,
        error: 'Invalid customer ID format',
        error_code: 'INVALID_CUSTOMER_ID',
        error_details: { field: 'customer_id', value: transactionData.customer_id }
      }
    }

    // Validate memo if provided
    if (transactionData.memo) {
      const sanitized = sanitizeMemo(transactionData.memo)
      if (sanitized.length === 0 && transactionData.memo.length > 0) {
        return {
          success: false,
          error: 'Memo contains invalid characters',
          error_code: 'INVALID_MEMO',
          error_details: { field: 'memo' }
        }
      }
    }

    return { success: true }
  }

  validateCustomerData(customerData: CustomerData): ProviderResult<void> {
    // Validate names
    if (!customerData.first_name || sanitizeName(customerData.first_name).length === 0) {
      return {
        success: false,
        error: 'First name is required and must contain valid characters',
        error_code: 'INVALID_FIRST_NAME',
        error_details: { field: 'first_name' }
      }
    }

    if (!customerData.last_name || sanitizeName(customerData.last_name).length === 0) {
      return {
        success: false,
        error: 'Last name is required and must contain valid characters',
        error_code: 'INVALID_LAST_NAME',
        error_details: { field: 'last_name' }
      }
    }

    // Validate email
    const emailValidation = validateEmail(customerData.email)
    if (!emailValidation.valid) {
      return {
        success: false,
        error: emailValidation.error,
        error_code: 'INVALID_EMAIL',
        error_details: { field: 'email', error: emailValidation.error }
      }
    }

    // Validate phone
    const phoneValidation = validatePhone(customerData.phone)
    if (!phoneValidation.valid) {
      return {
        success: false,
        error: phoneValidation.error,
        error_code: 'INVALID_PHONE',
        error_details: { field: 'phone', error: phoneValidation.error }
      }
    }

    // Validate address
    if (!customerData.address.city || sanitizeCity(customerData.address.city).length === 0) {
      return {
        success: false,
        error: 'City is required and must contain valid characters',
        error_code: 'INVALID_CITY',
        error_details: { field: 'address.city' }
      }
    }

    const provinceValidation = validateProvince(customerData.address.province)
    if (!provinceValidation.valid) {
      return {
        success: false,
        error: provinceValidation.error,
        error_code: 'INVALID_PROVINCE',
        error_details: { field: 'address.province', error: provinceValidation.error }
      }
    }

    const postalCodeValidation = validatePostalCode(customerData.address.postal_code)
    if (!postalCodeValidation.valid) {
      return {
        success: false,
        error: postalCodeValidation.error,
        error_code: 'INVALID_POSTAL_CODE',
        error_details: { field: 'address.postal_code', error: postalCodeValidation.error }
      }
    }

    // Validate bank account
    if (!customerData.bank_account.institution_number) {
      return {
        success: false,
        error: 'Institution number is required',
        error_code: 'MISSING_INSTITUTION_NUMBER',
        error_details: { field: 'bank_account.institution_number' }
      }
    }

    const instValidation = validateInstitutionNumber(customerData.bank_account.institution_number)
    if (!instValidation.valid) {
      return {
        success: false,
        error: instValidation.error,
        error_code: 'INVALID_INSTITUTION_NUMBER',
        error_details: { field: 'bank_account.institution_number', error: instValidation.error }
      }
    }

    if (!customerData.bank_account.transit_number) {
      return {
        success: false,
        error: 'Transit number is required',
        error_code: 'MISSING_TRANSIT_NUMBER',
        error_details: { field: 'bank_account.transit_number' }
      }
    }

    const transitValidation = validateTransitNumber(customerData.bank_account.transit_number)
    if (!transitValidation.valid) {
      return {
        success: false,
        error: transitValidation.error,
        error_code: 'INVALID_TRANSIT_NUMBER',
        error_details: { field: 'bank_account.transit_number', error: transitValidation.error }
      }
    }

    const accountValidation = validateAccountNumber(customerData.bank_account.account_number)
    if (!accountValidation.valid) {
      return {
        success: false,
        error: accountValidation.error,
        error_code: 'INVALID_ACCOUNT_NUMBER',
        error_details: { field: 'bank_account.account_number', error: accountValidation.error }
      }
    }

    return { success: true }
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  /**
   * Map CustomerData to Accept Pay format
   */
  private mapCustomerToAcceptPay(customerData: CustomerData) {
    return {
      FirstName: sanitizeName(customerData.first_name),
      LastName: sanitizeName(customerData.last_name),
      Address: this.buildAddressString(customerData.address),
      City: sanitizeCity(customerData.address.city),
      State: customerData.address.province || '',
      Zip: customerData.address.postal_code.replace(/\s/g, ''),
      Country: customerData.address.country || 'CA',
      Phone: customerData.phone.replace(/\D/g, ''),
      Institution_Number: customerData.bank_account.institution_number!,
      Transit_Number: customerData.bank_account.transit_number!,
      Account_Number: customerData.bank_account.account_number.replace(/\D/g, ''),
      Email: customerData.email,
      PADTType: 'Personal' // Default for personal loans
    }
  }

  /**
   * Map Accept Pay customer to ProviderCustomer
   */
  private mapAcceptPayCustomerToProvider(customer: AcceptPayCustomer): ProviderCustomer {
    return {
      id: String(customer.Id),
      status: customer.Status || 'active',
      created_at: customer.CreatedDate,
      updated_at: customer.UpdatedDate,
      raw_data: customer
    }
  }

  /**
   * Map TransactionData to Accept Pay format
   */
  private mapTransactionToAcceptPay(transactionData: TransactionData) {
    // Determine payment type based on transaction type
    const paymentType = transactionData.transaction_type === 'disbursement'
      ? ACCEPT_PAY_PAYMENT_TYPES.AdvancePayroll
      : ACCEPT_PAY_PAYMENT_TYPES.PersonalLoans

    // Map direction
    const transactionType: 'DB' | 'CR' = transactionData.direction === 'credit' ? 'CR' : 'DB'

    // Convert schedule to number if provided (Accept Pay expects number)
    let schedule: number | undefined = ACCEPT_PAY_SCHEDULE.OneTime
    if (transactionData.schedule !== undefined) {
      if (typeof transactionData.schedule === 'number') {
        schedule = transactionData.schedule
      } else if (typeof transactionData.schedule === 'string') {
        const parsed = parseInt(transactionData.schedule, 10)
        schedule = isNaN(parsed) ? ACCEPT_PAY_SCHEDULE.OneTime : parsed
      }
    }

    return {
      CustomerId: parseInt(transactionData.customer_id, 10),
      ProcessDate: transactionData.process_date,
      Amount: transactionData.amount,
      TransactionType: transactionType,
      PaymentType: paymentType,
      PADTType: 'Personal',
      Status: 'Authorized', // Default status
      Schedule: schedule,
      Memo: transactionData.memo ? sanitizeMemo(transactionData.memo) : undefined,
      Reference: transactionData.reference ? sanitizeMemo(transactionData.reference) : undefined
    }
  }

  /**
   * Map Accept Pay transaction to ProviderTransaction
   */
  private mapAcceptPayTransactionToProvider(transaction: AcceptPayTransaction): ProviderTransaction {
    return {
      id: String(transaction.Id),
      customer_id: String(transaction.CustomerId),
      amount: transaction.Amount,
      process_date: transaction.ProcessDate,
      status: this.mapAcceptPayStatusToProvider(transaction.Status),
      provider_status: transaction.Status,
      direction: transaction.TransactionType === 'CR' ? 'credit' : 'debit',
      error_code: transaction.ErrorCode || null,
      error_message: transaction.ErrorMessage || (transaction.ErrorCode ? getErrorMessage(transaction.ErrorCode) : null),
      authorized_at: transaction.AuthorizedDate || null,
      completed_at: transaction.CompletedDate || null,
      raw_data: transaction
    }
  }

  /**
   * Map Accept Pay status to normalized TransactionStatus
   */
  private mapAcceptPayStatusToProvider(acceptPayStatus: string): TransactionStatus {
    // Accept Pay status codes:
    // 101 = Initiated
    // 102 = Sent to bank
    // PD = Pending
    // AA = Approved/Completed
    // 9XX/RXX = Error codes

    if (acceptPayStatus === '101') return 'initiated'
    if (acceptPayStatus === '102') return 'processing'
    if (acceptPayStatus === 'PD') return 'pending'
    if (acceptPayStatus === 'AA') return 'completed'
    
    // Error codes (9XX for EFT, RXX for ACH)
    if (/^9\d{2}$/.test(acceptPayStatus) || /^R\d{2}$/.test(acceptPayStatus)) {
      return 'failed'
    }

    // Default to pending for unknown statuses
    return 'pending'
  }

  /**
   * Build address string from CustomerAddress
   */
  private buildAddressString(address: CustomerData['address']): string {
    const parts = [
      address.street_number,
      address.street_name,
      address.apartment_number ? `Apt ${address.apartment_number}` : null
    ].filter(Boolean)
    return sanitizeAddress(parts.join(' ') || '')
  }

  /**
   * Format date for Accept Pay API (YYYY-MM-DD)
   */
  private formatDateForAPI(dateString: string): string {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // Parse the date string and format to YYYY-MM-DD
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${dateString}`)
    }
    
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }
}

/**
 * Get Accept Pay provider instance (singleton)
 */
let providerInstance: AcceptPayProvider | null = null

export function getAcceptPayProvider(): AcceptPayProvider {
  if (!providerInstance) {
    providerInstance = new AcceptPayProvider()
  }
  return providerInstance
}

