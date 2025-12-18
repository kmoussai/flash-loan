// Database types for Supabase tables

import { IBVSummary } from '@/src/app/api/inverite/fetch/[guid]/types'
import {
  BankAccount,
  PaymentFrequency,
  ContractTerms,
  Loan,
  Notification,
  NotificationInsert,
  NotificationUpdate,
  NotificationRecipient
} from '@/src/types'

export type Frequency = PaymentFrequency
export type { PaymentFrequency }
export type { ContractTerms }

// ===========================
// ENUMS
// ===========================

export type StaffRole = 'admin' | 'support' | 'intern'
export type KycStatus = 'pending' | 'verified' | 'rejected'
export type AddressType = 'current' | 'previous' | 'mailing' | 'work'
export type ApplicationStatus =
  | 'pending'
  | 'processing'
  | 'pre_approved'
  | 'contract_pending'
  | 'contract_signed'
  | 'approved'
  | 'rejected'
  | 'cancelled'
export type ContractStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'pending_signature'
  | 'signed'
  | 'rejected'
  | 'expired'
export type IbvProvider = 'flinks' | 'inverite' | 'plaid' | 'zumrails' | 'other'
export type IbvStatus =
  | 'pending'
  | 'processing'
  | 'verified'
  | 'failed'
  | 'cancelled'
  | 'expired'
export type DocumentType =
  | 'drivers_license'
  | 'passport'
  | 'health_card'
  | 'social_insurance'
  | 'permanent_resident_card'
  | 'citizenship_card'
  | 'birth_certificate'
  | 'other'
export type DocumentStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired'
export type LoanStatus =
  | 'pending_disbursement'
  | 'active'
  | 'completed'
  | 'defaulted'
  | 'cancelled'
export type PaymentStatus = 'pending' | 'confirmed' | 'paid' | 'failed' | 'rejected' | 'deferred' | 'manual' | 'cancelled' | 'rebate'
export type DocumentRequestStatus =
  | 'requested'
  | 'uploaded'
  | 'verified'
  | 'rejected'
  | 'expired'
export type RequestKind =
  | 'document'
  | 'address'
  | 'reference'
  | 'employment'
  | 'bank'
  | 'other'
export type IncomeSourceType =
  | 'employed'
  | 'employment-insurance'
  | 'self-employed'
  | 'csst-saaq'
  | 'parental-insurance'
  | 'retirement-plan'

// ===========================
// ACCEPT PAY TYPES
// ===========================

export type AcceptPayCustomerStatus = 'active' | 'suspended' | null
export enum TransactionType {
  Debit = 'DB',
  Credit = 'CR'
}
export enum AcceptPayTransactionSchedule {
  Monthly = 1,
  Annually = 2,
  Weekly = 3,
  BiWeekly = 4,
  SemiMonthly = 5,
  SemiAnnually = 6,
  MonthlyLastDay = 7,
  OneTime = 8,
  SemiMonthly15thAnd30th = 9,
  /*
  1 Monthly (30 Days)
  2 Annually (365 Days)
  3 Weekly
  4 Bi-Weekly
  5 Semi-Monthly (15th and last day)
  6 Semi-Annually
  7 Monthly (last day of month)
  8 One Time
  9 Semi-Monthly (15th and 30th)
  */
}

export type AcceptPayTransactionStatus =
  | '101'  // Initiated
  | '102'  // Sent to bank
  | 'PD'   // Pending
  | 'AA'   // Approved
  | string  // Error codes: 9XX (EFT), RXX (ACH)

export type AcceptPayTransactionType = 'DB' | 'CR' // Debit or Credit

export type PaymentScheduleStatus =
  | 'pending'
  | 'scheduled'
  | 'authorized'
  | 'collected'
  | 'missed'
  | 'failed'
  | 'cancelled'

// ===========================
// INCOME FIELDS TYPES (JSONB)
// ===========================

