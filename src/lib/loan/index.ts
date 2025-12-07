/**
 * Loan Calculation Library
 *
 * A comprehensive, abstract library for all loan-related calculations.
 * All functions are pure (no side effects) - they take inputs and return results.
 */

import { PaymentFrequency } from '@/src/types'
import { addDays, addMonths, startOfMonth, endOfMonth, setDate, getDate } from 'date-fns'
import { getPreviousBusinessDay } from '@/src/lib/utils/date'

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
 * Parameters for calculating breakdown until balance reaches 0
 */
export interface BreakdownUntilZeroParams {
  /** Starting principal balance */
  startingBalance: number
  /** Payment amount per period (fixed) */
  paymentAmount: number
  /** Payment frequency */
  paymentFrequency: PaymentFrequency
  /** Annual interest rate as percentage (e.g., 29 for 29%) */
  interestRate: number
  /** First payment date (ISO date string YYYY-MM-DD) */
  firstPaymentDate: string
  /** Maximum number of periods to generate (safety limit, default: 1000) */
  maxPeriods?: number
}

/**
 * General parameters for recalculating payment schedule with new remaining balance
 * Used for defer, manual, and failed payment scenarios
 */
export interface RecalculateScheduleParams {
  /** New remaining balance to use for recalculation (already calculated with fees/interest) */
  newRemainingBalance: number
  /** Payment amount per period (fixed, from contract) */
  paymentAmount: number
  /** Payment frequency */
  paymentFrequency: PaymentFrequency
  /** Annual interest rate as percentage */
  interestRate: number
  /** First payment date for recalculation (ISO date string YYYY-MM-DD) */
  firstPaymentDate: string
  /** Maximum number of periods to generate (safety limit, default: 1000) */
  maxPeriods?: number
}

/**
 * Result of schedule recalculation
 */
export interface RecalculateScheduleResult {
  /** New remaining balance used for recalculation */
  newRemainingBalance: number
  /** Recalculated payment breakdown */
  recalculatedBreakdown: PaymentBreakdown[]
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
    return totalLoanAmount / numberOfPayments
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
  return payment
}

/**
 * Calculate total fees for a loan
 *
 * @param params - Loan calculation parameters
 * @returns Total fees amount
 */
