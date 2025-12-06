import { PaymentFrequency } from '@/src/types'

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
