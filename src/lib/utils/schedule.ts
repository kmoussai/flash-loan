import { addDays, addMonths, startOfMonth, endOfMonth, setDate } from 'date-fns'
import { PaymentFrequency, PayementScheduleItem } from '@/src/types'
import { getNextBusinessDay } from '@/src/lib/utils/date'

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
  const isTwiceMonthly = paymentFrequency === 'twice-monthly'
  
  // Parse firstPaymentDate in local timezone to avoid timezone issues
  const [firstYear, firstMonth, firstDay] = nextPaymentDate.split('-').map(Number)
  const firstDateLocal = new Date(firstYear, firstMonth - 1, firstDay) // month is 0-indexed, creates date in local timezone
  
  return Array.from({ length: numberOfPayments }, (_v, i) => {
    let date: Date
    
    if (isMonthly) {
      date = addMonths(firstDateLocal, i)
    } else if (isTwiceMonthly) {
      // Twice-monthly: Payments on 15th and last day of each month
      const firstMonthStart = startOfMonth(firstDateLocal)
      
      // Determine which month and which payment in that month
      const monthOffset = Math.floor(i / 2)
      const paymentInMonth = i % 2 // 0 = first payment (15th), 1 = second payment (last day)
      const targetMonth = addMonths(firstMonthStart, monthOffset)
      
      if (paymentInMonth === 0) {
        // First payment of the month: always use 15th
        date = setDate(targetMonth, 15)
      } else {
        // Second payment of the month: last day of month
        date = endOfMonth(targetMonth)
      }
    } else {
      // Weekly or bi-weekly: use days between
      date = addDays(firstDateLocal, i * config.daysBetween)
    }
    
    // Adjust date to next business day if it falls on a holiday or weekend
    date = getNextBusinessDay(date)
    
    // Format date as YYYY-MM-DD in local timezone
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return {
      due_date: `${year}-${month}-${day}`,
      amount: Number(paymentAmount)
    }
  })
}

