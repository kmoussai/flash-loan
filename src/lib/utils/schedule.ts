import { addDays, addMonths } from 'date-fns'
import { PaymentFrequency, PayementScheduleItem } from '@/src/types'

/**
 * Payment frequency configuration
 * Defines the number of payments per year, days between payments, and months between payments
 */
export const frequencyConfig: Record<
  PaymentFrequency,
  { paymentsPerYear: number; daysBetween: number; monthsBetween: number }
> = {
  weekly: { paymentsPerYear: 52, daysBetween: 7, monthsBetween: 0 },
  'bi-weekly': { paymentsPerYear: 26, daysBetween: 14, monthsBetween: 0 },
  'twice-monthly': { paymentsPerYear: 24, daysBetween: 15, monthsBetween: 0 },
  monthly: { paymentsPerYear: 12, daysBetween: 0, monthsBetween: 1 }
}

/**
 * Payment frequency options for select components
 */
export const frequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'twice-monthly', label: 'Twice per Month' },
  { value: 'weekly', label: 'Weekly' }
]

export interface BuildScheduleParams {
  paymentAmount: number | ''
  paymentFrequency: PaymentFrequency
  numberOfPayments: number
  nextPaymentDate: string
}

/**
 * Build a payment schedule based on loan parameters
 * 
 * @param params - Schedule building parameters
 * @param params.paymentAmount - Amount per payment
 * @param params.paymentFrequency - Frequency of payments (weekly, bi-weekly, twice-monthly, monthly)
 * @param params.numberOfPayments - Total number of payments
 * @param params.nextPaymentDate - Start date for the schedule (ISO date string YYYY-MM-DD)
 * @returns Array of payment schedule items with due dates and amounts
 * 
 * @example
 * ```typescript
 * const schedule = buildSchedule({
 *   paymentAmount: 175.00,
 *   paymentFrequency: 'monthly',
 *   numberOfPayments: 3,
 *   nextPaymentDate: '2024-02-01'
 * })
 * ```
 */
export function buildSchedule({
  paymentAmount,
  paymentFrequency,
  numberOfPayments,
  nextPaymentDate
}: BuildScheduleParams): PayementScheduleItem[] {
  if (!paymentAmount || numberOfPayments <= 0 || !nextPaymentDate) {
    return []
  }

  // Validate paymentFrequency is valid
  if (!paymentFrequency || !frequencyConfig[paymentFrequency]) {
    console.error('Invalid payment frequency:', paymentFrequency)
    return []
  }

  const config = frequencyConfig[paymentFrequency]
  const isMonthly = paymentFrequency === 'monthly'
  
  return Array.from({ length: numberOfPayments }, (_v, i) => {
    const date = isMonthly
      ? addMonths(new Date(nextPaymentDate), i)
      : addDays(
          new Date(nextPaymentDate),
          i * config.daysBetween
        )
    return {
      due_date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      amount: Number(paymentAmount)
    }
  })
}

