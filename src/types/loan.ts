export type LoanStatus =
  | 'pending_disbursement'
  | 'active'
  | 'completed'
  | 'defaulted'
  | 'cancelled'

export type Loan = {
  id: string
  application_id: string
  user_id: string
  loan_number: number
  principal_amount: number
  interest_rate: number
  term_months: number
  disbursement_date: string | null
  due_date: string | null
  remaining_balance: number
  status: LoanStatus
  created_at: string
  updated_at: string
}