export function calculateTotalFees(params: LoanCalculationParams): number {
  const { brokerageFee = 0, originationFee = 0, otherFees = 0 } = params

  return brokerageFee + originationFee + otherFees
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
  return params.principalAmount + totalFees
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
      const firstMonthEnd = endOfMonth(firstDate)
      const firstDay = firstDate.getDate()
      const lastDayOfMonth = firstMonthEnd.getDate()
      
      // Check if first payment date is on 15th or last day of month
      const isOn15th = firstDay === 15
      const isOnLastDay = firstDay === lastDayOfMonth
      
      // Determine which payment this is (0 = first payment of pair, 1 = second payment of pair)
      const paymentInPair = i % 2
      // Determine which month pair we're in (0 = first month, 1 = second month, etc.)
      const monthPairIndex = Math.floor(i / 2)
      
      if (i === 0) {
        // First payment: use the start date if it's on 15th or last day, otherwise adjust
        if (isOn15th || isOnLastDay) {
          dueDate = firstDate
        } else if (firstDay < 15) {
          // Before 15th: use 15th of the same month
          dueDate = setDate(firstMonth, 15)
        } else {
          // After 15th but not last day: use last day of the same month
          dueDate = endOfMonth(firstMonth)
        }
      } else {
        // Subsequent payments: determine based on what the first payment was
        let targetMonth: Date
        let targetDay: number
        
        if (isOn15th) {
          // First payment was on 15th, so pattern is: 15th, last day, 15th, last day...
          targetMonth = addMonths(firstMonth, monthPairIndex)
          if (paymentInPair === 0) {
            // First payment of pair: 15th
            targetDay = 15
          } else {
            // Second payment of pair: last day
            targetDay = -1 // Use -1 to indicate last day
          }
        } else if (isOnLastDay) {
          // First payment was on last day, so pattern is: last day, 15th (next month), last day, 15th...
          if (paymentInPair === 0) {
            // First payment of pair: last day
            targetMonth = addMonths(firstMonth, monthPairIndex)
            targetDay = -1 // Use -1 to indicate last day
          } else {
            // Second payment of pair: 15th of next month
            targetMonth = addMonths(firstMonth, monthPairIndex + 1)
            targetDay = 15
          }
        } else {
          // First payment was adjusted, determine pattern based on adjusted date
          const adjustedFirstDate = firstDay < 15 
            ? setDate(firstMonth, 15) 
            : endOfMonth(firstMonth)
          const adjustedIsOn15th = adjustedFirstDate.getDate() === 15
          
          if (adjustedIsOn15th) {
            // Adjusted to 15th, so pattern is: 15th, last day, 15th, last day...
            targetMonth = addMonths(firstMonth, monthPairIndex)
            if (paymentInPair === 0) {
              targetDay = 15
            } else {
              targetDay = -1
            }
          } else {
            // Adjusted to last day, so pattern is: last day, 15th (next month), last day, 15th...
            if (paymentInPair === 0) {
              targetMonth = addMonths(firstMonth, monthPairIndex)
              targetDay = -1
            } else {
              targetMonth = addMonths(firstMonth, monthPairIndex + 1)
              targetDay = 15
            }
          }
        }
        
        // Set the date
        if (targetDay === -1) {
          dueDate = endOfMonth(targetMonth)
        } else {
          dueDate = setDate(targetMonth, targetDay)
        }
      }
    } else {
      // Weekly or bi-weekly: use days between
      dueDate = addDays(new Date(firstPaymentDate), i * config.daysBetween)
    }
    
    // Adjust date to next business day if it falls on a holiday or weekend
    dueDate = getPreviousBusinessDay(dueDate)

    breakdown.push({
      paymentNumber,
      dueDate: formatDate(dueDate),
      amount:
        i === numberOfPayments - 1
          ? principal + interest
          : paymentAmount,
      interest: interest,
      principal: principal,
      remainingBalance: remaining
    })
  }

  return breakdown
}

/**
 * Calculate payment breakdown until remaining balance reaches 0
 * 
 * This function continues generating payments until the balance is fully paid off.
 * The payment amount is kept fixed, and a final balloon payment may be generated
 * if the remaining balance is less than the regular payment amount.
 * 
 * @param params - Breakdown calculation parameters
 * @returns Array of payment breakdowns
 * 
 * @example
 * ```typescript
 * const breakdown = calculateBreakdownUntilZero({
 *   startingBalance: 1000,
 *   paymentAmount: 175,
 *   paymentFrequency: 'monthly',
 *   interestRate: 29,
 *   firstPaymentDate: '2025-01-15'
 * })
 * ```
 */
