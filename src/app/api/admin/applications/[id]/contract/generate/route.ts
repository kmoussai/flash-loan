/**
 * API Route: Generate Loan Contract
 * 
 * POST /api/admin/applications/[id]/contract/generate
 * 
 * Generates a new contract for an approved loan application
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createLoanContract, getContractByApplicationId } from '@/src/lib/supabase/contract-helpers'
import type { ContractTerms, PaymentFrequency } from '@/src/lib/supabase/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    let payload: any = {}
    try {
      payload = await request.json()
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('No JSON payload provided or failed to parse payload:', error)
      }
      payload = {}
    }

    // Fetch application details
    const { data: application, error: appError } = await supabase
      .from('loan_applications')
      .select(`
        id,
        loan_amount,
        loan_type,
        application_status,
        interest_rate,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const app = application as {
      id: string
      loan_amount: number
      loan_type: string
      application_status: string
      interest_rate: number | null
      users: {
        id: string
        first_name: string | null
        last_name: string | null
        email: string | null
      } | null
    }

    // Check if application is pre-approved
    if (app.application_status !== 'pre_approved') {
      return NextResponse.json(
        { error: 'Application must be pre-approved before generating contract' },
        { status: 400 }
      )
    }

    // Check if contract already exists
    const existingContract = await getContractByApplicationId(applicationId, true)
    if (existingContract.success && existingContract.data) {
      return NextResponse.json(
        { 
          error: 'Contract already exists for this application',
          contract: existingContract.data
        },
        { status: 400 }
      )
    }

    const normalizeTermMonths = (rawValue: unknown, fallback = 3): number => {
      const parsed = Number(rawValue)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback
      }

      return Math.round(parsed)
    }

    const allowedPaymentFrequencies: PaymentFrequency[] = ['monthly', 'bi-weekly', 'weekly']
    const normalizePaymentFrequency = (rawValue: unknown, fallback: PaymentFrequency = 'monthly'): PaymentFrequency => {
      if (typeof rawValue !== 'string') {
        return fallback
      }

      const normalized = rawValue.trim().toLowerCase() as PaymentFrequency
      return allowedPaymentFrequencies.includes(normalized) ? normalized : fallback
    }

    const normalizeNumberOfPayments = (rawValue: unknown): number | null => {
      const parsed = Number(rawValue)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return null
      }

      return Math.max(1, Math.round(parsed))
    }

    const normalizeLoanAmount = (rawValue: unknown, fallback: number): number => {
      const parsed = Number(rawValue)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback
      }

      return Math.round(parsed * 100) / 100
    }

    const normalizeFirstPaymentDate = (rawValue: unknown): Date | null => {
      if (!rawValue) {
        return null
      }

      if (rawValue instanceof Date) {
        return Number.isNaN(rawValue.getTime()) ? null : rawValue
      }

      if (typeof rawValue === 'string' || typeof rawValue === 'number') {
        const parsed = new Date(rawValue)
        return Number.isNaN(parsed.getTime()) ? null : parsed
      }

      return null
    }

    const calculateNumberOfPayments = (months: number, frequency: PaymentFrequency): number => {
      switch (frequency) {
        case 'weekly':
          return months * 4
        case 'bi-weekly':
          return months * 2
        default:
          return months
      }
    }

    const calculateDueDate = (startDate: Date, index: number, frequency: PaymentFrequency): Date => {
      const dueDate = new Date(startDate)

      switch (frequency) {
        case 'weekly':
          dueDate.setDate(startDate.getDate() + index * 7)
          break
        case 'bi-weekly':
          dueDate.setDate(startDate.getDate() + index * 14)
          break
        default:
          dueDate.setMonth(startDate.getMonth() + index)
          break
      }

      return dueDate
    }

    // Calculate contract terms (simplified - you may want to add more sophisticated calculations)
    const loanAmount = normalizeLoanAmount(payload?.loanAmount, parseFloat(String(app.loan_amount)))
    const interestRate = app.interest_rate ?? 29.0
    const paymentFrequency = normalizePaymentFrequency(payload?.paymentFrequency)
    const providedNumberOfPayments = normalizeNumberOfPayments(payload?.numberOfPayments)
    const fallbackTermMonths = normalizeTermMonths(payload?.termMonths)

    const paymentsPerMonthMap: Record<PaymentFrequency, number> = {
      weekly: 4,
      'bi-weekly': 2,
      monthly: 1
    }

    const paymentsPerMonth = paymentsPerMonthMap[paymentFrequency] ?? 1

    const numberOfPayments = providedNumberOfPayments ?? Math.max(1, calculateNumberOfPayments(fallbackTermMonths, paymentFrequency))

    const durationInMonths = providedNumberOfPayments
      ? Math.max(providedNumberOfPayments / paymentsPerMonth, 1 / paymentsPerMonth)
      : fallbackTermMonths

    const termMonths = Math.max(1, Math.ceil(durationInMonths))
    const monthsForInterest = Math.max(durationInMonths, 1)

    // Calculate total with interest
    const monthlyInterestPortion = (loanAmount * interestRate) / 100 / 12
    const totalInterest = monthlyInterestPortion * monthsForInterest
    const totalAmount = loanAmount + totalInterest
    const paymentAmount = totalAmount / numberOfPayments
    const principalPerPayment = loanAmount / numberOfPayments
    const interestPerPayment = totalInterest / numberOfPayments

    // Generate payment schedule
    const paymentSchedule = [] as NonNullable<ContractTerms['payment_schedule']>
    const scheduleStartDate = normalizeFirstPaymentDate(payload?.firstPaymentDate) ?? new Date()
    const startDate = new Date(scheduleStartDate)
    startDate.setHours(0, 0, 0, 0)
    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = calculateDueDate(startDate, i, paymentFrequency)
      paymentSchedule.push({
        due_date: dueDate.toISOString().split('T')[0],
        amount: paymentAmount,
        principal: principalPerPayment,
        interest: interestPerPayment
      })
    }

    const maturityDate = paymentSchedule.length > 0
      ? paymentSchedule[paymentSchedule.length - 1].due_date
      : new Date(startDate).toISOString().split('T')[0]

    const contractTerms: ContractTerms = {
      interest_rate: interestRate,
      term_months: termMonths,
      principal_amount: loanAmount,
      total_amount: totalAmount,
      payment_frequency: paymentFrequency,
      number_of_payments: numberOfPayments,
      fees: {
        origination_fee: 0,
        processing_fee: 0,
        other_fees: 0
      },
      payment_schedule: paymentSchedule,
      terms_and_conditions: 'Standard loan terms and conditions apply. Please review carefully before signing.',
      effective_date: startDate.toISOString(),
      maturity_date: maturityDate
    }

    // Create contract
    const contractResult = await createLoanContract({
      loan_application_id: applicationId,
      contract_version: 1,
      contract_terms: contractTerms,
      contract_status: 'generated',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    }, true)

    if (!contractResult.success) {
      return NextResponse.json(
        { error: contractResult.error || 'Failed to create contract' },
        { status: 500 }
      )
    }

    // Update application status to contract_pending
    await (supabase
      .from('loan_applications') as any)
      .update({ 
        application_status: 'contract_pending',
        contract_generated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    return NextResponse.json({
      success: true,
      contract: contractResult.data
    })
  } catch (error: any) {
    console.error('Error generating contract:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