export interface EmployedIncomeFields {
  occupation: string
  company_name: string
  supervisor_name: string
  work_phone: string
  post: string
  payroll_frequency: PaymentFrequency
  date_hired: string
  next_pay_date: string
}

export interface EmploymentInsuranceIncomeFields {
  employment_insurance_start_date: string
  next_deposit_date: string
}

export interface SelfEmployedIncomeFields {
  paid_by_direct_deposit: 'yes' | 'no'
  self_employed_phone: string
  deposits_frequency: PaymentFrequency
  self_employed_start_date: string
  next_deposit_date: string
}

export interface OtherIncomeFields {
  next_deposit_date: string
}

export type IncomeFields =
  | EmployedIncomeFields
  | EmploymentInsuranceIncomeFields
  | SelfEmployedIncomeFields
  | OtherIncomeFields

// ===========================
// IBV PROVIDER DATA TYPES (JSONB)
// ===========================

export interface FlinksIbvData {
  flinks_login_id: string
  flinks_request_id: string
  flinks_institution?: string
  flinks_connected_at?: string
}

export interface InveriteIbvData {
  // Connection metadata
  session_id?: string
  applicant_id?: string
  request_guid?: string
  verified_at?: string

  // Account information
  account_info?: {
    institution_number: string
    transit_number: string
    account_number: string
    account_name: string
    account_holder: string
    balance: {
      available: number | null
      current: number | null
    }
  }

  // Account statistics
  account_stats?: {
    periods: string[]
    number_of_deposits: Record<string, number>
    amount_of_deposits: Record<string, number>
    average_amount_of_deposits: Record<string, number>
    avg_number_of_deposits: Record<string, number>
    highest_deposit: number
    lowest_deposit: number
    number_of_withdrawals: Record<string, number>
    amount_of_withdrawals: Record<string, number>
    average_amount_of_withdrawals: Record<string, number>
    average_number_of_withdrawals: Record<string, number>
    highest_withdrawal: number
    lowest_withdrawal: number
    number_of_nsfs: number
    highest_balance: number
    lowest_balance: number
    average_balance: number
    highest_overdraft: number
    lowest_overdraft: number
    number_of_overdrafts: number
    average_amount_of_overdrafts: number
  }

  // Account statement/transactions
  account_statement?: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    balance: number
  }>
}

export interface PlaidIbvData {
  item_id: string
  request_id?: string
  institution?: string
  access_token?: string
}

export interface OtherIbvData {
  [key: string]: any
}

export type IbvProviderData =
  | FlinksIbvData
  | InveriteIbvData
  | PlaidIbvData
  | OtherIbvData

// ===========================
// TABLE TYPES
// ===========================

// Extended User (Client) type
export interface User {
  id: string
  kyc_status: KycStatus
  national_id: string | null
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  phone: string | null
  email: string | null
  preferred_language: string | null
  current_address_id: string | null
  residence_status: string | null
  gross_salary: number | null
  rent_or_mortgage_cost: number | null
  heating_electricity_cost: number | null
  car_loan: number | null
  furniture_loan: number | null
  created_at: string
  updated_at: string | null
  // Accept Pay fields
  accept_pay_customer_id: number | null
  accept_pay_customer_status: AcceptPayCustomerStatus
  accept_pay_customer_created_at: string | null
  accept_pay_customer_updated_at: string | null
  // CRM migration fields
  crm_original_data: Record<string, any> | null
  // Bank account (populated from IBV results)
  bank_account: BankAccount | null
}

export interface Staff {
  id: string
  role: StaffRole
  department: string | null
  created_at: string
}

export interface PaymentProviderData {
  id: string
  client_id: string
  provider: 'accept_pay' | 'zumrails' | string
  provider_data: Record<string, any>
  created_at: string
  updated_at: string | null
}

