import { PaymentFrequency } from '@/src/lib/supabase/types'

interface BankAccount {
  bank_name: string
  account_number: string
  transit_number: string
  institution_number: string
  account_name: string
}

interface ContractDefaultsResponse {
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

interface GenerateContractPayload {
  paymentFrequency: PaymentFrequency
  numberOfPayments: number
  loanAmount: number
  nextPaymentDate?: string
  account?: BankAccount,
  firstPaymentDate?: Date,
  paymentAmount: number,
  interestRate?: number,
  termMonths?: number,
  paymentSchedule?: Array<{
    due_date: string
    amount: number
    principal: number
    interest: number
  }>
}

export type { ContractDefaultsResponse, BankAccount, GenerateContractPayload }
