import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { getContractByApplicationId } from '@/src/lib/supabase/contract-helpers'
import type { IncomeSourceType } from '@/src/lib/supabase/types'
import { IBVSummary } from '@/src/app/api/inverite/fetch/[guid]/types'
import {
  FREQUENCY_OPTIONS,
  FREQUENCY_PRIORITY,
  getPaymentsPerMonth,
  normalizeFrequency
} from '@/src/lib/utils/frequency'
import { buildContractTermsFromApplication } from '@/src/lib/contracts/terms'
import {
  ContractDefaultsResponse,
  PaymentFrequency,
  ContractTerms
} from '@/src/types'
import {
  getLoanApplicationById,
  getLoanByApplicationId
} from '@/src/lib/supabase/loan-helpers'
import { BankAccount } from '@/src/types'
import {
  calculateNumberOfPayments,
  calculatePaymentAmount
} from '@/src/lib/utils/loan'
import { addDays, addMonths } from 'date-fns'
import { frequencyConfig } from '@/src/lib/utils/schedule'

const getLowestPaymentFrequencyFromIbv = (
  ibvResults?: IBVSummary | null
): PaymentFrequency | null => {
  if (!ibvResults || !Array.isArray(ibvResults.accounts)) {
    return null
  }

  let selected: PaymentFrequency | null = null
  let bestRank = Number.POSITIVE_INFINITY

  for (const account of ibvResults.accounts) {
    const incomes = Array.isArray(account?.income) ? account.income : []

    for (const income of incomes) {
      const normalized =
        normalizeFrequency(income?.frequency) ??
        normalizeFrequency(income?.raw_frequency)

      if (!normalized) {
        continue
      }

      const rank = FREQUENCY_PRIORITY.indexOf(normalized)

      if (rank === -1 || rank >= bestRank) {
        continue
      }

      selected = normalized
      bestRank = rank

      if (bestRank === 0) {
        return selected
      }
    }
  }

  return selected
}

const toIsoDate = (date: Date): string => date.toISOString().split('T')[0]

const parseDateValue = (value: unknown): Date | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

const getEarliestDate = (dates: Date[]): Date | null => {
  if (dates.length === 0) {
    return null
  }

  return dates.sort((a, b) => a.getTime() - b.getTime())[0]
}

/**
 * Extract next payment date from employment information in loan application
 */
const getNextPayDateFromEmploymentInfo = (
  incomeSource?: IncomeSourceType | null,
  incomeFields?: Record<string, any> | null
): string | null => {
  if (!incomeSource || !incomeFields) {
    return null
  }

  // For employed: use next_pay_date
  if (incomeSource === 'employed' && incomeFields.next_pay_date) {
    const parsedDate = parseDateValue(incomeFields.next_pay_date)
    return parsedDate ? toIsoDate(parsedDate) : null
  }

  // For self-employed and others: use next_deposit_date
  if (incomeFields.next_deposit_date) {
    const parsedDate = parseDateValue(incomeFields.next_deposit_date)
    return parsedDate ? toIsoDate(parsedDate) : null
  }

  return null
}

const getNextPayDateFromIbv = (
  ibvResults?: IBVSummary | null
): string | null => {
  if (!ibvResults || !Array.isArray(ibvResults.accounts)) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming: Date[] = []
  const allDates: Date[] = []

  for (const account of ibvResults.accounts) {
    const incomes = Array.isArray(account?.income) ? account.income : []

    for (const income of incomes) {
      const futurePayments = Array.isArray(income?.future_payments)
        ? income.future_payments
        : []

      for (const futurePayment of futurePayments) {
        const parsedDate = parseDateValue(futurePayment)

        if (!parsedDate) {
          continue
        }

        const normalizedDate = new Date(parsedDate)
        normalizedDate.setHours(0, 0, 0, 0)

        allDates.push(normalizedDate)

        if (normalizedDate.getTime() >= today.getTime()) {
          upcoming.push(normalizedDate)
        }
      }
    }
  }

  const candidate = getEarliestDate(upcoming) ?? getEarliestDate(allDates)
  return candidate ? toIsoDate(candidate) : null
}

