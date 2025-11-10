import { IBVSummary } from '@/src/app/api/inverite/fetch/[guid]/types'
import type { LoanApplication } from '@/src/lib/supabase/types'

export interface IbvResults {
  extracted_at?: string
  accounts_count?: number
  accounts_summary?: Array<{
    account_index?: number
    account_type?: string | null
    account_description?: string | null
    institution?: string | null
    quarter_all_time?: {
      number_of_deposits?: number | null
      amount_of_deposits?: number | null
      average_amount_of_deposits?: number | null
      number_of_withdrawals?: number | null
      amount_of_withdrawals?: number | null
      average_balance?: number | null
      highest_balance?: number | null
      lowest_balance?: number | null
      ending_balance?: number | null
      overdraft_count?: number | null
      negative_balance_count?: number | null
      negative_balance_days?: number | null
      total_transactions?: number | null
    } | null
    current_balance?: {
      available?: number | null
      current?: number | null
    } | null
    transaction_count?: number
  }>
  aggregates?: {
    total_deposits?: number | null
    total_withdrawals?: number | null
    total_accounts?: number
    accounts_with_statistics?: number
  }
}

export interface ApplicationWithDetails extends LoanApplication {
  ibv_results: IBVSummary | null
  users: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    preferred_language: string | null
    kyc_status: string
    date_of_birth: string | null
    residence_status: string | null
    gross_salary: number | null
    rent_or_mortgage_cost: number | null
    heating_electricity_cost: number | null
    car_loan: number | null
    furniture_loan: number | null
  } | null
  addresses:
    | {
        id: string
        street_number: string | null
        street_name: string | null
        apartment_number: string | null
        city: string
        province: string
        postal_code: string
        moving_date: string | null
      }[]
    | null
  references:
    | {
        id: string
        first_name: string
        last_name: string
        phone: string
        relationship: string
      }[]
    | null
}


