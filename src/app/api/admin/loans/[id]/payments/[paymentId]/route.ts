import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { LoanPaymentUpdate } from '@/src/lib/supabase/types'
import { parseLocalDate } from '@/src/lib/utils/date'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/loans/[id]/payments/[paymentId]
 * Update a payment for a loan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  try {
    const { id: loanId, paymentId } = params

    if (!loanId || !paymentId) {
      return NextResponse.json(
        { error: 'Loan ID and Payment ID are required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const updates: LoanPaymentUpdate = {}

    // Validate and prepare updates
    if (body.amount !== undefined) {
      const amount = Number(body.amount)
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        )
      }
      updates.amount = amount
    }

    if (body.payment_date !== undefined) {
      // Validate date format using parseLocalDate to avoid timezone shifts
      const date = parseLocalDate(body.payment_date)
      if (isNaN(date.getTime())) {
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
      updates.payment_date = formatDateLocal(date)
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    // Verify payment belongs to loan
    const { data: payment, error: fetchError } = await supabase
      .from('loan_payments')
      .select('id, loan_id')
      .eq('id', paymentId)
      .eq('loan_id', loanId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found or does not belong to this loan' },
        { status: 404 }
      )
    }

    // Update payment
    const { data: updatedPayment, error: updateError } = await supabase
      .from('loan_payments')
      // @ts-ignore
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update payment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment
    })
  } catch (error: any) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

