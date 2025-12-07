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
import { PaymentFrequency, ContractTerms, LoanPaymentInsert } from '@/src/lib/supabase/types'
import { calculatePaymentBreakdown } from '@/src/lib/loan'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id
    const loanId = request.nextUrl.searchParams.get('loanId')

    if (!applicationId || !loanId) {
      return NextResponse.json(
        { error: 'Application ID and Loan ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    let payload: GenerateContractPayload = {
      paymentFrequency: 'monthly',
      numberOfPayments: 6,
      loanAmount: 0,
      paymentAmount: 0,
      brokerageFee: 0
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
    // 3) If contract exists but is not signed, allow regeneration (even if status is not contract_pending)
    // This handles cases where contract was generated but application status might have changed
    const canRegenerateUnsigned = existing && existing.contract_status !== 'signed'

    const sanitizeLoanAmount = (value: unknown): number | null => {
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return null
      return Math.round(parsed * 100) / 100
    }

    const resolvedLoanAmount =
      sanitizeLoanAmount(payload?.loanAmount) ??
      loanPrincipalAmount ??
      app.loan_amount

    if (!resolvedLoanAmount || resolvedLoanAmount <= 0) {
      return NextResponse.json(
        { error: 'Loan amount is required and must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!payload?.paymentFrequency) {
      return NextResponse.json(
        { error: 'Payment frequency is required' },
        { status: 400 }
      )
    }

    if (!payload?.numberOfPayments || payload.numberOfPayments <= 0) {
      return NextResponse.json(
        { error: 'Number of payments is required and must be greater than 0' },
        { status: 400 }
      )
    }

    if (!payload?.paymentAmount || payload.paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount is required and must be greater than 0' },
        { status: 400 }
      )
    }

    //Todo: use payload?.termMonths and payload?.interestRate
    const resolvedTermMonths = payload?.termMonths ?? 3
    const resolvedInterestRate = payload?.interestRate ?? 29

    // Validate next payment date is at least tomorrow
    if (payload?.nextPaymentDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const selectedDate = new Date(payload.nextPaymentDate)
      selectedDate.setHours(0, 0, 0, 0)

      if (selectedDate < tomorrow) {
        return NextResponse.json(
          {
            error:
              'Next payment date must be at least tomorrow (today + 1 day)'
          },
          { status: 400 }
        )
      }
    }

    // Get brokerage fee early to calculate total loan amount for payment schedule
    const brokerageFee = payload?.brokerageFee ?? 0
    const totalLoanAmount = resolvedLoanAmount + brokerageFee

    // Build payment schedule if not provided
    let finalPaymentSchedule = payload?.paymentSchedule
    if (!finalPaymentSchedule || !Array.isArray(finalPaymentSchedule) || finalPaymentSchedule.length === 0) {
      // Use loan library to build payment schedule with total loan amount (principal + brokerage fee)
      // This ensures remaining_balance is calculated correctly including fees
      finalPaymentSchedule = buildPaymentSchedule({
        payment_frequency: payload?.paymentFrequency,
        loan_amount: totalLoanAmount, // Include brokerage fee so remaining_balance is correct
        interest_rate: resolvedInterestRate,
        num_payments: payload?.numberOfPayments as number,
        start_date: payload?.firstPaymentDate
          ? (typeof payload.firstPaymentDate === 'string' 
              ? payload.firstPaymentDate 
              : payload.firstPaymentDate.toISOString())
          : payload?.nextPaymentDate
          ? payload.nextPaymentDate
          : undefined
      })
    } else {
      // If schedule is provided in payload, ensure remaining_balance is calculated using loan library
      // Recalculate using loan library to ensure consistency
      const recalculatedSchedule = buildPaymentSchedule({
        payment_frequency: payload?.paymentFrequency,
        loan_amount: totalLoanAmount,
        interest_rate: resolvedInterestRate,
        num_payments: payload?.numberOfPayments as number,
        start_date: finalPaymentSchedule[0]?.due_date || 
          (payload?.firstPaymentDate
            ? (typeof payload.firstPaymentDate === 'string'
                ? payload.firstPaymentDate
                : payload.firstPaymentDate.toISOString())
            : payload?.nextPaymentDate)
      })
      
      // If recalculation succeeded, use it (it will have correct remaining_balance)
      if (recalculatedSchedule && recalculatedSchedule.length === finalPaymentSchedule.length) {
        finalPaymentSchedule = recalculatedSchedule
      } else {
        // Fallback: merge provided schedule with recalculated remaining_balance
        finalPaymentSchedule = finalPaymentSchedule.map((schedule, index) => {
          const recalculated = recalculatedSchedule?.[index]
          return {
            ...schedule,
            remaining_balance: recalculated?.remaining_balance ?? 
                             (schedule as any).remaining_balance ?? 
                             (schedule as any).remainingBalance ?? 
                             null
          }
        })
      }
    }

    // Validate payment schedule exists
    if (!finalPaymentSchedule || !Array.isArray(finalPaymentSchedule) || finalPaymentSchedule.length === 0) {
      return NextResponse.json(
        { error: 'Payment schedule is required and could not be generated. Please check payment frequency, number of payments, and start date.' },
        { status: 400 }
      )
    }

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
        brokerageFee: payload.brokerageFee,
        paymentSchedule: finalPaymentSchedule
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
          ).toISOString(), // 30 days
          bank_account: payload?.account
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
      
      // Use the totalLoanAmount already calculated (principal + brokerage fee)
      // Note: Origination fee is NOT included in initial loan amount - it's only for returned/failed payments
      await updateLoan(
        loanId as string,
        {
          principal_amount: resolvedLoanAmount,
          remaining_balance: totalLoanAmount // Only includes principal + brokerage fee
        },
        { useAdminClient: true }
      )

      // Create loan payments with 'pending' status (waiting for loan to be active/contract signed)
      if (finalPaymentSchedule && finalPaymentSchedule.length > 0) {
        const loanPayments: LoanPaymentInsert[] = finalPaymentSchedule.map((schedule, index) => {
          // Handle both camelCase (from payload) and snake_case (from buildPaymentSchedule)
          const remainingBalance = (schedule as any).remaining_balance ?? (schedule as any).remainingBalance ?? null
          return {
          loan_id: loanId as string,
          payment_date: schedule.due_date,
          amount: schedule.amount,
          payment_number: index + 1,
          status: 'pending' as const, // Status indicates payment is waiting for loan to be active (contract signed)
          interest: schedule.interest ?? null,
            principal: schedule.principal ?? null,
            remaining_balance: remainingBalance
          }
        })

        // For new contracts, just insert all payments
        // Delete existing pending payments for this loan first (in case of any orphaned records)
        await (supabase.from('loan_payments') as any)
          .delete()
          .eq('loan_id', loanId)
          .eq('status', 'pending')

        // Insert new loan payments
        const { error: paymentError } = await (supabase.from('loan_payments') as any)
          .insert(loanPayments)

        if (paymentError) {
          console.error('Error creating loan payments:', paymentError)
          // Don't fail the request, but log the error
        }
      }

      return NextResponse.json({
        success: true,
        contract: contractResult.data
      })
    } else if (canRegenerateUnsigned) {
      // Regenerate (update existing, bump version) - allowed if contract is not signed
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

      // Use the totalLoanAmount already calculated (principal + brokerage fee)
      // Note: Origination fee is NOT included in initial loan amount - it's only for returned/failed payments
      const newBrokerageFee = contractTerms.fees?.brokerage_fee ?? 0
      
      // Get old brokerage fee and principal from existing contract for comparison
      const oldBrokerageFee = existing.contract_terms?.fees?.brokerage_fee ?? 0
      const oldPrincipalAmount = existing.contract_terms?.principal_amount ?? loan?.principal_amount ?? resolvedLoanAmount
      
      // Calculate remaining balance adjustment
      // If loan hasn't been disbursed or no payments made, use new total
      // Otherwise, adjust for brokerage fee and principal amount changes
      const currentRemainingBalance = Number(loan?.remaining_balance || 0)
      const oldTotalLoanAmount = (oldPrincipalAmount || 0) + oldBrokerageFee
      
      // Calculate differences for adjustment
      const principalDifference = resolvedLoanAmount - oldPrincipalAmount
      const brokerageFeeDifference = newBrokerageFee - oldBrokerageFee
      
      let newRemainingBalance: number
      if (currentRemainingBalance === oldTotalLoanAmount || loan?.status === 'pending_disbursement') {
        // No payments made yet, use new total (principal + new brokerage fee)
        newRemainingBalance = totalLoanAmount
      } else {
        // Payments have been made, adjust for principal and brokerage fee changes
        // Formula: newRemaining = currentRemaining + (newPrincipal - oldPrincipal) + (newBrokerageFee - oldBrokerageFee)
        newRemainingBalance = Math.max(0, currentRemainingBalance + principalDifference + brokerageFeeDifference)
      }
      
      // Update loan with new principal amount, brokerage fee (via remaining balance), and adjusted remaining balance
      await updateLoan(
        loanId as string,
        {
          principal_amount: resolvedLoanAmount, // Update principal amount if changed by admin
          remaining_balance: newRemainingBalance // Updated with new fees and principal changes
        },
        { useAdminClient: true }
      )

      // When regenerating, clear all payments and create new ones
      if (finalPaymentSchedule && finalPaymentSchedule.length > 0) {
        // Delete all existing payments for this loan (clear everything on regeneration)
        const { error: deleteAllError } = await (supabase.from('loan_payments') as any)
          .delete()
          .eq('loan_id', loanId)

        if (deleteAllError) {
          console.error('Error deleting existing payments:', deleteAllError)
          return NextResponse.json(
            { error: 'Failed to clear existing payments' },
            { status: 500 }
          )
        }

        // Create new payments from the schedule
        const newPayments: LoanPaymentInsert[] = finalPaymentSchedule.map((schedule, index) => {
          // Handle both camelCase (from payload) and snake_case (from buildPaymentSchedule)
          const remainingBalance = (schedule as any).remaining_balance ?? (schedule as any).remainingBalance ?? null
          return {
          loan_id: loanId as string,
          payment_date: schedule.due_date,
          amount: schedule.amount,
          payment_number: index + 1,
          status: 'pending' as const,
          interest: schedule.interest ?? null,
            principal: schedule.principal ?? null,
            remaining_balance: remainingBalance
          }
        })

        // Insert all new payments
        if (newPayments.length > 0) {
          const { error: insertError } = await (supabase.from('loan_payments') as any)
            .insert(newPayments)

          if (insertError) {
            console.error('Error inserting new payments:', insertError)
            return NextResponse.json(
              { error: 'Failed to create new payments' },
              { status: 500 }
            )
          }
        }
      }

      return NextResponse.json({
        success: true,
        contract: updateResult.data
      })
    } else {
      // If we reach here, there's an existing contract but we can't regenerate it
      // This should have been caught by the guard rails, but handle it anyway
      return NextResponse.json(
        { error: 'Contract already exists and cannot be regenerated' },
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
/**
 * Build payment schedule using the loan library's calculatePaymentBreakdown
 * This ensures consistency across the application and reuses the tested calculation logic
 * 
 * @param args - Payment schedule parameters
 * @param args.loan_amount - Total loan amount (principal + brokerage fee) to use for calculation
 * @param args.interest_rate - Annual interest rate as percent (e.g. 29)
 * @param args.num_payments - Number of payments
 * @param args.payment_frequency - Payment frequency
 * @param args.start_date - First payment date (optional)
 * @returns Payment schedule with remaining_balance calculated by loan library
 */
function buildPaymentSchedule(args: {
  payment_frequency: PaymentFrequency | undefined
  loan_amount: number // This should be total (principal + brokerage fee)
  interest_rate: number // as percent (e.g. 24)
  num_payments: number
  start_date?: string
}):
  | { due_date: string; amount: number; principal: number; interest: number; remaining_balance: number }[]
  | undefined {
  const {
    payment_frequency,
    loan_amount,
    interest_rate,
    num_payments,
    start_date
  } = args

  // Validate inputs
  if (
    !payment_frequency ||
    loan_amount <= 0 ||
    interest_rate < 0 ||
    num_payments <= 0
  ) {
    return undefined
  }

  // Use loan library's calculatePaymentBreakdown
  // Note: loan_amount is the total (principal + brokerage fee), so we pass it as principalAmount
  // and set brokerageFee to 0 since it's already included in loan_amount
  // This ensures remaining_balance is calculated correctly including the fee
  const breakdown = calculatePaymentBreakdown(
    {
      principalAmount: loan_amount, // Total amount (principal + brokerage fee already included)
      interestRate: interest_rate,
      paymentFrequency: payment_frequency,
      numberOfPayments: num_payments,
      brokerageFee: 0, // Fee already included in loan_amount
      originationFee: 0 // Origination fee not included in initial loan
    },
    start_date || new Date().toISOString().split('T')[0]
  )

  if (!breakdown || breakdown.length === 0) {
    return undefined
  }

  // Transform PaymentBreakdown[] to the expected format (snake_case)
  // The loan library's calculatePaymentBreakdown already includes remainingBalance
  return breakdown.map((item) => ({
    due_date: item.dueDate,
    amount: item.amount,
    principal: item.principal,
    interest: item.interest,
    remaining_balance: item.remainingBalance // This is already calculated by the loan library
  }))
}