/**
 * Get all employment pay dates from loan application
 * Calculates future payment dates based on frequency, starting from next pay date
 * Includes all future payments from IBV as well
 */
const getAllEmploymentPayDates = (
  incomeSource?: IncomeSourceType | null,
  incomeFields?: Record<string, any> | null,
  ibvResults?: IBVSummary | null
): string[] => {
  const payDates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get next pay date from employment info
  const nextPayDateStr = getNextPayDateFromEmploymentInfo(incomeSource, incomeFields)
  const nextPayDate = nextPayDateStr ? parseDateValue(nextPayDateStr) : null

  // Get frequency from employment info, default to monthly if we have employment info but no frequency
  let frequency = getFrequencyFromEmploymentInfo(incomeSource, incomeFields)
  
  // If we have employment info but no frequency, default to monthly
  if (!frequency && incomeSource && incomeFields) {
    frequency = 'monthly'
  }

  // Calculate future payment dates based on frequency
  if (nextPayDate && frequency) {
    const normalizedNextDate = new Date(nextPayDate)
    normalizedNextDate.setHours(0, 0, 0, 0)

    // Only proceed if next pay date is in the future
    if (normalizedNextDate.getTime() >= today.getTime()) {
      // Generate approximately 12 months worth of payment dates
      // For monthly: 12 payments
      // For bi-weekly: ~26 payments (52 weeks / 2)
      // For weekly: ~52 payments
      // For twice-monthly: ~24 payments
      const paymentsPerYear = 12
      const numberOfPayments = Math.ceil(paymentsPerYear) // Generate 1 year worth

      const isMonthly = frequency === 'monthly'
      
      for (let i = 0; i < numberOfPayments; i++) {
        const paymentDate = isMonthly
          ? addMonths(normalizedNextDate, i)
          : addDays(
              normalizedNextDate,
              i * frequencyConfig[frequency].daysBetween
            )
        
        // Only include future dates
        if (paymentDate.getTime() >= today.getTime()) {
          const isoDate = toIsoDate(paymentDate)
          if (!payDates.includes(isoDate)) {
            payDates.push(isoDate)
          }
        }
      }
    }
  }

  // Get all future payments from IBV (these take priority as they're actual data)
  if (ibvResults && Array.isArray(ibvResults.accounts)) {
    for (const account of ibvResults.accounts) {
      const incomes = Array.isArray(account?.income) ? account.income : []

      for (const income of incomes) {
        const futurePayments = Array.isArray(income?.future_payments)
          ? income.future_payments
          : []

        for (const futurePayment of futurePayments) {
          const parsedDate = parseDateValue(futurePayment)

          if (!parsedDate) {
            continue
          }

          const normalizedDate = new Date(parsedDate)
          normalizedDate.setHours(0, 0, 0, 0)

          // Only include future dates
          if (normalizedDate.getTime() >= today.getTime()) {
            const isoDate = toIsoDate(normalizedDate)
            // Avoid duplicates
            if (!payDates.includes(isoDate)) {
              payDates.push(isoDate)
            }
          }
        }
      }
    }
  }

  // Sort and return unique dates
  return Array.from(new Set(payDates)).sort()
}

/**
 * Resolve next payment date with priority:
 * 1. Contract terms (payment schedule or effective date)
 * 2. Employment information (next_pay_date or next_deposit_date)
 * 3. IBV results (future payments)
 * 4. Default to today
 */
