/**
 * Loan Calculation Library
 *
 * A comprehensive, abstract library for all loan-related calculations.
 * All functions are pure (no side effects) - they take inputs and return results.
 */

import { PaymentFrequency } from '@/src/types'
import { addDays, addMonths, startOfMonth, endOfMonth, setDate, getDate } from 'date-fns'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Payment frequency configuration
 */
export const PAYMENT_FREQUENCY_CONFIG: Record<
  PaymentFrequency,
  { paymentsPerYear: number; daysBetween: number; monthsBetween: number }
> = {
  weekly: { paymentsPerYear: 52, daysBetween: 7, monthsBetween: 0 },
  'bi-weekly': { paymentsPerYear: 26, daysBetween: 14, monthsBetween: 0 },
  'twice-monthly': { paymentsPerYear: 24, daysBetween: 15, monthsBetween: 0 },
  monthly: { paymentsPerYear: 12, daysBetween: 0, monthsBetween: 1 }
}

/**
 * Loan calculation parameters
 */
export interface LoanCalculationParams {
  /** Principal loan amount (before fees) */
  principalAmount: number
  /** Annual interest rate as percentage (e.g., 29 for 29%) */
  interestRate: number
  /** Payment frequency */
  paymentFrequency: PaymentFrequency
  /** Total number of payments */
  numberOfPayments: number
  /** Brokerage fee (optional) */
  brokerageFee?: number
  /** Origination fee (optional) */
  originationFee?: number
  /** Other fees (optional) */
  otherFees?: number
}

/**
 * Payment breakdown for a single payment
 */
export interface PaymentBreakdown {
  /** Payment number (1-indexed) */
  paymentNumber: number
  /** Due date (ISO date string YYYY-MM-DD) */
  dueDate: string
  /** Total payment amount */
  amount: number
  /** Interest portion of payment */
  interest: number
  /** Principal portion of payment */
  principal: number
  /** Remaining balance after this payment */
  remainingBalance: number
}

/**
 * Complete loan calculation result
 */
export interface LoanCalculationResult {
  /** Principal amount */
  principalAmount: number
  /** Total fees */
  totalFees: number
  /** Total loan amount (principal + fees) */
  totalLoanAmount: number
  /** Payment amount per period */
  paymentAmount: number
  /** Total amount to be repaid */
  totalRepaymentAmount: number
  /** Total interest to be paid */
  totalInterest: number
  /** Payment schedule with breakdown */
  paymentSchedule: PaymentBreakdown[]
  /** Number of payments */
  numberOfPayments: number
  /** Payment frequency */
  paymentFrequency: PaymentFrequency
}

/**
 * Balance calculation parameters
 */
export interface BalanceCalculationParams {
  /** Current remaining balance */
  currentBalance: number
  /** Payment amount to apply */
  paymentAmount: number
  /** Optional: fees to add (for modifications) */
  additionalFees?: number
}

/**
 * Balance calculation result
 */
export interface BalanceCalculationResult {
  /** New remaining balance after payment/fees */
  newBalance: number
  /** Amount paid */
  amountPaid: number
  /** Whether balance is zero (loan paid off) */
  isPaidOff: boolean
}

/**
 * Schedule generation parameters
 */
export interface ScheduleGenerationParams {
  /** Payment amount per period */
  paymentAmount: number
  /** Payment frequency */
  paymentFrequency: PaymentFrequency
  /** Number of payments */
  numberOfPayments: number
  /** First payment date (ISO date string YYYY-MM-DD) */
  firstPaymentDate: string
  /** Starting balance (for breakdown calculation) */
  startingBalance: number
  /** Annual interest rate */
  interestRate: number
}

/**
 * Failed payment calculation parameters
 */
export interface FailedPaymentCalculationParams {
  /** Failed payments array */
  failedPayments: Array<{
    /** Payment amount */
    amount: number
    /** Interest that was supposed to be paid */
    interest: number
    /** Payment date */
    paymentDate: string
  }>
  /** Origination fee per failed payment */
  originationFee: number
}

/**
 * Failed payment calculation result
 */
