import { BankAccount, PaymentFrequency } from '.'

export type ContractStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'pending_signature'
  | 'signed'
  | 'rejected'
  | 'expired'

export type ContractTerms = {
  interest_rate: number
  term_months: number
  principal_amount: number
  total_amount: number
  payment_frequency?: 'weekly' | 'bi-weekly' | 'twice-monthly' | 'monthly'
  payment_amount?: number
  number_of_payments?: number
  fees?: {
    origination_fee?: number
    processing_fee?: number
    other_fees?: number
  }
  payment_schedule?: Array<{
    due_date: string
    amount: number
    principal?: number
    interest?: number
  }>
  terms_and_conditions?: string
  effective_date?: string
  maturity_date?: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  street_number?: string | null
  street_name?: string | null
  apartment_number?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  bank_account?: BankAccount | null
}

export type ClientSignatureData = {
  signature_method: 'click_to_sign' | 'drawn_signature' | 'uploaded'
  ip_address: string
  user_agent: string
  signed_from_device?: string
  signature_timestamp: string
  signature_hash?: string
}

export type LoanContract = {
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
}

export type PayementScheduleItem = {
  due_date: string
  amount: number
  principal?: number
  interest?: number
}

export type GenerateContractPayload = {
  paymentFrequency: PaymentFrequency
  numberOfPayments: number
  loanAmount: number
  nextPaymentDate?: string
  account?: BankAccount
  firstPaymentDate?: Date
  paymentAmount: number
  interestRate?: number
  termMonths?: number
  paymentSchedule?: Array<PayementScheduleItem>
}

export type ContractDefaultsResponse = {
  success: boolean
  defaults: {
    paymentFrequency: PaymentFrequency
    numberOfPayments?: number
    loanAmount?: number
    nextPaymentDate?: string
    account?: BankAccount
    accountOptions?: BankAccount[]
    paymentAmount?: number
  }
}