const resolveNextPaymentDate = (
  terms: ContractTerms | null | undefined,
  incomeSource?: IncomeSourceType | null,
  incomeFields?: Record<string, any> | null,
  ibvResults?: IBVSummary | null
): string => {
  const todayIso = toIsoDate(new Date())

  // Priority 1: Contract terms - payment schedule
  const scheduleEntries = Array.isArray(terms?.payment_schedule)
    ? terms?.payment_schedule
    : []
  const scheduleDates = scheduleEntries
    .map(entry => parseDateValue(entry?.due_date))
    .filter((date): date is Date => Boolean(date))
    .map(date => {
      const normalized = new Date(date)
      normalized.setHours(0, 0, 0, 0)
      return normalized
    })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingScheduleDate = getEarliestDate(
    scheduleDates.filter(date => date.getTime() >= today.getTime())
  )
  const fallbackScheduleDate = getEarliestDate(scheduleDates)

  if (upcomingScheduleDate || fallbackScheduleDate) {
    return toIsoDate(upcomingScheduleDate ?? fallbackScheduleDate!)
  }

  // Priority 1 (fallback): Contract terms - effective date
  const effectiveDate = parseDateValue(terms?.effective_date)
  if (effectiveDate) {
    const normalizedEffective = new Date(effectiveDate)
    normalizedEffective.setHours(0, 0, 0, 0)
    if (normalizedEffective.getTime() >= today.getTime()) {
      return toIsoDate(normalizedEffective)
    }
  }

  // Priority 2: Employment information
  const employmentNextDate = getNextPayDateFromEmploymentInfo(
    incomeSource,
    incomeFields
  )
  if (employmentNextDate) {
    const parsedEmploymentDate = parseDateValue(employmentNextDate)
    if (parsedEmploymentDate) {
      const normalizedEmployment = new Date(parsedEmploymentDate)
      normalizedEmployment.setHours(0, 0, 0, 0)
      if (normalizedEmployment.getTime() >= today.getTime()) {
        return toIsoDate(normalizedEmployment)
      }
    }
  }

  // Priority 3: IBV results
  const ibvNextDate = getNextPayDateFromIbv(ibvResults)
  if (ibvNextDate) {
    const parsedIbvDate = parseDateValue(ibvNextDate)
    if (parsedIbvDate) {
      const normalizedIbv = new Date(parsedIbvDate)
      normalizedIbv.setHours(0, 0, 0, 0)
      if (normalizedIbv.getTime() >= today.getTime()) {
        return toIsoDate(normalizedIbv)
      }
    }
  }

  // Priority 4: Default to tomorrow (today + 1 day)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toIsoDate(tomorrow)
}

/**
 * Extract payment frequency from employment information in loan application
 */
const getFrequencyFromEmploymentInfo = (
  incomeSource?: IncomeSourceType | null,
  incomeFields?: Record<string, any> | null
): PaymentFrequency | null => {
  if (!incomeSource || !incomeFields) {
    return null
  }

  // For employed: use payroll_frequency
  if (incomeSource === 'employed' && incomeFields.payroll_frequency) {
    return normalizeFrequency(
      incomeFields.payroll_frequency
    ) as PaymentFrequency | null
  }

  // For self-employed: use deposits_frequency
  if (incomeSource === 'self-employed' && incomeFields.deposits_frequency) {
    return normalizeFrequency(
      incomeFields.deposits_frequency
    ) as PaymentFrequency | null
  }

  return null
}

/**
 * Resolve payment frequency with priority:
 * 1. Contract terms frequency
 * 2. Employment information frequency
 * 3. IBV results frequency
 * 4. Default to 'monthly'
 */
const resolvePaymentFrequency = (
  terms: ContractTerms | null | undefined,
  incomeSource?: IncomeSourceType | null,
  incomeFields?: Record<string, any> | null,
  ibvResults?: IBVSummary | null
): PaymentFrequency => {
  console.log('resolvePaymentFrequency', { incomeSource })
  // Priority 1: Contract terms frequency
  const fromTerms = normalizeFrequency(
    terms?.payment_frequency
  ) as PaymentFrequency | null

  if (fromTerms) {
    return fromTerms
  }

  // Priority 2: Employment information frequency
  const fromEmployment = getFrequencyFromEmploymentInfo(
    incomeSource,
    incomeFields
  )
  if (fromEmployment) {
    return fromEmployment
  }

  // Priority 3: IBV results frequency
  const fromIbv = getLowestPaymentFrequencyFromIbv(ibvResults)
  if (fromIbv) {
    return fromIbv
  }

  // Priority 4: Default to monthly
  return 'monthly'
}