export function calculateBreakdownUntilZero(
  params: BreakdownUntilZeroParams
): PaymentBreakdown[] {
  const {
    startingBalance,
    paymentAmount,
    paymentFrequency,
    interestRate,
    firstPaymentDate,
    maxPeriods = 1000
  } = params

  // Validate inputs
  if (
    startingBalance <= 0 ||
    paymentAmount <= 0 ||
    interestRate < 0 ||
    !paymentFrequency ||
    !Number.isFinite(startingBalance) ||
    !Number.isFinite(paymentAmount) ||
    !Number.isFinite(interestRate)
  ) {
    return []
  }

  const config = PAYMENT_FREQUENCY_CONFIG[paymentFrequency]
  if (!config) {
    return []
  }

  const periodicRate = interestRate / 100 / config.paymentsPerYear
  const breakdown: PaymentBreakdown[] = []
  let remaining = startingBalance

  // Format date as YYYY-MM-DD in local timezone (avoids timezone issues)
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Track payment number and current date
  let paymentNumber = 1
  let currentDate = new Date(firstPaymentDate)

  // Continue until balance reaches 0 or max periods reached
  while (remaining > 0.01 && paymentNumber <= maxPeriods) {
    // Round remaining to 2 decimal places to avoid floating point issues
    remaining = Math.round(remaining * 100) / 100

    const interest = remaining * periodicRate
    const interestRounded = Math.round(interest * 100) / 100

    // Calculate principal portion
    // For the last payment, use remaining balance as principal
    let principal: number
    let paymentAmountForPeriod: number

    if (remaining + interestRounded <= paymentAmount) {
      // Final payment: pay off remaining balance + interest
      principal = remaining
      paymentAmountForPeriod = remaining + interestRounded
      remaining = 0
    } else {
      // Regular payment: principal = paymentAmount - interest
      principal = Math.max(0, paymentAmount - interestRounded)
      paymentAmountForPeriod = paymentAmount
      remaining = Math.max(0, remaining - principal)
    }

    // Round principal to 2 decimal places
    principal = Math.round(principal * 100) / 100

    // Calculate due date
    const isMonthly = paymentFrequency === 'monthly'
    const isTwiceMonthly = paymentFrequency === 'twice-monthly'

    let dueDate: Date
    if (isMonthly) {
      dueDate = addMonths(new Date(firstPaymentDate), paymentNumber - 1)
    } else if (isTwiceMonthly) {
      // Twice-monthly: Payments on 15th and last day of each month
      const [year, month, day] = firstPaymentDate.split('-').map(Number)
      const firstDate = new Date(year, month - 1, day)
      const firstMonth = startOfMonth(firstDate)
      const firstDay = firstDate.getDate()
      const lastDayOfMonth = endOfMonth(firstDate).getDate()

      const isOn15th = firstDay === 15
      const isOnLastDay = firstDay === lastDayOfMonth

      const paymentInPair = (paymentNumber - 1) % 2
      const monthPairIndex = Math.floor((paymentNumber - 1) / 2)

      if (paymentNumber === 1) {
        if (isOn15th || isOnLastDay) {
          dueDate = firstDate
        } else if (firstDay < 15) {
          dueDate = setDate(firstMonth, 15)
        } else {
          dueDate = endOfMonth(firstMonth)
        }
      } else {
        let targetMonth: Date
        let targetDay: number

        if (isOn15th) {
          targetMonth = addMonths(firstMonth, monthPairIndex)
          targetDay = paymentInPair === 0 ? 15 : -1
        } else if (isOnLastDay) {
          if (paymentInPair === 0) {
            targetMonth = addMonths(firstMonth, monthPairIndex)
            targetDay = -1
          } else {
            targetMonth = addMonths(firstMonth, monthPairIndex + 1)
            targetDay = 15
          }
        } else {
          const adjustedFirstDate =
            firstDay < 15 ? setDate(firstMonth, 15) : endOfMonth(firstMonth)
          const adjustedIsOn15th = adjustedFirstDate.getDate() === 15

          if (adjustedIsOn15th) {
            targetMonth = addMonths(firstMonth, monthPairIndex)
            targetDay = paymentInPair === 0 ? 15 : -1
          } else {
            if (paymentInPair === 0) {
              targetMonth = addMonths(firstMonth, monthPairIndex)
              targetDay = -1
            } else {
              targetMonth = addMonths(firstMonth, monthPairIndex + 1)
              targetDay = 15
            }
          }
        }

        if (targetDay === -1) {
          dueDate = endOfMonth(targetMonth)
        } else {
          dueDate = setDate(targetMonth, targetDay)
        }
      }
    } else {
      // Weekly or bi-weekly: use days between
      dueDate = addDays(new Date(firstPaymentDate), (paymentNumber - 1) * config.daysBetween)
    }

    // Adjust date to next business day if it falls on a holiday or weekend
    dueDate = getPreviousBusinessDay(dueDate)

    breakdown.push({
      paymentNumber,
      dueDate: formatDate(dueDate),
      amount: paymentAmountForPeriod,
      interest: interestRounded,
      principal: principal,
      remainingBalance: Math.round(remaining * 100) / 100
    })

    paymentNumber++
  }

  return breakdown
}

