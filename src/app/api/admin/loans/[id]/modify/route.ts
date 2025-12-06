import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentInsert, PaymentFrequency } from '@/src/lib/supabase/types'
import { 
  calculatePaymentAmount, 
  calculatePaymentBreakdown,
  calculateFailedPaymentFees,
  calculateModificationBalance,
  roundCurrency
} from '@/src/lib/loan'
import { parseLocalDate } from '@/src/lib/utils/date'

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

    // Validate payment amount calculation using loan library
    const calculatedPaymentAmount = calculatePaymentAmount({
      principalAmount: totalBalance,
      interestRate: interestRate,
      paymentFrequency: payment_frequency as PaymentFrequency,
      numberOfPayments: number_of_payments,
      brokerageFee: 0, // Fees already included in totalBalance
      originationFee: 0 // Fees already included in totalBalance
    })

    if (!calculatedPaymentAmount) {
      return NextResponse.json(
        { error: 'Failed to calculate payment amount with given parameters' },
        { status: 400 }
      )
    }

    // Validate provided payment amount matches calculated (allow small difference)
    if (calculatedPaymentAmount) {
      const paymentAmountDiff = Math.abs(Number(payment_amount) - calculatedPaymentAmount)
      if (paymentAmountDiff > 0.01) {
        return NextResponse.json(
          { 
            error: `Payment amount mismatch. Calculated: $${calculatedPaymentAmount.toFixed(2)}, provided: $${Number(payment_amount).toFixed(2)}`,
            calculated_amount: calculatedPaymentAmount
          },
          { status: 400 }
        )
      }
    }

    // Build new payment schedule (use provided schedule if available, otherwise build from params)
    let schedule: Array<{ due_date: string; amount: number; interest?: number; principal?: number; remaining_balance?: number }>
    
    // Calculate payment breakdown using loan library
    const paymentBreakdown = calculatePaymentBreakdown(
      {
        principalAmount: totalBalance,
        interestRate: interestRate,
        paymentFrequency: payment_frequency as PaymentFrequency,
        numberOfPayments: number_of_payments,
        brokerageFee: 0, // Fees already included in totalBalance
        originationFee: 0 // Fees already included in totalBalance
      },
      start_date
    )

    if (!paymentBreakdown || paymentBreakdown.length === 0) {
      return NextResponse.json(
        { error: 'Failed to calculate payment breakdown' },
        { status: 400 }
      )
    }
    
    if (payment_schedule && Array.isArray(payment_schedule) && payment_schedule.length > 0) {
      // Use provided edited schedule from user, but include calculated breakdown
      schedule = payment_schedule.map((item: any, index: number) => ({
        due_date: item.due_date,
        amount: roundCurrency(Number(item.amount)),
        interest: paymentBreakdown[index] ? roundCurrency(paymentBreakdown[index].interest) : undefined,
        principal: paymentBreakdown[index] ? roundCurrency(paymentBreakdown[index].principal) : undefined,
        remaining_balance: paymentBreakdown[index] ? roundCurrency(paymentBreakdown[index].remainingBalance) : undefined
      }))
    } else {
      // Use breakdown from loan library (includes dates and amounts)
      schedule = paymentBreakdown.map((item) => ({
        due_date: item.dueDate,
        amount: roundCurrency(item.amount),
        interest: roundCurrency(item.interest),
        principal: roundCurrency(item.principal),
        remaining_balance: roundCurrency(item.remainingBalance)
      }))
    }

    if (schedule.length === 0) {
      return NextResponse.json(
        { error: 'Payment schedule is required' },
        { status: 400 }
      )
    }

    // Get max payment number from existing confirmed/paid payments
    const existingConfirmedPayments = payments.filter((p: any) => 
      ['confirmed', 'paid', 'manual', 'rebate'].includes(p.status)
    )
    const maxPaymentNumber = existingConfirmedPayments.length > 0
      ? Math.max(...existingConfirmedPayments.map((p: any) => p.payment_number || 0))
      : 0

    // Get existing future payments and map them by payment_number
    const existingFuturePaymentsMap = new Map(
      futurePayments.map((p: any) => [p.payment_number, p])
    )

    const newPayments: LoanPaymentInsert[] = []
    const paymentsToUpdate: Array<{ id: string; updates: Partial<LoanPaymentInsert> }> = []
    const paymentNumbersToKeep = new Set<number>()

    // Process each payment in the new schedule
    schedule.forEach((item, index) => {
      const paymentNumber = maxPaymentNumber + index + 1
      paymentNumbersToKeep.add(paymentNumber)

      const paymentData: Partial<LoanPaymentInsert> = {
        payment_date: item.due_date,
        amount: item.amount,
        payment_number: paymentNumber,
        status: 'pending',
        interest: item.interest ?? null,
        principal: item.principal ?? null,
        remaining_balance: item.remaining_balance ?? null,
        notes: `Payment ${paymentNumber} - Modified on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
      }

      const existingPayment = existingFuturePaymentsMap.get(paymentNumber)
      if (existingPayment) {
        // Update existing payment
        paymentsToUpdate.push({
          id: existingPayment.id,
          updates: paymentData
        })
      } else {
        // Insert new payment
        newPayments.push({
          loan_id: loanId,
          ...paymentData
        } as LoanPaymentInsert)
      }
    })

    // Update existing payments
    const updatePromises = paymentsToUpdate.map(({ id, updates }) =>
      (supabase.from('loan_payments') as any)
        .update(updates)
        .eq('id', id)
    )
    const updateResults = await Promise.allSettled(updatePromises)
    updateResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error updating payment ${paymentsToUpdate[index]?.id}:`, result.reason)
      } else if (result.value?.error) {
        console.error(`Error updating payment ${paymentsToUpdate[index]?.id}:`, result.value.error)
      }
    })

    // Insert new payments
    if (newPayments.length > 0) {
      const { error: insertError } = await (supabase
        .from('loan_payments') as any)
        .insert(newPayments)

      if (insertError) {
        console.error('Error creating new payments:', insertError)
        return NextResponse.json(
          { error: 'Failed to create new payment schedule' },
          { status: 500 }
        )
      }
    }

    // Delete payments that are no longer in the schedule
    const paymentsToDelete = futurePayments.filter(
      (p: any) => !paymentNumbersToKeep.has(p.payment_number)
    )

    if (paymentsToDelete.length > 0) {
      const paymentIdsToDelete = paymentsToDelete.map((p: any) => p.id)
      const { error: deleteError } = await supabase
        .from('loan_payments')
        .delete()
        .in('id', paymentIdsToDelete)

      if (deleteError) {
        console.error('Error deleting extra payments:', deleteError)
        // Don't fail the request, but log the error
      }
    }

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

    return NextResponse.json({
      success: true,
      message: `Loan payment schedule modified successfully. ${paymentsToUpdate.length} payment(s) updated, ${newPayments.length} new payment(s) created, ${paymentsToDelete.length} payment(s) deleted.`,
      updated_payments: paymentsToUpdate.length,
      created_payments: newPayments.length,
      deleted_payments: paymentsToDelete.length,
      total_balance: totalBalance,
      payment_amount: Number(payment_amount),
      payment_frequency: payment_frequency,
      number_of_payments: number_of_payments
    })
  } catch (error: any) {
    console.error('Error modifying loan:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

