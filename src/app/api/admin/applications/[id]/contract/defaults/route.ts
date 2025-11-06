import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { getContractByApplicationId } from '@/src/lib/supabase/contract-helpers'
import type { PaymentFrequency, ContractTerms } from '@/src/lib/supabase/types'
import { IBVSummary } from '@/src/app/api/inverite/fetch/[guid]/types'

const PAYMENT_FREQUENCY_OPTIONS: PaymentFrequency[] = ['monthly', 'bi-weekly', 'weekly']
const PAYMENT_FREQUENCY_PRIORITY: PaymentFrequency[] = ['weekly', 'bi-weekly', 'monthly']

const normalizePaymentFrequency = (value: unknown): PaymentFrequency | null => {
  if (typeof value !== 'string') {
    return null
  }

  const canonicalize = (input: string) =>
    input
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-')

  const normalizedValue = canonicalize(value)
  const candidateSegments = Array.from(
    new Set(
      [
        normalizedValue,
        normalizedValue.split(':')[0],
        normalizedValue.split('|')[0],
        normalizedValue.split(';')[0],
        ...normalizedValue.split(/[:|;,]+/g)
      ]
        .map((segment) => segment?.trim())
        .filter((segment): segment is string => Boolean(segment))
    )
  )

  const frequencyAliases: Record<PaymentFrequency, string[]> = {
    weekly: ['weekly', 'week', 'once-a-week', 'one-week', '1w', 'hebdomadaire'],
    'bi-weekly': [
      'bi-weekly',
      'biweekly',
      'every-two-weeks',
      '2w',
      'semi-monthly',
      'semimonthly',
      'twice-monthly',
      'fortnightly'
    ],
    monthly: ['monthly', 'month', 'once-a-month', '1m', 'mensuel']
  } 

  for (const [frequency, aliases] of Object.entries(frequencyAliases)) {
    const canonicalAliases = aliases.map((alias) => canonicalize(alias))

    if (candidateSegments.some((segment) => canonicalAliases.includes(segment))) {
      return frequency as PaymentFrequency
    }
  }

  return null
}

const getLowestPaymentFrequencyFromIbv = (ibvResults?: IBVSummary | null): PaymentFrequency | null => {
  if (!ibvResults || !Array.isArray(ibvResults.accounts)) {
    return null
  }

  let selected: PaymentFrequency | null = null
  let bestRank = Number.POSITIVE_INFINITY

  for (const account of ibvResults.accounts) {
    const incomes = Array.isArray(account?.income) ? account.income : []

    for (const income of incomes) {
      const normalized = normalizePaymentFrequency(income?.frequency)

      if (!normalized) {
        continue
      }

      const rank = PAYMENT_FREQUENCY_PRIORITY.indexOf(normalized)

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

const getNextPayDateFromIbv = (ibvResults?: IBVSummary | null): string | null => {
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
      const futurePayments = Array.isArray(income?.future_payments) ? income.future_payments : []

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

  const scheduleEntries = Array.isArray(terms?.payment_schedule) ? terms?.payment_schedule : []
  const scheduleDates = scheduleEntries
    .map((entry) => parseDateValue(entry?.due_date))
    .filter((date): date is Date => Boolean(date))
    .map((date) => {
      const normalized = new Date(date)
      normalized.setHours(0, 0, 0, 0)
      return normalized
    })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingScheduleDate = getEarliestDate(scheduleDates.filter((date) => date.getTime() >= today.getTime()))
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
  const fromTerms = normalizePaymentFrequency(terms?.payment_frequency)

  if (fromTerms) {
    return fromTerms
  }

  const fromIbv = getLowestPaymentFrequencyFromIbv(ibvResults)

  if (fromIbv) {
    return fromIbv
  }

  return 'monthly'
}

interface ContractDefaultsResponse {
  applicationId: string
  termMonths: number
  paymentFrequency: PaymentFrequency
  interestRate: number
  loanAmount: number
  numberOfPayments: number
  nextPaymentDate: string
  source: 'existing_contract' | 'application_defaults'
  frequencyOptions: PaymentFrequency[]
  generatedAt: string
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
    const supabase = await createServerSupabaseAdminClient()

    const [applicationResponse, contractResult] = await Promise.all([
      supabase
        .from('loan_applications')
        .select('id, loan_amount, interest_rate, application_status, ibv_results')
        .eq('id', applicationId)
        .single(),
      getContractByApplicationId(applicationId, true)
    ])

    const { data: applicationData, error: applicationError } = applicationResponse

    if (applicationError || !applicationData) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const application = applicationData as {
      id: string
      loan_amount: number
      interest_rate: number | null
      ibv_results: IBVSummary
    }

    const existingContract = contractResult.success ? contractResult.data : null

    let defaults: ContractDefaultsResponse

    if (existingContract?.contract_terms) {
      const terms = existingContract.contract_terms as ContractTerms
      const paymentFrequency = resolvePaymentFrequency(terms, application.ibv_results)
      const termMonths = terms.term_months ?? 3
      const numberOfPayments = terms.number_of_payments ?? calculateNumberOfPayments(termMonths, paymentFrequency)
      const nextPaymentDate = resolveNextPaymentDate(terms, application.ibv_results)

      defaults = {
        applicationId,
        termMonths,
        paymentFrequency,
        interestRate: terms.interest_rate ?? application.interest_rate ?? 29,
        loanAmount: terms.principal_amount ?? application.loan_amount,
        numberOfPayments,
        nextPaymentDate,
        source: 'existing_contract',
        frequencyOptions: PAYMENT_FREQUENCY_OPTIONS,
        generatedAt: new Date().toISOString()
      }
    } else {
      const interestRate = application.interest_rate ?? 29
      const termMonths = 3
      const paymentFrequency = resolvePaymentFrequency(null, application.ibv_results)
      const nextPaymentDate = resolveNextPaymentDate(null, application.ibv_results)

      defaults = {
        applicationId,
        termMonths,
        paymentFrequency,
        interestRate,
        loanAmount: application.loan_amount,
        numberOfPayments: calculateNumberOfPayments(termMonths, paymentFrequency),
        nextPaymentDate,
        source: 'application_defaults',
        frequencyOptions: PAYMENT_FREQUENCY_OPTIONS,
        generatedAt: new Date().toISOString()
      }
    }

    return NextResponse.json({ success: true, defaults })
  } catch (error: any) {
    console.error('Error fetching contract defaults:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

const calculateNumberOfPayments = (termMonths: number, frequency: PaymentFrequency): number => {
  switch (frequency) {
    case 'weekly':
      return termMonths * 4
    case 'bi-weekly':
      return termMonths * 2
    default:
      return termMonths
  }
}