const extractAccountsFromIbv = (
  ibvResults?: IBVSummary | null
): BankAccount[] => {
  if (!ibvResults || !Array.isArray(ibvResults.accounts)) {
    return []
  }
  return ibvResults.accounts.map(account => ({
    account_name: account?.bank_name ?? '',
    account_number: account?.number ?? '',
    transit_number: account?.transit ?? '',
    institution_number: account?.institution ?? '',
    bank_name: account?.bank_name ?? ''
  }))
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const applicationId = params.id

  if (!applicationId) {
    return NextResponse.json(
      { error: 'Application ID is required' },
      { status: 400 }
    )
  }

  try {
    const adminClient = createServerSupabaseAdminClient()

    const [contractResult, loanResponse, loanApplicationResponse] =
      await Promise.all([
        getContractByApplicationId(applicationId, true),
        getLoanByApplicationId(applicationId, true),
        getLoanApplicationById(applicationId, true)
      ])

    const contractData = contractResult.data
    const loanData = loanResponse.data
    const loanApplicationData = loanApplicationResponse.data

    // Get client's bank account from users table
    let clientBankAccount: BankAccount | null = null
    if (loanApplicationData?.client_id) {
      const { data: userData } = await (adminClient as any)
        .from('users')
        .select('bank_account')
        .eq('id', loanApplicationData.client_id)
        .maybeSingle()

      if (userData?.bank_account) {
        clientBankAccount = userData.bank_account as BankAccount
      }
    }

    const tmpAccounts = extractAccountsFromIbv(loanApplicationData?.ibv_results)

    // Combine accounts: client's saved account first, then IBV accounts
    const allAccountOptions: BankAccount[] = []
    if (clientBankAccount) {
      allAccountOptions.push(clientBankAccount)
    }
    // Add IBV accounts that aren't duplicates
    for (const ibvAccount of tmpAccounts) {
      const isDuplicate = allAccountOptions.some(
        acc =>
          acc.account_number === ibvAccount.account_number &&
          acc.institution_number === ibvAccount.institution_number &&
          acc.transit_number === ibvAccount.transit_number
      )
      if (!isDuplicate) {
        allAccountOptions.push(ibvAccount)
      }
    }
    const paymentFrequency = resolvePaymentFrequency(
      contractData?.contract_terms,
      loanApplicationData?.income_source,
      loanApplicationData?.income_fields,
      loanApplicationData?.ibv_results
    )
    const numberOfPayments =
      contractData?.contract_terms.number_of_payments ??
      calculateNumberOfPayments(paymentFrequency)
    const loanAmount =
      contractData?.contract_terms?.principal_amount ??
      loanData?.principal_amount ??
      0

    const defaultsresponse: ContractDefaultsResponse = {
      success: true,
      defaults: {
        brokerageFee: contractData?.contract_terms?.fees?.brokerage_fee ?? 250,
        loanAmount,
        account:
          contractData?.bank_account ??
          clientBankAccount ??
          allAccountOptions[0] ??
          null,
        accountOptions: allAccountOptions,
        numberOfPayments,
        paymentFrequency,
        nextPaymentDate: resolveNextPaymentDate(
          contractData?.contract_terms,
          loanApplicationData?.income_source,
          loanApplicationData?.income_fields,
          loanApplicationData?.ibv_results
        ),
        paymentAmount:
          contractData?.contract_terms?.payment_amount ??
          calculatePaymentAmount(
            paymentFrequency,
            loanAmount + 250.61,
            29,
            numberOfPayments ?? 6
          ),
        employmentPayDates: getAllEmploymentPayDates(
          loanApplicationData?.income_source,
          loanApplicationData?.income_fields,
          loanApplicationData?.ibv_results
        )
      }
    }

    return NextResponse.json(defaultsresponse)
  } catch (error: any) {
    console.error('Error fetching contract defaults:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
