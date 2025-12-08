import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentInsert, PaymentFrequency } from '@/src/lib/supabase/types'
import {
  validatePaymentAmount,
  recalculatePaymentSchedule,
  roundCurrency,
  PAYMENT_FREQUENCY_CONFIG
} from '@/src/lib/loan'
import { getContractByApplicationId } from '@/src/lib/supabase/contract-helpers'
import { parseLocalDate } from '@/src/lib/utils/date'
import { updateLoanPaymentsFromBreakdown } from '@/src/lib/supabase/payment-schedule-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/loans/[id]/payments/manual
 * Create a manual payment and update the loan's remaining_balance
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: loanId } = params

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { payment_date, amount, notes, mark_loan_as_paid } = body

    // Validation
    if (!payment_date) {
      return NextResponse.json(
        { error: 'Payment date is required' },
        { status: 400 }
      )
    }

    const paymentAmount = roundCurrency(Number(amount))
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      )
    }

    // Validate date format
    const paymentDate = parseLocalDate(payment_date)
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid payment date format' },
        { status: 400 }
      )
    }

    // Format date as YYYY-MM-DD in local timezone (avoids timezone issues)
    const formatDateLocal = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const supabase = await createServerSupabaseAdminClient()

    // Get the loan to check remaining balance, status, interest rate, and application ID
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, remaining_balance, status, interest_rate, application_id')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    const typedLoan = loan as { 
      id: string
      remaining_balance: number | null
      status: string
      interest_rate: number | null
      application_id: string | null
    }
    const currentRemainingBalance = roundCurrency(Number(typedLoan.remaining_balance || 0))
    const interestRate = typedLoan.interest_rate ?? 29 // Default to 29% if not set

    // Get contract to determine payment frequency
    let paymentFrequency: PaymentFrequency = 'monthly' // Default
    if (typedLoan.application_id) {
      const contractResult = await getContractByApplicationId(typedLoan.application_id, true)
      if (contractResult.success && contractResult.data?.contract_terms?.payment_frequency) {
        paymentFrequency = contractResult.data.contract_terms.payment_frequency as PaymentFrequency
      }
    }

    // Validate payment amount using loan library
    const validationError = validatePaymentAmount(paymentAmount, currentRemainingBalance)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    // Calculate interest and principal for this payment
    const config = PAYMENT_FREQUENCY_CONFIG[paymentFrequency]
    const periodicRate = interestRate / 100 / config.paymentsPerYear
    const interest = roundCurrency(currentRemainingBalance * periodicRate)
    const principal = roundCurrency(Math.max(0, paymentAmount - interest))

    // Calculate new remaining balance
    // For manual payments, only subtract the principal amount (not the full payment amount)
    // The interest portion doesn't reduce the remaining balance
    const newRemainingBalance = roundCurrency(Math.max(0, currentRemainingBalance - principal))
    const isPaidOff = newRemainingBalance <= 0

    // Determine if loan should be marked as completed
    const shouldMarkAsCompleted = mark_loan_as_paid === true && isPaidOff

    // Prepare loan update
    const loanUpdate: { remaining_balance: number; status?: string } = {
      remaining_balance: newRemainingBalance
    }

    // Mark loan as completed if requested and balance is 0
    if (shouldMarkAsCompleted) {
      loanUpdate.status = 'completed'
    }

    // Always create a new payment row for manual payments
    // Get the max payment number for this loan
    const { data: existingPayments } = await supabase
      .from('loan_payments')
      .select('payment_number')
      .eq('loan_id', loanId)
      .order('payment_number', { ascending: false })
      .limit(1)

    const maxPaymentNumber = existingPayments && existingPayments.length > 0
      ? ((existingPayments[0] as { payment_number: number | null })?.payment_number || 0)
      : 0

    // Create the manual payment with interest and principal breakdown
    const paymentInsert: LoanPaymentInsert = {
      loan_id: loanId,
      amount: paymentAmount,
      payment_date: formatDateLocal(paymentDate),
      status: 'manual',
      method: 'manual',
      payment_number: maxPaymentNumber + 1,
      interest: interest,
      principal: principal,
      remaining_balance: newRemainingBalance,
      notes: notes || `Manual payment created on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
    }

    // Use a transaction-like approach: update loan and create payment
    // First, update the loan's remaining balance (and status if needed)
    const { error: updateLoanError } = await (supabase
      .from('loans') as any)
      .update(loanUpdate)
      .eq('id', loanId)

    if (updateLoanError) {
      console.error('Error updating loan remaining balance:', updateLoanError)
      return NextResponse.json(
        { error: 'Failed to update loan remaining balance' },
        { status: 500 }
      )
    }

    // Then, create the new manual payment
    const { data: newPayment, error: paymentError } = await (supabase
      .from('loan_payments') as any)
      .insert(paymentInsert)
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      // Try to revert the loan update
      await (supabase
        .from('loans') as any)
        .update({
          remaining_balance: currentRemainingBalance,
          status: typedLoan.status // Revert status as well
        })
        .eq('id', loanId)

      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      )
    }

    // Recalculate future scheduled payments based on new remaining balance
    // Only recalculate if there are future payments and we have contract info
    if (typedLoan.application_id && newRemainingBalance > 0) {
      // Get contract to retrieve payment amount and frequency
      const contractResult = await getContractByApplicationId(typedLoan.application_id, true)
      
      if (contractResult.success && contractResult.data?.contract_terms) {
        const contractTerms = contractResult.data.contract_terms
        const scheduledPaymentAmount = Number(contractTerms.payment_amount || 0)
        const contractPaymentFrequency = (contractTerms.payment_frequency || paymentFrequency) as PaymentFrequency

        if (scheduledPaymentAmount > 0) {
          // Calculate the next day after manual payment for start date
          // Use parseLocalDate to avoid timezone shifts
          const nextDay = new Date(paymentDate)
          nextDay.setDate(nextDay.getDate() + 1)
          const nextDayStr = formatDateLocal(nextDay)

          // Get first future payment date to use as starting point for recalculation
          const { data: firstFuturePayment } = await supabase
            .from('loan_payments')
            .select('payment_date')
            .eq('loan_id', loanId)
            .gte('payment_date', nextDayStr)
            .in('status', ['pending', 'cancelled'])
            .order('payment_date', { ascending: true })
            .limit(1)
            .maybeSingle()

          // Use first future payment date if available, otherwise use next day
          // Use parseLocalDate and formatDateLocal to avoid timezone shifts
          const firstPaymentDateStr = firstFuturePayment
            ? formatDateLocal(parseLocalDate((firstFuturePayment as { payment_date: string }).payment_date))
            : nextDayStr

          // Recalculate payment schedule with new remaining balance
          const recalculationResult = recalculatePaymentSchedule({
            newRemainingBalance: newRemainingBalance,
            paymentAmount: scheduledPaymentAmount,
            paymentFrequency: contractPaymentFrequency,
            interestRate: interestRate,
            firstPaymentDate: firstPaymentDateStr,
            maxPeriods: 1000
          })

          const recalculatedBreakdown = recalculationResult.recalculatedBreakdown

          if (recalculatedBreakdown.length > 0) {
            // Use the helper function to update future payments
            const updateResult = await updateLoanPaymentsFromBreakdown(
              loanId,
              recalculatedBreakdown,
              nextDayStr // Only update payments on or after the day after manual payment
            )

            if (!updateResult.success && updateResult.errors.length > 0) {
              console.error('Error updating payments from breakdown:', updateResult.errors)
              // Don't fail the request, but log the errors
            }
          }
        } else {
          console.warn('Could not determine scheduled payment amount for recalculation')
        }
      } else {
        console.warn('Could not get contract terms for recalculation')
      }
    }

    const successMessage = shouldMarkAsCompleted
      ? `Manual payment of $${paymentAmount.toFixed(2)} created successfully. Loan marked as completed.`
      : `Manual payment of $${paymentAmount.toFixed(2)} created successfully. Remaining balance: $${newRemainingBalance.toFixed(2)}`

    return NextResponse.json({
      success: true,
      payment: newPayment,
      remaining_balance: newRemainingBalance,
      loan_status: shouldMarkAsCompleted ? 'completed' : typedLoan.status,
      message: successMessage
    })
  } catch (error: any) {
    console.error('Error creating manual payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

