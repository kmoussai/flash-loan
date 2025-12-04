import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentInsert, PaymentFrequency } from '@/src/lib/supabase/types'
import {
  validatePaymentAmount,
  calculateNewBalance,
  calculatePaymentBreakdown,
  roundCurrency,
  PAYMENT_FREQUENCY_CONFIG
} from '@/src/lib/loan'
import { getContractByApplicationId } from '@/src/lib/supabase/contract-helpers'

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
    const paymentDate = new Date(payment_date)
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

    // Calculate new remaining balance using loan library
    const balanceResult = calculateNewBalance({
      currentBalance: currentRemainingBalance,
      paymentAmount: paymentAmount
    })
    const newRemainingBalance = balanceResult.newBalance

    // Determine if loan should be marked as completed
    const shouldMarkAsCompleted = mark_loan_as_paid === true && balanceResult.isPaidOff

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
    // Get future scheduled payments that need recalculation (exclude the payment date itself)
    const paymentDateStart = new Date(paymentDate)
    paymentDateStart.setHours(0, 0, 0, 0)
    const nextDay = new Date(paymentDateStart)
    nextDay.setDate(nextDay.getDate() + 1)

    const { data: futurePayments, error: futurePaymentsError } = await supabase
      .from('loan_payments')
      .select('id, payment_date, payment_number, amount')
      .eq('loan_id', loanId)
      .gte('payment_date', nextDay.toISOString()) // Get payments after the manual payment date
      .in('status', ['pending', 'confirmed', 'failed', 'deferred']) // Removed 'scheduled' as it's not a valid status
      .order('payment_date', { ascending: true })

    if (futurePaymentsError) {
      console.error('Error fetching future payments:', futurePaymentsError)
    }

    if (futurePayments && futurePayments.length > 0 && typedLoan.application_id) {
      // Get contract to get original loan terms
      const contractResult = await getContractByApplicationId(typedLoan.application_id, true)
      if (contractResult.success && contractResult.data?.contract_terms) {
        const contractTerms = contractResult.data.contract_terms
        const contractPaymentFrequency = (contractTerms.payment_frequency || paymentFrequency) as PaymentFrequency

        // Get first future payment date
        const firstFuturePayment = futurePayments[0] as { id: string; payment_date: string; payment_number: number | null; amount: number }
        const firstPaymentDate = firstFuturePayment.payment_date.split('T')[0]

        // Recalculate payment schedule from the new remaining balance
        // Use the new remaining balance as the principal for recalculation
        // Note: We need to account for fees that were already included in the original loan
        // For recalculation, we'll use the new remaining balance as the base
        const recalculatedBreakdown = calculatePaymentBreakdown(
          {
            principalAmount: newRemainingBalance, // Use new remaining balance as principal
            interestRate: interestRate,
            paymentFrequency: contractPaymentFrequency,
            numberOfPayments: futurePayments.length, // Recalculate for remaining payments
            brokerageFee: 0, // Fees already included in remaining balance
            originationFee: 0 // Fees already included in remaining balance
          },
          firstPaymentDate // Use first future payment date
        )

        if (recalculatedBreakdown.length > 0) {
          // Update future payments with recalculated amounts
          const updatePromises = futurePayments.map((futurePayment, index) => {
            const payment = futurePayment as { id: string; payment_date: string; payment_number: number | null; amount: number }
            const breakdown = recalculatedBreakdown[index]
            if (breakdown) {
              const newAmount = roundCurrency(breakdown.amount)
              const newInterest = roundCurrency(breakdown.interest)
              const newPrincipal = roundCurrency(breakdown.principal)

              console.log(`Updating payment ${payment.id}: amount ${payment.amount} -> ${newAmount}, interest -> ${newInterest}, principal -> ${newPrincipal}`)

              return (supabase
                .from('loan_payments') as any)
                .update({
                  amount: newAmount,
                  interest: newInterest,
                  principal: newPrincipal
                })
                .eq('id', payment.id)
            }
            return Promise.resolve({ error: null, data: null })
          })

          // Execute all updates and check for errors
          const updateResults = await Promise.allSettled(updatePromises)
          updateResults.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`Error updating payment ${index}:`, result.reason)
            } else if (result.value?.error) {
              console.error(`Error updating payment ${index}:`, result.value.error)
            }
          })
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

