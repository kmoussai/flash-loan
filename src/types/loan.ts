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
  // Accept Pay disbursement fields
  accept_pay_customer_id: number | null
  disbursement_transaction_id: number | null
  disbursement_process_date: string | null
  disbursement_status: string | null
  disbursement_authorized_at: string | null
  disbursement_initiated_at: string | null
  disbursement_completed_at: string | null
  disbursement_error_code: string | null
  disbursement_reference: string | null
  // CRM original data
  crm_original_data?: Record<string, any> | null
}