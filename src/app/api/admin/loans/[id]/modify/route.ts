import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { PaymentFrequency } from '@/src/lib/supabase/types'
import { 
  calculatePaymentAmount, 
  calculateFailedPaymentFees,
  recalculatePaymentSchedule,
  roundCurrency,
  type PaymentBreakdown
} from '@/src/lib/loan'
import { parseLocalDate } from '@/src/lib/utils/date'
import { updateLoanPaymentsFromBreakdown } from '@/src/lib/supabase/payment-schedule-helpers'
import { handleScheduleRecalculationForZumRails } from '@/src/lib/payment-providers/zumrails'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/loans/[id]/modify
 * Modify loan payment schedule: update payment amount, frequency, or stop/start payments
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
    const { 
      payment_amount, 
      payment_frequency, 
      number_of_payments,
      start_date,
      payment_schedule, // Optional: edited schedule from user
      action // 'modify' | 'stop'
    } = body

    const supabase = await createServerSupabaseAdminClient()

    // Get loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        remaining_balance,
        principal_amount,
        interest_rate,
        status
      `)
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Get contract separately to access fees and current terms
    const { data: contracts } = await supabase
      .from('loan_contracts')
      .select('id, contract_terms')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false })
      .limit(1)

    const typedLoan = loan as any
    const contract = (Array.isArray(contracts) && contracts.length > 0
      ? contracts[0]
      : null) as { id: string; contract_terms: any } | null

    const contractTerms = contract?.contract_terms || {}
    const fees = contractTerms.fees || {}
    const brokerageFee = fees.brokerage_fee || 0
    const originationFee = fees.origination_fee || 55 // Failed payment fee
    const interestRate = typedLoan.interest_rate || 29

    // Get all payments
    const { data: allPayments, error: paymentsError } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: true })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      )
    }

    const payments = allPayments || []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Identify future payments: payment_date >= today OR (past date with pending/failed status)
    const futurePayments = payments.filter((p: any) => {
      const paymentDate = parseLocalDate(p.payment_date)
      paymentDate.setHours(0, 0, 0, 0)
      const isFutureDate = paymentDate >= today
      const isPendingOrFailed = ['pending', 'failed'].includes(p.status) && paymentDate < today
      return isFutureDate || isPendingOrFailed
    })

    // Handle STOP action
    if (action === 'stop') {
      if (futurePayments.length === 0) {
        return NextResponse.json(
          { error: 'No future payments to stop' },
          { status: 400 }
        )
      }

      // Update future payments to cancelled status with note
      const stopNote = `Payment stopped on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`

      const updatePromises = futurePayments.map((p: any) => {
        const existingNotes = p.notes || ''
        const updatedNotes = existingNotes
          ? `${existingNotes}\n${stopNote}`
          : stopNote

        return (supabase
          .from('loan_payments') as any)
          .update({
            status: 'cancelled',
            notes: updatedNotes
          })
          .eq('id', p.id)
      })

      const updateResults = await Promise.all(updatePromises)
      const updateErrors = updateResults.filter(r => r.error)

      if (updateErrors.length > 0) {
        console.error('Error cancelling future payments:', updateErrors)
        return NextResponse.json(
          { error: 'Failed to stop some payments' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Stopped ${futurePayments.length} future payment(s)`,
        cancelled_payments: futurePayments.length
      })
    }

    // Handle MODIFY action (default)
    if (action !== 'stop') {
      if (!payment_amount || !payment_frequency || !number_of_payments || !start_date) {
        return NextResponse.json(
          { error: 'Payment amount, frequency, number of payments, and start date are required' },
          { status: 400 }
        )
      }
    }

    // Calculate failed payment fees and interest
    const confirmedPayments = payments.filter((p: any) => 
      ['confirmed', 'paid'].includes(p.status)
    )
    const failedPayments = payments.filter((p: any) => 
      p.status === 'failed' && (() => {
        const paymentDate = parseLocalDate(p.payment_date)
        paymentDate.setHours(0, 0, 0, 0)
        return paymentDate < today
      })()
    )

    // Calculate failed payment fees using loan library
    const failedPaymentResult = calculateFailedPaymentFees({
      failedPayments: failedPayments.map((p: any) => ({
        amount: Number(p.amount || 0),
        interest: Number(p.interest || 0),
        paymentDate: p.payment_date
      })),
      originationFee: originationFee
    })

    // Calculate modification balance
    // Note: remaining_balance already includes brokerage fee (set during contract generation)
    // So we should NOT add brokerage fee again - only add failed payment fees
    const currentRemainingBalance = roundCurrency(Number(typedLoan.remaining_balance || 0))
    const totalBalance = currentRemainingBalance + failedPaymentResult.totalAmount

    // Validate payment amount is positive
    const paymentAmount = Number(payment_amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be a positive number' },
        { status: 400 }
      )
    }

    // Recalculate payment schedule with the provided payment amount
    // This allows users to modify the payment amount and recalculate the breakdown
    // The breakdown will be calculated based on the provided payment amount
    const recalculationResult = recalculatePaymentSchedule({
      newRemainingBalance: totalBalance,
      paymentAmount: paymentAmount,
      paymentFrequency: payment_frequency as PaymentFrequency,
      interestRate: interestRate,
      firstPaymentDate: start_date,
      maxPeriods: number_of_payments || 1000
    })

    const recalculatedBreakdown = recalculationResult.recalculatedBreakdown

    if (!recalculatedBreakdown || recalculatedBreakdown.length === 0) {
      return NextResponse.json(
        { error: 'Failed to recalculate payment schedule' },
        { status: 400 }
      )
    }

    // If user provided a custom schedule, merge it with the calculated breakdown
    // This allows users to edit dates/amounts while keeping calculated interest/principal
    let finalBreakdown: PaymentBreakdown[] = recalculatedBreakdown
    
    if (payment_schedule && Array.isArray(payment_schedule) && payment_schedule.length > 0) {
      // Merge user-provided schedule with calculated breakdown
      finalBreakdown = payment_schedule.map((item: any, index: number): PaymentBreakdown => {
        const calculatedItem = recalculatedBreakdown[index]
        if (calculatedItem) {
          return {
            ...calculatedItem,
            dueDate: item.due_date || calculatedItem.dueDate,
            amount: roundCurrency(Number(item.amount || calculatedItem.amount))
          }
        }
        // If no calculated item, create one from user input
        return {
          paymentNumber: index + 1,
          dueDate: item.due_date,
          amount: roundCurrency(Number(item.amount)),
          interest: roundCurrency(Number(item.interest || 0)),
          principal: roundCurrency(Number(item.principal || 0)),
          remainingBalance: roundCurrency(Number(item.remaining_balance || 0))
        }
      })
    }

    // Use the helper function to update payments
    // This will automatically:
    // - Preserve deferred/manual/paid payments
    // - Update future pending payments by index
    // - Create new payments as needed
    // - Cancel extra payments
    const updateResult = await updateLoanPaymentsFromBreakdown(
      loanId,
      finalBreakdown,
      start_date // Only update payments on or after the start date
    )

    if (!updateResult.success && updateResult.errors.length > 0) {
      console.error('Error updating payments from breakdown:', updateResult.errors)
      // Don't fail the request, but log the errors
    }

    // Handle ZumRails transactions - cancel old ones and create new ones (non-blocking)
    // Run in background without blocking the response
    handleScheduleRecalculationForZumRails({
      loanId: loanId,
      reason: `Payment schedule recalculated after loan modification. Payment amount: ${paymentAmount.toFixed(2)}, frequency: ${payment_frequency}, start date: ${start_date}`
    })
      .then((zumRailsResult) => {
        if (!zumRailsResult.success) {
          console.warn('[Modify Loan] ZumRails transaction handling completed with warnings:', {
            cancelled: zumRailsResult.cancelled.count,
            created: zumRailsResult.created.created,
            errors: [...zumRailsResult.cancelled.errors, ...zumRailsResult.created.errors.map(e => e.error)]
          })
        } else {
          console.log('[Modify Loan] ZumRails transactions handled:', {
            cancelled: zumRailsResult.cancelled.count,
            created: zumRailsResult.created.created
          })
        }
      })
      .catch((zumRailsError: any) => {
        console.error('[Modify Loan] Error handling ZumRails transactions:', zumRailsError)
      })

    // Update loan's remaining balance to the new total balance
    // This reflects the balance that will be amortized over the new payment schedule
    const { error: updateLoanError } = await (supabase
      .from('loans') as any)
      .update({
        remaining_balance: roundCurrency(totalBalance)
      })
      .eq('id', loanId)

    if (updateLoanError) {
      console.error('Error updating loan remaining balance:', updateLoanError)
      // Don't fail the request, but log the error
      // The payments were created successfully, so we continue
    }

    // Update contract's payment frequency if contract exists
    if (contract) {
      const updatedContractTerms = {
        ...contractTerms,
        payment_frequency: payment_frequency,
        payment_amount: Number(payment_amount),
        number_of_payments: number_of_payments
      }

      const { error: updateContractError } = await (supabase
        .from('loan_contracts') as any)
        .update({
          contract_terms: updatedContractTerms
        })
        .eq('id', contract.id)

      if (updateContractError) {
        console.error('Error updating contract terms:', updateContractError)
        // Don't fail the request, but log the error
        // The payments were updated successfully, so we continue
      }
    }

    return NextResponse.json({
      success: true,
      message: `Loan payment schedule modified successfully. ${updateResult.updatedCount} payment(s) updated, ${updateResult.insertedCount} new payment(s) created, ${updateResult.cancelledCount} payment(s) cancelled.`,
      updated_payments: updateResult.updatedCount,
      created_payments: updateResult.insertedCount,
      cancelled_payments: updateResult.cancelledCount,
      total_balance: totalBalance,
      payment_amount: Number(payment_amount),
      payment_frequency: payment_frequency,
      number_of_payments: number_of_payments,
      recalculated_breakdown: finalBreakdown
    })
  } catch (error: any) {
    console.error('Error modifying loan:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

