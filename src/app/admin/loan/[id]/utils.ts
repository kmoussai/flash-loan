import type { LoanStatus } from '@/src/lib/supabase/types'
import type { LoanStatusUI, LoanFromAPI, LoanDetail, LoanDetailsResponse } from './types'

/**
 * Map database loan status to UI status
 */
export function mapStatusToUI(status: LoanStatus): LoanStatusUI {
  switch (status) {
    case 'pending_disbursement':
      return 'pending'
    case 'completed':
      return 'paid'
    default:
      return status as LoanStatusUI
  }
}

/**
 * Format currency in CAD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)
}

/**
 * Format date
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format date and time
 */
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format loan number
 */
export function formatLoanNumber(
  loanNumber: number | null | undefined,
  loanId: string
): string {
  if (loanNumber !== undefined && loanNumber !== null) {
    return `LN-${String(loanNumber).padStart(6, '0')}`
  }
  return `LN-${loanId.replace(/[^0-9]/g, '').padStart(6, '0').slice(0, 6)}`
}

/**
 * Transform API loan data to UI format
 */
export function transformLoanDetails(apiData: LoanDetailsResponse): LoanDetail {
  const loan = apiData.loan
  const firstName = loan.users?.first_name || ''
  const lastName = loan.users?.last_name || ''
  const borrowerName = `${firstName} ${lastName}`.trim() || 'N/A'

  // Calculate payment amount (simple estimate: principal + interest / term_months)
  const monthlyInterest = (loan.principal_amount * loan.interest_rate) / 100 / 12
  const monthlyPayment = loan.principal_amount / loan.term_months + monthlyInterest

  // Find next and last payment dates from schedule
  const schedule = apiData.paymentSchedule || []
  const confirmedPayments = apiData.payments.filter(p => p.status === 'confirmed')
  const lastPayment =
    confirmedPayments.length > 0
      ? confirmedPayments.sort(
          (a, b) =>
            new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )[0]
      : null

  const nextScheduledPayment = schedule
    .filter(s => s.status === 'pending' || s.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0]

  return {
    id: loan.id,
    loan_number: formatLoanNumber(loan.loan_number, loan.id),
    borrower: {
      id: loan.users?.id || loan.user_id,
      name: borrowerName,
      email: loan.users?.email || 'N/A',
      phone: loan.users?.phone || 'N/A',
      province: 'N/A' // Could be fetched from address if needed
    },
    principal: parseFloat(loan.principal_amount.toString()),
    remaining_balance: parseFloat(loan.remaining_balance.toString()),
    interest_rate: parseFloat(loan.interest_rate.toString()),
    term_months: loan.term_months,
    payment_frequency: 'monthly' as const, // Default, could be enhanced
    payment_amount: Math.round(monthlyPayment * 100) / 100,
    origination_date: loan.created_at,
    status: mapStatusToUI(loan.status),
    next_payment_date: nextScheduledPayment?.scheduled_date || loan.due_date || null,
    last_payment_date: lastPayment?.payment_date || null,
    disbursement_date: loan.disbursement_date,
    due_date: loan.due_date
  }
}

