import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentInsert, LoanPaymentUpdate, PaymentFrequency } from '@/src/lib/supabase/types'
import {
  validatePaymentAmount,
  calculateBreakdownUntilZero,
  roundCurrency,
  PAYMENT_FREQUENCY_CONFIG
} from '@/src/lib/loan'
import { getContractByApplicationId } from '@/src/lib/supabase/contract-helpers'
import { parseLocalDate } from '@/src/lib/utils/date'

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
      payment_date: paymentDate.toISOString(),
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
    // Use calculateBreakdownUntilZero to recalculate until balance reaches 0, keeping payment amount fixed
    const paymentDateStart = new Date(paymentDate)
    paymentDateStart.setHours(0, 0, 0, 0)
    const nextDay = new Date(paymentDateStart)
    nextDay.setDate(nextDay.getDate() + 1)

    // Get all future pending payments (after the manual payment date)
    const { data: futurePayments, error: futurePaymentsError } = await supabase
      .from('loan_payments')
      .select('id, payment_date, payment_number, amount, status')
      .eq('loan_id', loanId)
      .gte('payment_date', nextDay.toISOString())
      .eq('status', 'pending')
      .order('payment_date', { ascending: true })

    if (futurePaymentsError) {
      console.error('Error fetching future payments:', futurePaymentsError)
    }

    // Get scheduled payment amount from contract or first future payment (for recalculation)
    let scheduledPaymentAmount: number = 0
    if (typedLoan.application_id) {
      const contractResult = await getContractByApplicationId(typedLoan.application_id, true)
      if (contractResult.success && contractResult.data?.contract_terms?.payment_amount) {
        scheduledPaymentAmount = Number(contractResult.data.contract_terms.payment_amount)
      }
    }

    // If we couldn't get payment amount from contract, get it from the first future payment
    if (scheduledPaymentAmount === 0 && futurePayments && futurePayments.length > 0) {
      const firstPayment = futurePayments[0] as { amount: number }
      scheduledPaymentAmount = Number(firstPayment.amount)
    }

    // If still no payment amount, we can't recalculate
    if (scheduledPaymentAmount === 0) {
      console.warn('Could not determine scheduled payment amount for recalculation')
    } else if (futurePayments && futurePayments.length > 0 && typedLoan.application_id) {
      // Get contract to get payment frequency
      const contractResult = await getContractByApplicationId(typedLoan.application_id, true)
      if (contractResult.success && contractResult.data?.contract_terms) {
        const contractTerms = contractResult.data.contract_terms
        const contractPaymentFrequency = (contractTerms.payment_frequency || paymentFrequency) as PaymentFrequency

        // Get first future payment date
        const firstFuturePayment = futurePayments[0] as { payment_date: string }
        const firstPaymentDate = parseLocalDate(firstFuturePayment.payment_date)
        const firstPaymentDateStr = firstPaymentDate.toISOString().split('T')[0]

        // Recalculate payment schedule with new remaining balance using calculateBreakdownUntilZero
        // This keeps the scheduled payment amount fixed and continues until balance reaches 0
        const recalculatedBreakdown = calculateBreakdownUntilZero({
          startingBalance: newRemainingBalance,
          paymentAmount: scheduledPaymentAmount,
          paymentFrequency: contractPaymentFrequency,
          interestRate: interestRate,
          firstPaymentDate: firstPaymentDateStr,
          maxPeriods: 1000
        })

        if (recalculatedBreakdown.length > 0) {
          // Update existing future payments and insert new ones if needed
          const paymentsToUpdate: Array<{ id: string; update: LoanPaymentUpdate }> = []
          const paymentsToInsert: LoanPaymentInsert[] = []

          // Map existing future payments to recalculated breakdown
          for (let i = 0; i < Math.max(futurePayments.length, recalculatedBreakdown.length); i++) {
            const breakdownItem = recalculatedBreakdown[i]

            if (!breakdownItem) {
              // More existing payments than recalculated - mark extra as cancelled
              if (i < futurePayments.length) {
                const existingPayment = futurePayments[i] as { id: string }
                paymentsToUpdate.push({
                  id: existingPayment.id,
                  update: {
                    status: 'cancelled',
                    notes: 'Payment cancelled due to schedule recalculation after manual payment.'
                  }
                })
              }
              continue
            }

            if (i < futurePayments.length) {
              // Update existing payment
              const existingPayment = futurePayments[i] as { id: string; payment_number: number | null }
              paymentsToUpdate.push({
                id: existingPayment.id,
                update: {
                  payment_date: breakdownItem.dueDate,
                  amount: roundCurrency(breakdownItem.amount),
                  interest: roundCurrency(breakdownItem.interest),
                  principal: roundCurrency(breakdownItem.principal),
                  remaining_balance: roundCurrency(breakdownItem.remainingBalance),
                  status: 'pending',
                  notes: ''
                }
              })
            } else {
              // Insert new payment
              paymentsToInsert.push({
                loan_id: loanId,
                payment_date: breakdownItem.dueDate,
                amount: roundCurrency(breakdownItem.amount),
                interest: roundCurrency(breakdownItem.interest),
                principal: roundCurrency(breakdownItem.principal),
                remaining_balance: roundCurrency(breakdownItem.remainingBalance),
                payment_number: breakdownItem.paymentNumber,
                status: 'pending',
                notes: 'new payment'
              })
            }
          }

          // Update existing payments
          for (const { id, update } of paymentsToUpdate) {
            const { error: updateError } = await (supabase
              .from('loan_payments') as any)
              .update(update)
              .eq('id', id)

            if (updateError) {
              console.error(`Error updating payment ${id}:`, updateError)
            }
          }

          // Insert new payments if needed
          if (paymentsToInsert.length > 0) {
            const { error: insertError } = await (supabase
              .from('loan_payments') as any)
              .insert(paymentsToInsert)

            if (insertError) {
              console.error('Error inserting new payments:', insertError)
            }
          }
        } else {
          console.warn('No breakdown calculated for future payments')
        }
      } else {
        console.warn('Could not get contract terms for recalculation')
      }
    } else if (futurePayments && futurePayments.length === 0) {
      console.log('No future payments to recalculate')
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

