import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentInsert } from '@/src/lib/supabase/types'
import { calculatePaymentAmount, calculatePaymentBreakdown } from '@/src/lib/utils/loan'
import { buildSchedule } from '@/src/lib/utils/schedule'
import { PaymentFrequency } from '@/src/types'
import { addDays, addMonths } from 'date-fns'

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
      const paymentDate = new Date(p.payment_date)
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
        const paymentDate = new Date(p.payment_date)
        paymentDate.setHours(0, 0, 0, 0)
        return paymentDate < today
      })()
    )

    // Calculate failed payment fees: flat fee (origination_fee) + interest from each failed payment
    const failedPaymentFeesAndInterest = failedPayments.reduce((sum: number, p: any) => {
      const flatFee = originationFee // 55 from contract terms
      const paymentInterest = Number(p.interest || 0) // Interest that was supposed to be paid by this payment
      return sum + flatFee + paymentInterest
    }, 0)

    // Calculate new remaining balance: remaining_balance + brokerage_fee + failed_payment_fees_and_interest
    const currentRemainingBalance = Number(typedLoan.remaining_balance || 0)
    const totalBalance = currentRemainingBalance + brokerageFee + failedPaymentFeesAndInterest

    // Validate payment amount calculation
    const calculatedPaymentAmount = calculatePaymentAmount(
      payment_frequency as PaymentFrequency,
      totalBalance,
      interestRate,
      number_of_payments
    )

    if (!calculatedPaymentAmount) {
      return NextResponse.json(
        { error: 'Failed to calculate payment amount with given parameters' },
        { status: 400 }
      )
    }

    // Validate provided payment amount matches calculated (allow small difference)
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

    // Delete future payments
    if (futurePayments.length > 0) {
      const futurePaymentIds = futurePayments.map((p: any) => p.id)
      const { error: deleteError } = await supabase
        .from('loan_payments')
        .delete()
        .in('id', futurePaymentIds)

      if (deleteError) {
        console.error('Error deleting future payments:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete future payments' },
          { status: 500 }
        )
      }
    }

    // Build new payment schedule (use provided schedule if available, otherwise build from params)
    let schedule: Array<{ due_date: string; amount: number; interest?: number; principal?: number }>
    
    // Calculate payment breakdown (interest and principal for each payment)
    const paymentBreakdown = calculatePaymentBreakdown(
      totalBalance,
      Number(payment_amount),
      interestRate,
      payment_frequency as PaymentFrequency,
      number_of_payments
    )
    
    if (payment_schedule && Array.isArray(payment_schedule) && payment_schedule.length > 0) {
      // Use provided edited schedule from user, but include calculated breakdown
      schedule = payment_schedule.map((item: any, index: number) => ({
        due_date: item.due_date,
        amount: Number(item.amount),
        interest: paymentBreakdown[index]?.interest,
        principal: paymentBreakdown[index]?.principal
      }))
    } else {
      // Build schedule from parameters
      const builtSchedule = buildSchedule({
        paymentAmount: Number(payment_amount),
        paymentFrequency: payment_frequency as PaymentFrequency,
        numberOfPayments: number_of_payments,
        nextPaymentDate: start_date
      })

      if (builtSchedule.length === 0) {
        return NextResponse.json(
          { error: 'Failed to build payment schedule' },
          { status: 400 }
        )
      }

      // Add interest and principal breakdown to schedule
      schedule = builtSchedule.map((item, index) => ({
        ...item,
        interest: paymentBreakdown[index]?.interest,
        principal: paymentBreakdown[index]?.principal
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

    // Create new payments with calculated interest and principal
    const newPayments: LoanPaymentInsert[] = schedule.map((item, index) => ({
      loan_id: loanId,
      amount: item.amount,
      payment_date: item.due_date,
      status: 'pending',
      method: null,
      payment_number: maxPaymentNumber + index + 1,
      interest: item.interest ?? null, // Calculated interest for this payment
      principal: item.principal ?? null, // Calculated principal for this payment
      notes: `Payment ${maxPaymentNumber + index + 1} - Modified on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
    }))

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


    return NextResponse.json({
      success: true,
      message: `Loan payment schedule modified successfully. ${futurePayments.length} payment(s) deleted, ${newPayments.length} new payment(s) created.`,
      deleted_payments: futurePayments.length,
      created_payments: newPayments.length,
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

