/**
 * API Route: Generate Loan Contract
 *
 * POST /api/admin/applications/[id]/contract/generate
 *
 * Generates a new contract for an approved loan application
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import {
  createLoanContract,
  getContractByApplicationId
} from '@/src/lib/supabase/contract-helpers'
import { buildContractTermsFromApplication } from '@/src/lib/contracts/terms'
import {
  getLoanByApplicationId,
  getLoanById,
  updateLoan,
  updateLoanAmount
} from '@/src/lib/supabase/loan-helpers'
import { GenerateContractPayload } from '@/src/app/types/contract'
import { PaymentFrequency, ContractTerms } from '@/src/lib/supabase/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id
    const loanId = request.nextUrl.searchParams.get('loanId')

    if (!applicationId || !loanId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    let payload: GenerateContractPayload = {
      paymentFrequency: 'monthly',
      numberOfPayments: 6,
      loanAmount: 0,
      paymentAmount: 0
    }
    try {
      payload = await request.json()
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          'No JSON payload provided or failed to parse payload:',
          error
        )
      }
    }

    // Fetch application details
    const { data: application, error: appError } = await supabase
      .from('loan_applications')
      .select(
        `
        id,
        loan_amount,
        application_status,
        interest_rate,
        ibv_results,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          preferred_language
        ),
        address_id,
        addresses!loan_applications_address_id_fkey (
          street_number,
          street_name,
          apartment_number,
          city,
          province,
          postal_code
        )
      `
      )
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const { data: loanData, error } = await getLoanById(loanId as string, true)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const app = application as {
      id: string
      loan_amount: number
      application_status: string
      interest_rate: number | null
      ibv_results: any
      users: {
        id: string
        first_name: string | null
        last_name: string | null
        email: string | null
        phone: string | null
        preferred_language: string | null
      } | null
      addresses?: {
        street_number: string | null
        street_name: string | null
        apartment_number: string | null
        city: string | null
        province: string | null
        postal_code: string | null
      } | null
    }

    const loan = loanData

    const parseNumeric = (value: unknown): number | null => {
      if (value === null || value === undefined) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    const loanPrincipalAmount = parseNumeric(loan?.principal_amount)
    const loanInterestRate = parseNumeric(loan?.interest_rate)
    const loanTermMonths = parseNumeric(loan?.term_months)

    // Allow generation when application is pre-approved OR already in contract flow (pending)
    const applicationStatus = String(app.application_status || '')
    const canGenerateInitial = applicationStatus === 'pre_approved'
    const canRegenerate = applicationStatus === 'contract_pending'

    // Get existing contract (if any)
    const existingContract = await getContractByApplicationId(
      applicationId,
      true
    )
    const existing = existingContract.success ? existingContract.data : null

    // Guard rails:
    // 1) If a contract exists and is signed, block regeneration
    if (existing && existing.contract_status === 'signed') {
      return NextResponse.json(
        { error: 'Contract already signed; regeneration is not allowed' },
        { status: 400 }
      )
    }
    // 2) If no contract exists yet, require application to be pre-approved
    if (!existing && !canGenerateInitial) {
      return NextResponse.json(
        {
          error: 'Application must be pre-approved before generating contract'
        },
        { status: 400 }
      )
    }

    const sanitizeLoanAmount = (value: unknown): number | null => {
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return null
      return Math.round(parsed * 100) / 100
    }

    const resolvedLoanAmount =
      sanitizeLoanAmount(payload?.loanAmount) ??
      loanPrincipalAmount ??
      app.loan_amount

    //Todo: use payload?.termMonths and payload?.interestRate
    const resolvedTermMonths = payload?.termMonths ?? 3
    const resolvedInterestRate = payload?.interestRate ?? 29

    // Build contract terms (calculation + borrower details + viewer aliases)
    const contractTerms = buildContractTermsFromApplication(
      {
        id: app.id,
        loan_amount: resolvedLoanAmount,
        interest_rate: resolvedInterestRate,
        users: app.users,
        addresses: app.addresses ?? null
      },
      {
        loanAmount: resolvedLoanAmount,
        paymentFrequency: payload?.paymentFrequency as PaymentFrequency,
        numberOfPayments: payload?.numberOfPayments as number,
        termMonths: resolvedTermMonths,
        nextPaymentDate: payload?.nextPaymentDate,
        firstPaymentDate: payload?.firstPaymentDate,
        paymentAmount: payload.paymentAmount,
        paymentSchedule: payload?.paymentSchedule ?? buildPaymentSchedule({
          payment_frequency: payload?.paymentFrequency,
          loan_amount: resolvedLoanAmount,
          interest_rate: resolvedInterestRate,
          num_payments: payload?.numberOfPayments as number,
          start_date: payload?.firstPaymentDate
            ? payload?.firstPaymentDate.toISOString()
            : undefined
        })
      }
    )

    // Create or update contract
    if (!existing) {
      // Create new
      const contractResult = await createLoanContract(
        {
          loan_application_id: applicationId,
          loan_id: loanId,
          contract_version: 1,
          contract_terms: contractTerms as ContractTerms,
          contract_status: 'generated',
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString() // 30 days
        },
        true
      )

      if (!contractResult.success) {
        return NextResponse.json(
          { error: contractResult.error || 'Failed to create contract' },
          { status: 500 }
        )
      }

      // Move application into contract flow
      await (supabase.from('loan_applications') as any)
        .update({
          application_status: 'contract_pending',
          contract_generated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
      await updateLoan(
        loanId as string,
        {
          principal_amount: resolvedLoanAmount,
          remaining_balance: resolvedLoanAmount
        },
        { useAdminClient: true }
      )
      return NextResponse.json({
        success: true,
        contract: contractResult.data
      })
    } else if (canRegenerate) {
      // Regenerate (update existing, bump version)
      const nextVersion = (existing.contract_version ?? 1) + 1
      const { updateLoanContract } = await import(
        '@/src/lib/supabase/contract-helpers'
      )
      const updateResult = await updateLoanContract(
        existing.id,
        {
          loan_id: loanId,
          contract_terms: contractTerms,
          bank_account: payload?.account,
          contract_version: nextVersion,
          contract_status: 'generated',
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString()
        },
        true
      )
      if (!updateResult.success) {
        return NextResponse.json(
          { error: updateResult.error || 'Failed to regenerate contract' },
          { status: 500 }
        )
      }

      await updateLoan(
        loanId as string,
        {
          principal_amount: resolvedLoanAmount,
          remaining_balance: resolvedLoanAmount,
          
        },
        { useAdminClient: true }
      )
      return NextResponse.json({
        success: true,
        contract: updateResult.data
      })
    } else if (canRegenerate) {
      return NextResponse.json(
        { error: 'Contract already signed; regeneration is not allowed' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error generating contract:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
function buildPaymentSchedule(args: {
  payment_frequency: PaymentFrequency | undefined
  loan_amount: number
  interest_rate: number // as percent (e.g. 24)
  num_payments: number // <<-- you pass this directly now
  start_date?: string
}):
  | { due_date: string; amount: number; principal: number; interest: number }[]
  | undefined {
  const {
    payment_frequency,
    loan_amount,
    interest_rate,
    num_payments,
    start_date
  } = args
  if (
    !payment_frequency ||
    loan_amount <= 0 ||
    interest_rate < 0 ||
    num_payments <= 0
  ) {
    return undefined
  }

  // Frequency mapping
  const frequencyConfig: Record<
    PaymentFrequency,
    { paymentsPerYear: number; daysBetween: number; monthsBetween: number }
  > = {
    weekly: { paymentsPerYear: 52, daysBetween: 7, monthsBetween: 0 },
    'bi-weekly': { paymentsPerYear: 26, daysBetween: 14, monthsBetween: 0 },
    'twice-monthly': { paymentsPerYear: 24, daysBetween: 15, monthsBetween: 0 }, // use 15 days instead of 0.5 month
    monthly: { paymentsPerYear: 12, daysBetween: 0, monthsBetween: 1 }
  }

  const freq = frequencyConfig[payment_frequency]
  if (!freq) return undefined

  const { paymentsPerYear, daysBetween, monthsBetween } = freq
  const periodicRate = interest_rate / 100 / paymentsPerYear

  // Payment per period
  const payment =
    periodicRate === 0
      ? loan_amount / num_payments
      : (loan_amount *
          (periodicRate * Math.pow(1 + periodicRate, num_payments))) /
        (Math.pow(1 + periodicRate, num_payments) - 1)

  // Initialize schedule
  let balance = loan_amount
  const schedule: {
    due_date: string
    amount: number
    principal: number
    interest: number
  }[] = []

  const baseDate = start_date ? new Date(start_date) : new Date()

  for (let i = 0; i < num_payments; i++) {
    const interestPayment = balance * periodicRate
    let principalPayment = payment - interestPayment

    // Fix rounding issue on last payment
    if (i === num_payments - 1) {
      principalPayment = balance
    }

    balance -= principalPayment

    // Calculate due date
    const dueDate = new Date(baseDate)
    if (monthsBetween > 0) {
      dueDate.setMonth(baseDate.getMonth() + monthsBetween * (i + 1))
    } else {
      dueDate.setDate(baseDate.getDate() + daysBetween * (i + 1))
    }

    schedule.push({
      due_date: dueDate.toISOString().split('T')[0],
      amount: Number(payment.toFixed(2)),
      principal: Number(principalPayment.toFixed(2)),
      interest: Number(interestPayment.toFixed(2))
    })
  }

  return schedule
}
