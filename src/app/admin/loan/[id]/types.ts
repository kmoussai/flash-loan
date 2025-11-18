import type { LoanStatus, LoanPayment, LoanPaymentSchedule } from '@/src/lib/supabase/types'
import type { PaymentFrequency } from '@/src/types'

export type LoanTab = 'overview' | 'payments' | 'schedule' | 'borrower'

export type LoanStatusUI = 'active' | 'paid' | 'defaulted' | 'pending' | 'cancelled'

export interface LoanFromAPI {
  id: string
  loan_number: number | null
  application_id: string
  user_id: string
  principal_amount: number
  interest_rate: number
  term_months: number
  disbursement_date: string | null
  due_date: string | null
  remaining_balance: number
  status: LoanStatus
  created_at: string
  updated_at: string
  loan_applications: {
    id: string
    loan_amount: number
    application_status: string
    income_source?: string
    created_at?: string
    submitted_at?: string | null
    approved_at?: string | null
  } | null
  users?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    preferred_language: string | null
  } | null
}

export interface LoanDetailsResponse {
  loan: LoanFromAPI
  payments: LoanPayment[]
  paymentSchedule: LoanPaymentSchedule[]
  statistics: {
    totalPaid: number
    totalPending: number
    totalFailed: number
    totalPayments: number
    confirmedPayments: number
    remainingBalance: number
    principalAmount: number
  }
}

export interface LoanDetail {
  id: string
  loan_number: string
  borrower: {
    id: string
    name: string
    email: string
    phone: string
    province: string
  }
  principal: number
  remaining_balance: number
  interest_rate: number
  term_months: number
  payment_frequency: PaymentFrequency
  payment_amount: number
  origination_date: string
  status: LoanStatusUI
  next_payment_date: string | null
  last_payment_date: string | null
  disbursement_date: string | null
  due_date: string | null
}

