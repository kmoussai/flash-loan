// Helpers to build contract terms from application data
import type { ContractTerms, PaymentFrequency, GenerateContractPayload} from '@/src/types'
import { getPaymentsPerMonth, assertFrequency } from '@/src/lib/utils/frequency'

type AppUser = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  preferred_language: string | null
} | null

type AppAddress = {
  street_number: string | null
  street_name: string | null
  apartment_number: string | null
  city: string | null
  province: string | null
  postal_code: string | null
} | null

export type ApplicationForContract = {
  id: string
  loan_amount: number
  interest_rate: number | null
  users: AppUser
  addresses?: AppAddress
}

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const normalizeTermMonths = (rawValue: unknown, fallback = 3): number => {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.round(parsed)
}

const normalizeNumberOfPayments = (rawValue: unknown): number | null => {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.max(1, Math.round(parsed))
}

const normalizeLoanAmount = (rawValue: unknown, fallback: number): number => {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.round(parsed * 100) / 100
}

const calculateNumberOfPayments = (
  months: number,
  frequency: PaymentFrequency
): number => Math.max(1, Math.round(months * getPaymentsPerMonth(frequency)))

const calculateDueDate = (
  startDate: Date,
  index: number,
  frequency: PaymentFrequency
): Date => {
  const dueDate = new Date(startDate)
  switch (frequency) {
    case 'weekly':
      dueDate.setDate(startDate.getDate() + index * 7)
      break
    case 'bi-weekly':
      dueDate.setDate(startDate.getDate() + index * 14)
      break
    case 'twice-monthly':
      // Approximation, can be improved to calendar-anchored semi-monthly
      dueDate.setDate(startDate.getDate() + index * 15)
      break
    default:
      dueDate.setMonth(startDate.getMonth() + index)
      break
  }
  return dueDate
}

export function buildContractTermsFromApplication(
  app: ApplicationForContract,
  payload: GenerateContractPayload
): ContractTerms & Record<string, any> {
  // Core inputs
  const loanAmount = normalizeLoanAmount(
    payload?.loanAmount,
    parseFloat(String(app.loan_amount))
  )
  const interestRate = Number.isFinite(app.interest_rate ?? NaN)
    ? (app.interest_rate as number)
    : 29.0
  const paymentFrequency = assertFrequency(payload?.paymentFrequency, 'monthly')
  const providedNumberOfPayments = normalizeNumberOfPayments(
    payload?.numberOfPayments
  )
  const fallbackTermMonths = normalizeTermMonths(payload?.termMonths)

  const paymentsPerMonth = getPaymentsPerMonth(paymentFrequency)

  const numberOfPayments = providedNumberOfPayments
    ? providedNumberOfPayments
    : calculateNumberOfPayments(fallbackTermMonths, paymentFrequency)

  const durationInMonths = providedNumberOfPayments
    ? Math.max(
        providedNumberOfPayments / paymentsPerMonth,
        1 / paymentsPerMonth
      )
    : fallbackTermMonths

  const termMonths = Math.max(1, Math.ceil(durationInMonths))
  const monthsForInterest = Math.max(durationInMonths, 1)

  // Simple-interest model
  const monthlyInterestPortion = (loanAmount * interestRate) / 100 / 12
  const totalInterest = monthlyInterestPortion * monthsForInterest
  const totalAmount = payload.paymentAmount * numberOfPayments
  const paymentAmount = payload.paymentAmount
  const principalPerPayment = loanAmount / numberOfPayments
  const interestPerPayment = totalInterest / numberOfPayments

  // Schedule
  let paymentSchedule: NonNullable<ContractTerms['payment_schedule']> = []
  const defaultStartDate = toDateOrNull(payload?.firstPaymentDate) ?? new Date()
  const normalizedStartDate = new Date(defaultStartDate)
  normalizedStartDate.setHours(0, 0, 0, 0)

  // Use provided schedule override if available
  if (
    payload?.paymentSchedule &&
    Array.isArray(payload.paymentSchedule) &&
    payload.paymentSchedule.length > 0
  ) {
    paymentSchedule = payload.paymentSchedule.map(item => ({
      due_date: item.due_date,
      amount: item.amount,
      principal: item.principal,
      interest: item.interest
    }))
  } else {
    // Calculate schedule normally
    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = calculateDueDate(normalizedStartDate, i, paymentFrequency)
      paymentSchedule.push({
        due_date: dueDate.toISOString().split('T')[0],
        amount: paymentAmount,
        principal: principalPerPayment,
        interest: interestPerPayment
      })
    }
  }

  const maturityDate =
    paymentSchedule.length > 0
      ? paymentSchedule[paymentSchedule.length - 1].due_date
      : (() => {
          return normalizedStartDate.toISOString().split('T')[0]
        })()

  const effectiveDate = (() => {
    if (paymentSchedule.length > 0) {
      const firstDue = toDateOrNull(paymentSchedule[0].due_date)
      if (firstDue) {
        const normalized = new Date(firstDue)
        normalized.setHours(0, 0, 0, 0)
        return normalized
      }
    }
    return normalizedStartDate
  })()

  // Borrower and address aliases to satisfy current viewer needs
  const borrowerFirst = app.users?.first_name ?? null
  const borrowerLast = app.users?.last_name ?? null
  const borrowerName =
    [borrowerFirst, borrowerLast].filter(Boolean).join(' ').trim() || null
  const addressLine1 =
    [app.addresses?.street_number, app.addresses?.street_name]
      .filter((v): v is string => Boolean(v && String(v).trim().length > 0))
      .join(' ') || null

  const terms: ContractTerms & Record<string, any> = {
    interest_rate: interestRate,
    term_months: termMonths,
    principal_amount: loanAmount,
    total_amount: totalAmount,
    payment_frequency: paymentFrequency,
    number_of_payments: numberOfPayments,
    payment_amount: paymentAmount,
    fees: {
      origination_fee: 55, // Fee for preauthorized payments returned to the creditor
      processing_fee: 0, // Debit fee for every payment
      other_fees: 35 // Fee to postpone a payment
    },
    payment_schedule: paymentSchedule,
    terms_and_conditions:
      'Standard loan terms and conditions apply. Please review carefully before signing.',
    effective_date: effectiveDate.toISOString(),
    maturity_date: maturityDate,
    // Borrower details (canonical)
    first_name: borrowerFirst,
    last_name: borrowerLast,
    email: app.users?.email ?? null,
    phone: app.users?.phone ?? null,
    street_number: app.addresses?.street_number ?? null,
    street_name: app.addresses?.street_name ?? null,
    apartment_number: app.addresses?.apartment_number ?? null,
    city: app.addresses?.city ?? null,
    province: app.addresses?.province ?? null,
    postal_code: app.addresses?.postal_code ?? null,
    // Aliases used by the current viewer
    borrowerFirstName: borrowerFirst,
    borrowerLastName: borrowerLast,
    borrowerName: borrowerName,
    cellular: app.users?.phone ?? null,
    address_line1: addressLine1,
    street: addressLine1
  }

  return terms
}