export interface FailedPaymentCalculationResult {
  /** Total failed payment fees */
  totalFees: number
  /** Total interest from failed payments */
  totalInterest: number
  /** Combined fees and interest */
  totalAmount: number
  /** Number of failed payments */
  failedPaymentCount: number
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate the exact amortized payment amount for a loan
 *
 * Uses the standard amortization formula:
 * P = (P0 * r * (1 + r)^n) / ((1 + r)^n - 1)
 *
 * @param params - Loan calculation parameters
 * @returns Payment amount per period, or undefined if inputs are invalid
 *
 * @example
 * ```typescript
 * const payment = calculatePaymentAmount({
 *   principalAmount: 500,
 *   interestRate: 29,
 *   paymentFrequency: 'monthly',
 *   numberOfPayments: 3
 * })
 * // Returns: 175.00
 * ```
 */
export function calculatePaymentAmount(
  params: LoanCalculationParams
): number | undefined {
  const { interestRate, paymentFrequency, numberOfPayments } = params

  // Calculate total loan amount (principal + fees) for payment calculation
  const totalLoanAmount = calculateTotalLoanAmount(params)

  // Validate inputs
  if (
    !paymentFrequency ||
    totalLoanAmount <= 0 ||
    interestRate < 0 ||
    numberOfPayments <= 0 ||
    !Number.isFinite(totalLoanAmount) ||
    !Number.isFinite(interestRate) ||
    !Number.isFinite(numberOfPayments)
  ) {
    return undefined
  }

  const config = PAYMENT_FREQUENCY_CONFIG[paymentFrequency]
  if (!config) {
    return undefined
  }

  const paymentsPerYear = config.paymentsPerYear
  const periodicRate = interestRate / 100 / paymentsPerYear

  // Handle zero interest rate case
  if (periodicRate === 0) {
    return Number((totalLoanAmount / numberOfPayments).toFixed(2))
  }

  // Standard amortized payment formula
  // Use totalLoanAmount (principal + fees) for calculation
  const onePlusRate = 1 + periodicRate
  const onePlusRateToN = Math.pow(onePlusRate, numberOfPayments)
  const numerator = totalLoanAmount * periodicRate * onePlusRateToN
  const denominator = onePlusRateToN - 1

  if (denominator === 0) {
    return undefined
  }

  const payment = numerator / denominator
  return Number(payment.toFixed(2))
}

/**
 * Calculate total fees for a loan
 *
 * @param params - Loan calculation parameters
 * @returns Total fees amount
 */
export function calculateTotalFees(params: LoanCalculationParams): number {
  const { brokerageFee = 0, originationFee = 0, otherFees = 0 } = params

  return Number((brokerageFee + originationFee + otherFees).toFixed(2))
}

/**
 * Calculate total loan amount (principal + fees)
 *
 * @param params - Loan calculation parameters
 * @returns Total loan amount
 */
export function calculateTotalLoanAmount(
  params: LoanCalculationParams
): number {
  const totalFees = calculateTotalFees(params)
  return Number((params.principalAmount + totalFees).toFixed(2))
}

/**
 * Calculate payment breakdown (interest and principal) for each payment
 *
 * @param params - Loan calculation parameters
 * @param firstPaymentDate - First payment date (ISO date string YYYY-MM-DD)
 * @returns Array of payment breakdowns
 */
export function calculatePaymentBreakdown(
  params: LoanCalculationParams,
  firstPaymentDate: string
): PaymentBreakdown[] {
  const { interestRate, paymentFrequency, numberOfPayments } = params

  const totalLoanAmount = calculateTotalLoanAmount(params)
  const paymentAmount = calculatePaymentAmount(params)

  if (!paymentAmount) {
    return []
  }

  const config = PAYMENT_FREQUENCY_CONFIG[paymentFrequency]
  if (!config) {
    return []
  }

  const periodicRate = interestRate / 100 / config.paymentsPerYear
  const breakdown: PaymentBreakdown[] = []
  let remaining = totalLoanAmount

  // Format date as YYYY-MM-DD in local timezone (avoids timezone issues)
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  for (let i = 0; i < numberOfPayments; i++) {
    const paymentNumber = i + 1
    const interest = remaining * periodicRate

    // Calculate principal
    let principal = Math.max(0, paymentAmount - interest)

    // Last payment: pay off remaining balance fully
    if (i === numberOfPayments - 1) {
      principal = remaining
    }

    remaining = Math.max(0, remaining - principal)

    // Calculate due date
    const isMonthly = paymentFrequency === 'monthly'
    const isTwiceMonthly = paymentFrequency === 'twice-monthly'
    
    let dueDate: Date
    if (isMonthly) {
      dueDate = addMonths(new Date(firstPaymentDate), i)
    } else if (isTwiceMonthly) {
      // Twice-monthly: Payments on 15th and last day of each month
      // Parse date string to avoid timezone issues
      const [year, month, day] = firstPaymentDate.split('-').map(Number)
      const firstDate = new Date(year, month - 1, day) // month is 0-indexed
      const firstMonth = startOfMonth(firstDate)
      
      // Determine which month and which payment in that month
      const monthOffset = Math.floor(i / 2)
      const paymentInMonth = i % 2 // 0 = first payment (15th), 1 = second payment (last day)
      const targetMonth = addMonths(firstMonth, monthOffset)
      
      if (paymentInMonth === 0) {
        // First payment of the month: always use 15th
        dueDate = setDate(targetMonth, 15)
      } else {
        // Second payment of the month: last day of month
        dueDate = endOfMonth(targetMonth)
      }
    } else {
      // Weekly or bi-weekly: use days between
      dueDate = addDays(new Date(firstPaymentDate), i * config.daysBetween)
    }

    breakdown.push({
      paymentNumber,
      dueDate: formatDate(dueDate),
      amount:
        i === numberOfPayments - 1
          ? Number((principal + interest).toFixed(2))
          : paymentAmount,
      interest: Number(interest.toFixed(2)),
      principal: Number(principal.toFixed(2)),
      remainingBalance: Number(remaining.toFixed(2))
    })
  }

  return breakdown
}

/**
 * Calculate total interest to be paid over loan term
 *
 * @param paymentSchedule - Payment breakdown array
 * @returns Total interest amount
 */
export function calculateTotalInterest(
  paymentSchedule: PaymentBreakdown[]
): number {
  const totalInterest = paymentSchedule.reduce(
    (sum, payment) => sum + payment.interest,
    0
  )
  return Number(totalInterest.toFixed(2))
}

/**
 * Calculate total repayment amount (principal + fees + interest)
 *
 * @param params - Loan calculation parameters
 * @param paymentSchedule - Payment breakdown array
 * @returns Total repayment amount
 */
export function calculateTotalRepaymentAmount(
  params: LoanCalculationParams,
  paymentSchedule: PaymentBreakdown[]
): number {
  const totalLoanAmount = calculateTotalLoanAmount(params)
  const totalInterest = calculateTotalInterest(paymentSchedule)
  return Number((totalLoanAmount + totalInterest).toFixed(2))
}

// ============================================================================
// COMPLETE LOAN CALCULATION
// ============================================================================

/**
 * Calculate complete loan details including schedule and all amounts
 *
 * This is the main function to use for comprehensive loan calculations.
 *
 * @param params - Loan calculation parameters
 * @param firstPaymentDate - First payment date (ISO date string YYYY-MM-DD)
 * @returns Complete loan calculation result, or undefined if invalid
 *
 * @example
 * ```typescript
 * const result = calculateLoan({
 *   principalAmount: 500,
 *   interestRate: 29,
 *   paymentFrequency: 'monthly',
 *   numberOfPayments: 3,
 *   brokerageFee: 50
 * }, '2024-02-01')
 * ```
 */
export function calculateLoan(
  params: LoanCalculationParams,
  firstPaymentDate: string
): LoanCalculationResult | undefined {
  const paymentAmount = calculatePaymentAmount(params)
  if (!paymentAmount) {
    return undefined
  }

  const totalFees = calculateTotalFees(params)
  const totalLoanAmount = calculateTotalLoanAmount(params)
  const paymentSchedule = calculatePaymentBreakdown(params, firstPaymentDate)

  if (paymentSchedule.length === 0) {
    return undefined
  }

  const totalInterest = calculateTotalInterest(paymentSchedule)
  const totalRepaymentAmount = calculateTotalRepaymentAmount(
    params,
    paymentSchedule
  )

  return {
    principalAmount: params.principalAmount,
    totalFees,
    totalLoanAmount,
    paymentAmount,
    totalRepaymentAmount,
    totalInterest,
    paymentSchedule,
    numberOfPayments: params.numberOfPayments,
    paymentFrequency: params.paymentFrequency
  }
}

// ============================================================================
// BALANCE CALCULATIONS
// ============================================================================

/**
 * Calculate new remaining balance after payment or fee adjustment
 *
 * @param params - Balance calculation parameters
 * @returns Balance calculation result
 *
 * @example
 * ```typescript
 * const result = calculateNewBalance({
 *   currentBalance: 500.00,
 *   paymentAmount: 175.00
 * })
 * // Returns: { newBalance: 325.00, amountPaid: 175.00, isPaidOff: false }
 * ```
 */
export function calculateNewBalance(
  params: BalanceCalculationParams
): BalanceCalculationResult {
  const { currentBalance, paymentAmount, additionalFees = 0 } = params

  // Add fees first (for modifications), then subtract payment
  const balanceWithFees = currentBalance + additionalFees
  const newBalance = Math.max(0, balanceWithFees - paymentAmount)

  return {
    newBalance: Number(newBalance.toFixed(2)),
    amountPaid: Number(paymentAmount.toFixed(2)),
    isPaidOff: newBalance === 0
  }
}

/**
 * Calculate remaining balance from payment history
 *
 * @param initialBalance - Starting balance
 * @param payments - Array of payment amounts that were successfully applied
 * @returns Current remaining balance
 */
export function calculateBalanceFromPayments(
  initialBalance: number,
  payments: number[]
): number {
  const totalPaid = payments.reduce((sum, amount) => sum + amount, 0)
  const remaining = Math.max(0, initialBalance - totalPaid)
  return Number(remaining.toFixed(2))
}

// ============================================================================
// FAILED PAYMENT CALCULATIONS
// ============================================================================

/**
 * Calculate fees and interest from failed payments
 *
 * @param params - Failed payment calculation parameters
 * @returns Failed payment calculation result
 */
export function calculateFailedPaymentFees(
  params: FailedPaymentCalculationParams
): FailedPaymentCalculationResult {
  const { failedPayments, originationFee } = params

  const totalFees = failedPayments.length * originationFee
  const totalInterest = failedPayments.reduce(
    (sum, payment) => sum + (payment.interest || 0),
    0
  )
  const totalAmount = totalFees + totalInterest

  return {
    totalFees: Number(totalFees.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    failedPaymentCount: failedPayments.length
  }
}

// ============================================================================
// LOAN MODIFICATION CALCULATIONS
// ============================================================================

/**
 * Calculate new total balance for loan modification
 * Includes current balance + brokerage fee + failed payment fees
 *
 * @param currentBalance - Current remaining balance
 * @param brokerageFee - Brokerage fee to add
 * @param failedPaymentResult - Result from calculateFailedPaymentFees
 * @returns New total balance for modification
 */
export function calculateModificationBalance(
  currentBalance: number,
  brokerageFee: number,
  failedPaymentResult: FailedPaymentCalculationResult
): number {
  const total = currentBalance + brokerageFee + failedPaymentResult.totalAmount
  return Number(total.toFixed(2))
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate loan calculation parameters
 *
 * @param params - Loan calculation parameters
 * @returns Error message if invalid, null if valid
 */
export function validateLoanParams(
  params: LoanCalculationParams
): string | null {
  if (params.principalAmount <= 0) {
    return 'Principal amount must be greater than 0'
  }

  if (params.interestRate < 0) {
    return 'Interest rate cannot be negative'
  }

  if (params.numberOfPayments <= 0) {
    return 'Number of payments must be greater than 0'
  }

  if (!PAYMENT_FREQUENCY_CONFIG[params.paymentFrequency]) {
    return 'Invalid payment frequency'
  }

  if (params.brokerageFee && params.brokerageFee < 0) {
    return 'Brokerage fee cannot be negative'
  }

  if (params.originationFee && params.originationFee < 0) {
    return 'Origination fee cannot be negative'
  }

  if (params.otherFees && params.otherFees < 0) {
    return 'Other fees cannot be negative'
  }

  return null
}

/**
 * Validate payment amount doesn't exceed balance
 *
 * @param paymentAmount - Payment amount
 * @param currentBalance - Current remaining balance
 * @returns Error message if invalid, null if valid
 */
export function validatePaymentAmount(
  paymentAmount: number,
  currentBalance: number
): string | null {
  if (paymentAmount <= 0) {
    return 'Payment amount must be greater than 0'
  }

  if (paymentAmount > currentBalance) {
    return `Payment amount ($${paymentAmount.toFixed(2)}) cannot exceed remaining balance ($${currentBalance.toFixed(2)})`
  }

  return null
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get number of payments for a given frequency (max 3 months)
 *
 * @param paymentFrequency - Payment frequency
 * @returns Number of payments
 */
export function getNumberOfPayments(
  paymentFrequency: PaymentFrequency
): number {
  return {
    weekly: 12,
    'bi-weekly': 6,
    'twice-monthly': 6,
    monthly: 3
  }[paymentFrequency]
}

/**
 * Format currency amount
 *
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'CAD')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'CAD'
): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Round to 2 decimal places
 *
 * @param amount - Amount to round
 * @returns Rounded amount
 */
export function roundCurrency(amount: number): number {
  return Number(amount.toFixed(2))
}