export interface Address {
  id: string
  client_id: string
  address_type: AddressType
  street_number: string | null
  street_name: string | null
  apartment_number: string | null
  city: string
  province: string
  postal_code: string
  moving_date: string | null
  rent_cost: number | null
  is_current: boolean
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface LoanApplication {
  id: string
  client_id: string
  address_id: string | null
  loan_amount: number
  income_source: IncomeSourceType | null
  income_fields: Record<string, any>
  application_status: ApplicationStatus
  assigned_to: string | null
  bankruptcy_plan: boolean | null
  interest_rate: number | null
  staff_notes: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  // Contract-related timestamps
  contract_generated_at: string | null
  contract_sent_at: string | null
  contract_signed_at: string | null
  // Modular IBV fields
  ibv_results: IBVSummary | null
  ibv_provider: IbvProvider | null
  ibv_status: IbvStatus | null
  ibv_provider_data: IbvProviderData | null
  ibv_verified_at: string | null
  // Legacy Flinks fields (deprecated, kept for backward compatibility)
  flinks_login_id: string | null
  flinks_request_id: string | null
  flinks_institution: string | null
  flinks_verification_status: string | null
  flinks_connected_at: string | null
  // CRM migration fields
  crm_original_data: Record<string, any> | null
}

export interface LoanApplicationIbvRequest {
  id: string
  loan_application_id: string
  client_id: string
  provider: IbvProvider
  status: IbvStatus
  request_guid: string | null
  request_url: string | null
  provider_data: Record<string, any> | null
  results: Record<string, any> | null
  error_details: Record<string, any> | null
  note: string | null
  requested_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Reference {
  id: string
  loan_application_id: string
  first_name: string
  last_name: string
  phone: string
  relationship: string
  created_at: string
}

export interface IdDocument {
  id: string
  client_id: string
  document_type: DocumentType
  document_name: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  status: DocumentStatus
  rejection_reason: string | null
  verified_by: string | null
  verified_at: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DocumentRequest {
  id: string
  loan_application_id: string
  document_type_id: string
  group_id: string | null
  request_kind: RequestKind
  status: DocumentRequestStatus
  request_token_hash: string | null
  expires_at: string | null
  magic_link_sent_at: string | null
  uploaded_file_key: string | null
  uploaded_meta: Record<string, any>
  form_schema: Record<string, any>
  requested_by: string | null
  created_at: string
  updated_at: string
}

export interface RequestFormSubmission {
  id: string
  document_request_id: string
  submitted_by: string | null
  form_data: Record<string, any>
  submitted_at: string
  updated_at: string
}

export interface LoanPayment {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  method: string | null
  status: PaymentStatus
  created_at: string
  // Payment sequence
  payment_number: number | null
  // Payment breakdown
  interest: number | null
  principal: number | null
  remaining_balance: number | null
  // Accept Pay fields
  accept_pay_customer_id: number | null
  accept_pay_transaction_id: number | null
  process_date: string | null
  accept_pay_status: AcceptPayTransactionStatus | null
  accept_pay_reference: string | null
  authorized_at: string | null
  authorization_status: string | null
  collection_initiated_at: string | null
  collection_completed_at: string | null
  error_code: string | null
  retry_count: number
  voided_at: string | null
  void_reason: string | null
  // Notes/description
  notes: string | null
  // CRM original data
  crm_original_data: Record<string, any> | null
}

// ===========================
// ACCEPT PAY TABLE TYPES
// ===========================

export interface LoanPaymentSchedule {
  id: string
  loan_id: string
  scheduled_date: string
  amount: number
  payment_number: number
  status: PaymentScheduleStatus
  accept_pay_transaction_id: number | null
  loan_payment_id: string | null
  created_at: string
  updated_at: string
}

export interface AcceptPaySyncLog {
  id: string
  last_sync_at: string
  transactions_synced: number
  errors: string[]
  created_at: string
}

// ===========================
// CONTRACT TYPES (JSONB)
// ===========================

export interface ClientSignatureData {
  signature_method: 'click_to_sign' | 'drawn_signature' | 'uploaded'
  signature_name?: string
  ip_address: string
  user_agent: string
  signed_from_device?: string
  signature_timestamp: string
  pdf_hash?: string
  compliance_metadata?: {
    signed_at: string
    signature_name: string
    contract_version: number
    contract_number: number | null
    pdf_hash: string
    pdf_hash_algorithm: string
    ip_address: string
    user_agent: string
    signature_method: string
    compliance: {
      electronic_signature_compliant: boolean
      signature_timestamp: string
      signature_verification: {
        method: string
        verified: boolean
      }
      retention_period_years: number
      retention_until: string
      document_integrity: {
        hash: string
        hash_algorithm: string
        verified: boolean
      }
    }
  }
}

// ===========================
// LOAN CONTRACT TABLE TYPE
// ===========================

export interface LoanContract {
  id: string
  contract_number: number
  loan_application_id: string
  loan_id: string | null
  contract_version: number
  contract_terms: ContractTerms
  bank_account: BankAccount | null
  contract_document_path: string | null
  contract_status: ContractStatus
  client_signed_at: string | null
  client_signature_data: ClientSignatureData | null
  staff_signed_at: string | null
  staff_signature_id: string | null
  sent_at: string | null
  sent_method: string | null
  expires_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  notes: string | null
  loan: Loan
}

// ===========================
// INSERT TYPES
// ===========================

export interface UserInsert {
  id: string
  kyc_status?: KycStatus
  national_id?: string | null
  first_name?: string
  last_name?: string
  date_of_birth?: string
  phone?: string
  email?: string
  preferred_language?: string
  residence_status?: string
  gross_salary?: number
  rent_or_mortgage_cost?: number
  heating_electricity_cost?: number
  car_loan?: number
  furniture_loan?: number
  accept_pay_customer_id?: number | null
  accept_pay_customer_status?: AcceptPayCustomerStatus
  accept_pay_customer_created_at?: string | null
  accept_pay_customer_updated_at?: string | null
  crm_original_data?: Record<string, any> | null
  bank_account?: BankAccount | null
}

export interface StaffInsert {
  id: string
  role?: StaffRole
  department?: string | null
}

export interface AddressInsert {
  client_id: string
  address_type?: AddressType
  street_number?: string
  street_name?: string
  apartment_number?: string
  city: string
  province: string
  postal_code: string
  moving_date?: string
  rent_cost?: number | null
  is_current?: boolean
}

export interface LoanApplicationInsert {
  client_id: string
  address_id?: string
  loan_amount: number
  income_source?: IncomeSourceType
  income_fields?: Record<string, any>
  application_status?: ApplicationStatus
  bankruptcy_plan?: boolean
  interest_rate?: number
  crm_original_data?: Record<string, any> | null
}

export interface LoanApplicationIbvRequestInsert {
  loan_application_id: string
  client_id: string
  provider: IbvProvider
  status?: IbvStatus
  request_guid?: string | null
  request_url?: string | null
  provider_data?: Record<string, any> | null
  results?: Record<string, any> | null
  error_details?: Record<string, any> | null
  note?: string | null
  requested_at?: string
  completed_at?: string | null
}

export interface ReferenceInsert {
  loan_application_id: string
  first_name: string
  last_name: string
  phone: string
  relationship: string
}

export interface PaymentProviderDataInsert {
  user_id: string
  provider: 'accept_pay' | 'zumrails' | string
  provider_ids?: Record<string, any>
  provider_metadata?: Record<string, any> | null
  is_active?: boolean
}

// ===========================
// UPDATE TYPES
// ===========================

export interface UserUpdate {
  kyc_status?: KycStatus
  national_id?: string | null
  first_name?: string
  last_name?: string
  date_of_birth?: string
  phone?: string
  email?: string
  preferred_language?: string
  current_address_id?: string
  residence_status?: string
  gross_salary?: number
  rent_or_mortgage_cost?: number
  heating_electricity_cost?: number
  car_loan?: number
  furniture_loan?: number
  accept_pay_customer_id?: number | null
  accept_pay_customer_status?: AcceptPayCustomerStatus
  accept_pay_customer_created_at?: string | null
  accept_pay_customer_updated_at?: string | null
  crm_original_data?: Record<string, any> | null
  bank_account?: BankAccount | null
}

export interface StaffUpdate {
  role?: StaffRole
  department?: string | null
}

export interface AddressUpdate {
  address_type?: AddressType
  street_number?: string
  street_name?: string
  apartment_number?: string
  city?: string
  province?: string
  postal_code?: string
  moving_date?: string
  rent_cost?: number | null
  is_current?: boolean
  verified_at?: string
}

export interface LoanApplicationUpdate {
  address_id?: string
  loan_amount?: number
  income_source?: IncomeSourceType | null
  income_fields?: Record<string, any>
  application_status?: ApplicationStatus
  assigned_to?: string
  bankruptcy_plan?: boolean
  interest_rate?: number
  staff_notes?: string
  rejection_reason?: string
  submitted_at?: string
  approved_at?: string
  rejected_at?: string
  // Contract-related timestamps
  contract_generated_at?: string
  contract_sent_at?: string
  contract_signed_at?: string
  // IBV fields
  ibv_provider?: IbvProvider | null
  ibv_status?: IbvStatus | null
  ibv_provider_data?: IbvProviderData | null
  ibv_verified_at?: string | null
  // CRM migration fields
  crm_original_data?: Record<string, any> | null
}

export interface LoanApplicationIbvRequestUpdate {
  client_id?: string
  status?: IbvStatus
  request_guid?: string | null
  request_url?: string | null
  provider_data?: Record<string, any> | null
  results?: Record<string, any> | null
  error_details?: Record<string, any> | null
  note?: string | null
  requested_at?: string
  completed_at?: string | null
}

export interface ReferenceUpdate {
  first_name?: string
  last_name?: string
  phone?: string
  relationship?: string
}

export interface PaymentProviderDataUpdate {
  provider_data?: Record<string, any>
}

export interface IdDocumentInsert {
  client_id: string
  document_type: DocumentType
  document_name: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  status?: DocumentStatus
  expires_at?: string | null
  notes?: string | null
}

export interface DocumentRequestInsert {
  loan_application_id: string
  document_type_id: string
  group_id?: string | null
  request_kind?: RequestKind
  status?: DocumentRequestStatus
  request_token_hash?: string | null
  expires_at?: string | null
  magic_link_sent_at?: string | null
  uploaded_file_key?: string | null
  uploaded_meta?: Record<string, any>
  form_schema?: Record<string, any>
  requested_by?: string | null
}

export interface RequestFormSubmissionInsert {
  document_request_id: string
  submitted_by?: string | null
  form_data: Record<string, any>
}

export interface IdDocumentUpdate {
  document_type?: DocumentType
  document_name?: string
  status?: DocumentStatus
  rejection_reason?: string | null
  verified_by?: string | null
  verified_at?: string | null
  expires_at?: string | null
  notes?: string | null
}

export interface DocumentRequestUpdate {
  group_id?: string | null
  request_kind?: RequestKind
  status?: DocumentRequestStatus
  request_token_hash?: string | null
  expires_at?: string | null
  magic_link_sent_at?: string | null
  uploaded_file_key?: string | null
  uploaded_meta?: Record<string, any>
  form_schema?: Record<string, any>
  requested_by?: string | null
}

export interface RequestFormSubmissionUpdate {
  form_data?: Record<string, any>
}

// export interface Loan {
//   id: string
//   application_id: string
//   user_id: string
//   loan_number: number | null
//   principal_amount: number
//   interest_rate: number
//   term_months: number
//   disbursement_date: string | null
//   due_date: string | null
//   remaining_balance: number
//   status: LoanStatus
//   accept_pay_customer_id: number | null
//   disbursement_transaction_id: number | null
//   disbursement_process_date: string | null
//   disbursement_status: string | null
//   disbursement_authorized_at: string | null
//   disbursement_initiated_at: string | null
//   disbursement_completed_at: string | null
//   disbursement_error_code: string | null
//   disbursement_reference: string | null
//   created_at: string
//   updated_at: string
// }

export interface LoanInsert {
  application_id: string
  user_id: string
  principal_amount: number
  interest_rate: number
  term_months: number
  disbursement_date?: string | null
  due_date?: string | null
  remaining_balance?: number
  status?: LoanStatus
  accept_pay_customer_id?: number | null
  disbursement_transaction_id?: number | null
  disbursement_process_date?: string | null
  disbursement_status?: string | null
  disbursement_authorized_at?: string | null
  disbursement_initiated_at?: string | null
  disbursement_completed_at?: string | null
  disbursement_error_code?: string | null
  disbursement_reference?: string | null
  crm_original_data?: Record<string, any> | null
}

export interface LoanPaymentInsert {
  loan_id: string
  amount: number
  payment_date?: string
  method?: string | null
  status?: PaymentStatus
  payment_number?: number | null
  interest?: number | null
  principal?: number | null
  remaining_balance?: number | null
  accept_pay_customer_id?: number | null
  accept_pay_transaction_id?: number | null
  process_date?: string | null
  accept_pay_status?: AcceptPayTransactionStatus | null
  accept_pay_reference?: string | null
  authorized_at?: string | null
  authorization_status?: string | null
  collection_initiated_at?: string | null
  collection_completed_at?: string | null
  error_code?: string | null
  retry_count?: number
  voided_at?: string | null
  void_reason?: string | null
  notes?: string | null
  crm_original_data?: Record<string, any> | null
}

export interface LoanUpdate {
  principal_amount?: number
  interest_rate?: number
  term_months?: number
  disbursement_date?: string | null
  due_date?: string | null
  remaining_balance?: number
  status?: LoanStatus
  accept_pay_customer_id?: number | null
  disbursement_transaction_id?: number | null
  disbursement_process_date?: string | null
  disbursement_status?: string | null
  disbursement_authorized_at?: string | null
  disbursement_initiated_at?: string | null
  disbursement_completed_at?: string | null
  disbursement_error_code?: string | null
  disbursement_reference?: string | null
  crm_original_data?: Record<string, any> | null
}

export interface LoanPaymentUpdate {
  amount?: number
  payment_date?: string
  method?: string | null
  status?: PaymentStatus
  payment_number?: number | null
  interest?: number | null
  principal?: number | null
  remaining_balance?: number | null
  accept_pay_customer_id?: number | null
  accept_pay_transaction_id?: number | null
  process_date?: string | null
  accept_pay_status?: AcceptPayTransactionStatus | null
  accept_pay_reference?: string | null
  authorized_at?: string | null
  authorization_status?: string | null
  collection_initiated_at?: string | null
  collection_completed_at?: string | null
  error_code?: string | null
  retry_count?: number
  voided_at?: string | null
  void_reason?: string | null
  notes?: string | null
  crm_original_data?: Record<string, any> | null
}

export interface LoanPaymentScheduleInsert {
  loan_id: string
  scheduled_date: string
  amount: number
  payment_number: number
  status?: PaymentScheduleStatus
  accept_pay_transaction_id?: number | null
  loan_payment_id?: string | null
}

export interface LoanPaymentScheduleUpdate {
  scheduled_date?: string
  amount?: number
  payment_number?: number
  status?: PaymentScheduleStatus
  accept_pay_transaction_id?: number | null
  loan_payment_id?: string | null
}

export interface AcceptPaySyncLogInsert {
  last_sync_at?: string
  transactions_synced?: number
  errors?: string[]
}

export interface LoanContractInsert {
  loan_application_id: string
  loan_id?: string | null
  contract_number?: number
  contract_version?: number
  contract_terms: ContractTerms
  bank_account?: BankAccount | null
  contract_document_path?: string | null
  contract_status?: ContractStatus
  client_signed_at?: string | null
  client_signature_data?: ClientSignatureData | null
  staff_signed_at?: string | null
  staff_signature_id?: string | null
  sent_at?: string | null
  sent_method?: string | null
  expires_at?: string | null
  created_by?: string | null
  notes?: string | null
}

export interface LoanContractUpdate {
  loan_id?: string | null
  contract_number?: number
  contract_version?: number
  contract_terms?: ContractTerms
  bank_account?: BankAccount | null
  contract_document_path?: string | null
  contract_status?: ContractStatus
  client_signed_at?: string | null
  client_signature_data?: ClientSignatureData | null
  staff_signed_at?: string | null
  staff_signature_id?: string | null
  sent_at?: string | null
  sent_method?: string | null
  expires_at?: string | null
  notes?: string | null
}

// ===========================
// APP CONFIGURATIONS TYPES
// ===========================

export interface AppConfiguration {
  id: string
  category: string
  config_key: string
  config_data: Record<string, any>
  encrypted_username: string | null // bytea stored as base64 string
  encrypted_password: string | null // bytea stored as base64 string
  encrypted_api_key: string | null // bytea stored as base64 string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface AppConfigurationInsert {
  category: string
  config_key: string
  config_data?: Record<string, any>
  encrypted_username?: string | null
  encrypted_password?: string | null
  encrypted_api_key?: string | null
  description?: string | null
  is_active?: boolean
  created_by?: string | null
  updated_by?: string | null
}

export interface AppConfigurationUpdate {
  category?: string
  config_key?: string
  config_data?: Record<string, any>
  encrypted_username?: string | null
  encrypted_password?: string | null
  encrypted_api_key?: string | null
  description?: string | null
  is_active?: boolean
  updated_by?: string | null
}

// ===========================
// COMBINED DATABASE TYPE
// ===========================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      staff: {
        Row: Staff
        Insert: StaffInsert
        Update: StaffUpdate
      }
      addresses: {
        Row: Address
        Insert: AddressInsert
        Update: AddressUpdate
      }
      loan_applications: {
        Row: LoanApplication
        Insert: LoanApplicationInsert
        Update: LoanApplicationUpdate
      }
      loan_application_ibv_requests: {
        Row: LoanApplicationIbvRequest
        Insert: LoanApplicationIbvRequestInsert
        Update: LoanApplicationIbvRequestUpdate
      }
      references: {
        Row: Reference
        Insert: ReferenceInsert
        Update: ReferenceUpdate
      }
      id_documents: {
        Row: IdDocument
        Insert: IdDocumentInsert
        Update: IdDocumentUpdate
      }
      loans: {
        Row: Loan
        Insert: LoanInsert
        Update: LoanUpdate
      }
      loan_payments: {
        Row: LoanPayment
        Insert: LoanPaymentInsert
        Update: LoanPaymentUpdate
      }
      loan_payment_schedule: {
        Row: LoanPaymentSchedule
        Insert: LoanPaymentScheduleInsert
        Update: LoanPaymentScheduleUpdate
      }
      accept_pay_sync_log: {
        Row: AcceptPaySyncLog
        Insert: AcceptPaySyncLogInsert
        Update: never
      }
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
      }
      loan_contracts: {
        Row: LoanContract
        Insert: LoanContractInsert
        Update: LoanContractUpdate
      }
      document_requests: {
        Row: DocumentRequest
        Insert: DocumentRequestInsert
        Update: DocumentRequestUpdate
      }
      request_form_submissions: {
        Row: RequestFormSubmission
        Insert: RequestFormSubmissionInsert
        Update: RequestFormSubmissionUpdate
      }
      app_configurations: {
        Row: AppConfiguration
        Insert: AppConfigurationInsert
        Update: AppConfigurationUpdate
      }
    }
    Functions: {
      decrypt_config_value: {
        Args: {
          encrypted_value: string
        }
        Returns: string | null
      }
      encrypt_config_value: {
        Args: {
          value: string
        }
        Returns: string
      }
    }
  }
}