/**
 * Recalculate payment schedule with a new remaining balance
 * 
 * This is a general-purpose function that can be used for:
 * - Defer payments: newBalance = remainingPrincipal + deferredInterest + deferralFee
 * - Manual payments: newBalance = currentBalance - principalPaid
 * - Failed payments: newBalance = currentBalance + failedInterest + originationFee
 * 
 * The function:
 * 1. Takes the new remaining balance (already calculated by caller)
 * 2. Recalculates the payment schedule using calculateBreakdownUntilZero
 * 3. Keeps the payment amount fixed
 * 4. Returns the new breakdown
 * 
 * @param params - Schedule recalculation parameters
 * @returns Recalculation result with new breakdown
 * 
 * @example
 * ```typescript
 * // For failed payment:
 * const newBalance = currentBalance + failedInterest + originationFee
 * const result = recalculatePaymentSchedule({
 *   newRemainingBalance: newBalance,
 *   paymentAmount: 175,
 *   paymentFrequency: 'monthly',
 *   interestRate: 29,
 *   firstPaymentDate: '2025-02-15'
 * })
 * 
 * // For defer:
 * const newBalance = remainingPrincipal + deferredInterest + deferralFee
 * const result = recalculatePaymentSchedule({
 *   newRemainingBalance: newBalance,
 *   paymentAmount: 175,
 *   paymentFrequency: 'monthly',
 *   interestRate: 29,
 *   firstPaymentDate: '2025-02-15'
 * })
 * ```
 */
export function recalculatePaymentSchedule(
  params: RecalculateScheduleParams
): RecalculateScheduleResult {
  const {
    newRemainingBalance,
    paymentAmount,
    paymentFrequency,
    interestRate,
    firstPaymentDate,
    maxPeriods = 1000
  } = params

  // Recalculate payment schedule with new remaining balance
  const recalculatedBreakdown = calculateBreakdownUntilZero({
    startingBalance: newRemainingBalance,
    paymentAmount: paymentAmount,
    paymentFrequency: paymentFrequency,
    interestRate: interestRate,
    firstPaymentDate: firstPaymentDate,
    maxPeriods: maxPeriods
  })

  return {
    newRemainingBalance: roundCurrency(newRemainingBalance),
    recalculatedBreakdown: recalculatedBreakdown
  }
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
  return paymentSchedule.reduce(
    (sum, payment) => sum + payment.interest,
    0
  )
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
  return totalLoanAmount + totalInterest
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
    newBalance: newBalance,
    amountPaid: paymentAmount,
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
  return Math.max(0, initialBalance - totalPaid)
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
    totalFees: totalFees,
    totalInterest: totalInterest,
    totalAmount: totalAmount,
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
  return currentBalance + brokerageFee + failedPaymentResult.totalAmount
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
 * Calculate brokerage fee based on loan amount
 * Formula: loan amount × 68%
 *
 * @param loanAmount - Principal loan amount
 * @returns Brokerage fee amount
 *
 * @example
 * ```typescript
 * const fee = calculateBrokerageFee(500)
 * // Returns: 340 (500 × 0.68)
 * ```
 */
export function calculateBrokerageFee(loanAmount: number): number {
  if (typeof loanAmount !== 'number' || !Number.isFinite(loanAmount) || loanAmount < 0) {
    return 0
  }
  return loanAmount * 0.68
}

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
  // Ensure amount is a valid number before calling toFixed
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return 0
  }
  return Number(amount.toFixed(2))
}
