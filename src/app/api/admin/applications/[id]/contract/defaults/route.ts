import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { getContractByApplicationId } from '@/src/lib/supabase/contract-helpers'
import type {
  IncomeSourceType
} from '@/src/lib/supabase/types'
import { IBVSummary } from '@/src/app/api/inverite/fetch/[guid]/types'
import {
  FREQUENCY_OPTIONS,
  FREQUENCY_PRIORITY,
  getPaymentsPerMonth,
  normalizeFrequency
} from '@/src/lib/utils/frequency'
import { buildContractTermsFromApplication } from '@/src/lib/contracts/terms'
import {  ContractDefaultsResponse, PaymentFrequency, ContractTerms } from '@/src/types'
import {
  getLoanApplicationById,
  getLoanByApplicationId
} from '@/src/lib/supabase/loan-helpers'
import { BankAccount } from '@/src/types'

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

const resolveNextPaymentDate = (
  terms: ContractTerms | null | undefined,
  ibvResults?: IBVSummary | null
): string => {
  const todayIso = toIsoDate(new Date())

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

  const ibvNextDate = getNextPayDateFromIbv(ibvResults)
  if (ibvNextDate) {
    return ibvNextDate
  }

  const effectiveDate = parseDateValue(terms?.effective_date)
  if (effectiveDate) {
    return toIsoDate(effectiveDate)
  }

  return todayIso
}

const resolvePaymentFrequency = (
  terms: ContractTerms | null | undefined,
  ibvResults?: IBVSummary | null
): PaymentFrequency => {
  const fromTerms = normalizeFrequency(
    terms?.payment_frequency
  ) as PaymentFrequency | null

  if (fromTerms) {
    return fromTerms
  }

  const fromIbv = getLowestPaymentFrequencyFromIbv(ibvResults)

  if (fromIbv) {
    return fromIbv
  }

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
    const paymentFrequency =
      contractData?.contract_terms.payment_frequency ??
      loanApplicationData?.ibv_results?.accounts?.[0]?.income?.[0]?.frequency ??
      'monthly'
    const numberOfPayments =
      contractData?.contract_terms.number_of_payments ?? 6
    const loanAmount =
      contractData?.contract_terms?.principal_amount ??
      loanData?.principal_amount ??
      0

    const defaultsresponse: ContractDefaultsResponse = {
      success: true,
      defaults: {
        loanAmount,
        account: contractData?.bank_account ?? clientBankAccount ?? allAccountOptions[0] ?? null,
        accountOptions: allAccountOptions,
        numberOfPayments,
        paymentFrequency,
        nextPaymentDate: resolveNextPaymentDate(
          contractData?.contract_terms,
          loanApplicationData?.ibv_results
        ),
        paymentAmount:
          contractData?.contract_terms?.payment_amount ??
          (loanAmount * 1.76) / (numberOfPayments ?? 6) 

          // calculatePaymentAmount(
          //   paymentFrequency,
          //   loanAmount ?? 0,
          //   29,
          //   numberOfPayments
          // ) ??
          // 0
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

function calculatePaymentAmount(
  payment_frequency: PaymentFrequency,
  loan_amount: number,
  interest_rate: number, // annual rate in percent, e.g. 24
  num_payments: number
): number | undefined {
  if (
    !payment_frequency ||
    loan_amount <= 0 ||
    interest_rate < 0 ||
    num_payments <= 0
  ) {
    return undefined
  }

  const paymentsPerYearMap: Record<PaymentFrequency, number> = {
    weekly: 52,
    'bi-weekly': 26,
    'twice-monthly': 24,
    monthly: 12
  }

  const paymentsPerYear = paymentsPerYearMap[payment_frequency]
  const periodicRate = interest_rate / 100 / paymentsPerYear

  // amortized payment formula
  const payment =
    periodicRate === 0
      ? loan_amount / num_payments
      : (loan_amount *
          (periodicRate * Math.pow(1 + periodicRate, num_payments))) /
        (Math.pow(1 + periodicRate, num_payments) - 1)

  return Number(payment.toFixed(2))
}
