import { PaymentFrequency } from "@/src/types"

export function calculateNumberOfPayments(paymentFrequency: PaymentFrequency): number {
  // Max period 3 months
  return {
    weekly: 12,
    'bi-weekly': 6,
    'twice-monthly': 6,
    monthly: 3
  }[paymentFrequency]
}

/**
 * Calculate the exact amortized payment amount for a loan
 *
 * Uses the standard amortization formula:
 * P = (P0 * r * (1 + r)^n) / ((1 + r)^n - 1)
 *
 * Where:
 * - P = payment amount per period
 * - P0 = principal (loan amount)
 * - r = periodic interest rate (annual rate / periods per year)
 * - n = number of payments
 *
 * @param payment_frequency - Payment frequency (weekly, bi-weekly, twice-monthly, monthly)
 * @param loan_amount - Principal loan amount in CAD
 * @param interest_rate - Annual interest rate as a percentage (e.g., 29 for 29%)
 * @param num_payments - Total number of payments
 * @returns The exact payment amount per period, rounded to 2 decimal places, or undefined if inputs are invalid
 *
 * @example
 * // Calculate monthly payment for $500.61 loan, 29% APR, 3 months
 * calculatePaymentAmount('monthly', 500.61, 29, 3)
 * // Returns: 175.00
 */
export function calculatePaymentAmount(
  payment_frequency: PaymentFrequency,
  loan_amount: number,
  interest_rate: number, // annual rate in percent, e.g., 29
  num_payments: number
): number | undefined {
  // Validate inputs
  if (
    !payment_frequency ||
    loan_amount <= 0 ||
    interest_rate < 0 ||
    num_payments <= 0 ||
    !Number.isFinite(loan_amount) ||
    !Number.isFinite(interest_rate) ||
    !Number.isFinite(num_payments)
  ) {
    return undefined
  }

  // Map payment frequency to number of payments per year
  const paymentsPerYearMap: Record<PaymentFrequency, number> = {
    weekly: 52,
    'bi-weekly': 26,
    'twice-monthly': 24,
    monthly: 12
  }

  const paymentsPerYear = paymentsPerYearMap[payment_frequency]

  // Calculate periodic interest rate (convert annual percentage to decimal, then divide by periods per year)
  const periodicRate = interest_rate / 100 / paymentsPerYear

  // Handle zero interest rate case (simple division)
  if (periodicRate === 0) {
    return Number((loan_amount / num_payments).toFixed(2))
  }

  // Standard amortized payment formula
  // P = (P0 * r * (1 + r)^n) / ((1 + r)^n - 1)
  const onePlusRate = 1 + periodicRate
  const onePlusRateToN = Math.pow(onePlusRate, num_payments)
  const numerator = loan_amount * periodicRate * onePlusRateToN
  const denominator = onePlusRateToN - 1

  // Avoid division by zero (shouldn't happen with valid inputs, but safety check)
  if (denominator === 0) {
    return undefined
  }

  const payment = numerator / denominator

  // Round to 2 decimal places and return
  return Number(payment.toFixed(2))
}
