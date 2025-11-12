import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PaymentFrequency } from '@/src/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function fetcher(url: string) {
  return fetch(url).then(res => res.json())
}



interface LoanCalculationInput {
  loanAmount: number
  annualInterestRate: number // e.g. 29 for 29%
  termMonths: number // usually 12
  frequency: PaymentFrequency
}

interface LoanCalculationResult {
  paymentAmount: number
  numberOfPayments: number
  totalInterest: number
  totalToRepay: number
}

export function calculateLoanSchedule({
  loanAmount,
  annualInterestRate,
  termMonths,
  frequency
}: LoanCalculationInput): LoanCalculationResult {
  if (loanAmount <= 0 || annualInterestRate < 0 || termMonths <= 0) {
    return {
      paymentAmount: 0,
      numberOfPayments: 0,
      totalInterest: 0,
      totalToRepay: 0
    }
  }

  // Payments per year based on frequency
  const paymentsPerYear: Record<PaymentFrequency, number> = {
    weekly: 52,
    'bi-weekly': 26,
    'twice-monthly': 24,
    monthly: 12
  }

  const nPerYear = paymentsPerYear[frequency]
  const totalPayments = Math.round((termMonths / 12) * nPerYear)

  // Convert annual rate to periodic rate
  const r = (annualInterestRate / 100) / nPerYear

  // If rate is 0, avoid division by zero
  if (r === 0) {
    const payment = loanAmount / totalPayments
    return {
      paymentAmount: Number(payment.toFixed(2)),
      numberOfPayments: totalPayments,
      totalInterest: 0,
      totalToRepay: Number(loanAmount.toFixed(2))
    }
  }

  // Standard amortization formula
  const numerator = r * Math.pow(1 + r, totalPayments)
  const denominator = Math.pow(1 + r, totalPayments) - 1
  const payment = loanAmount * (numerator / denominator)

  const totalToRepay = payment * totalPayments
  const totalInterest = totalToRepay - loanAmount

  return {
    paymentAmount: Number(payment.toFixed(2)),
    numberOfPayments: totalPayments,
    totalInterest: Number(totalInterest.toFixed(2)),
    totalToRepay: Number(totalToRepay.toFixed(2))
  }
}
