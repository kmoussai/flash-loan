'use client'

import { useState, useEffect } from 'react'
import DatePicker from '@/src/app/[locale]/components/DatePicker'
import {
  validatePaymentAmount,
  calculateNewBalance,
  roundCurrency
} from '@/src/lib/loan'

interface ManualPaymentModalProps {
  loanId: string
  applicationId?: string
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  remainingBalance?: number
}

export default function ManualPaymentModal({
  loanId,
  applicationId,
  open,
  onClose,
  onSuccess,
  remainingBalance
}: ManualPaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [markAsPaid, setMarkAsPaid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate if payment would bring balance to 0 using loan library
  const wouldBalanceBeZero = remainingBalance !== undefined && 
    amount && 
    !isNaN(Number(amount)) && 
    (() => {
      const paymentAmt = roundCurrency(Number(amount))
      const balanceResult = calculateNewBalance({
        currentBalance: remainingBalance,
        paymentAmount: paymentAmt
      })
      return balanceResult.isPaidOff
    })()

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      // Save current overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow
      // Disable scrolling
      document.body.style.overflow = 'hidden'
      // Re-enable scrolling when modal closes
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!paymentDate) {
      setError('Payment date is required')
      return
    }

    const paymentAmount = roundCurrency(Number(amount))
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError('Valid payment amount is required')
      return
    }

    // Validate payment amount using loan library
    if (remainingBalance !== undefined) {
      const validationError = validatePaymentAmount(paymentAmount, remainingBalance)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/loans/${loanId}/payments/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_date: paymentDate,
          amount: Number(amount),
          notes: notes.trim() || undefined,
          mark_loan_as_paid: markAsPaid
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create manual payment')
      }

      // Reset form
      setPaymentDate(new Date().toISOString().split('T')[0])
      setAmount('')
      setNotes('')
      setMarkAsPaid(false)
      setError(null)

      // Refresh payment list
      await onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setPaymentDate(new Date().toISOString().split('T')[0])
      setAmount('')
      setNotes('')
      setMarkAsPaid(false)
      setError(null)
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4 overflow-y-auto'>
      <div className='w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl my-auto'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <h3 className='text-lg font-semibold text-gray-900'>
            Add Manual Payment
          </h3>
          <button
            type='button'
            onClick={handleClose}
            disabled={isSubmitting}
            className='rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='Close manual payment modal'
          >
            <svg
              className='h-5 w-5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='px-6 py-5'>
          {error && (
            <div className='mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600'>
              {error}
            </div>
          )}

          {remainingBalance !== undefined && typeof remainingBalance === 'number' && (
            <div className='mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800'>
              <span className='font-medium'>Remaining Balance:</span>{' '}
              ${remainingBalance.toFixed(2)}
            </div>
          )}

          <div className='space-y-4'>
            <div>
              <label
                htmlFor='manual-payment-date'
                className='mb-1 block text-sm font-medium text-gray-700'
              >
                Payment Date <span className='text-red-500'>*</span>
              </label>
              <DatePicker
                id='manual-payment-date'
                value={paymentDate}
                onChange={date => setPaymentDate(date || '')}
                disabled={isSubmitting}
                required
                placeholder='Select payment date'
                minDate={(() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return today
                })()}
                className='w-full'
              />
            </div>

            <div>
              <label
                htmlFor='manual-payment-amount'
                className='mb-1 block text-sm font-medium text-gray-700'
              >
                Amount (CAD) <span className='text-red-500'>*</span>
              </label>
              <input
                id='manual-payment-amount'
                type='number'
                step='0.01'
                min='0.01'
                max={remainingBalance}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={isSubmitting}
                required
                placeholder='0.00'
                className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-2'
              />
              {remainingBalance !== undefined && typeof remainingBalance === 'number' && (
                <p className='mt-1 text-xs text-gray-500'>
                  Maximum: ${remainingBalance.toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='manual-payment-notes'
                className='mb-1 block text-sm font-medium text-gray-700'
              >
                Notes (Optional)
              </label>
              <textarea
                id='manual-payment-notes'
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder='Add any notes about this manual payment...'
                className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-2'
              />
            </div>

            {wouldBalanceBeZero && (
              <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
                <label className='flex cursor-pointer items-start gap-3'>
                  <input
                    type='checkbox'
                    checked={markAsPaid}
                    onChange={e => setMarkAsPaid(e.target.checked)}
                    disabled={isSubmitting}
                    className='mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500'
                  />
                  <div className='flex-1'>
                    <div className='text-sm font-medium text-green-900'>
                      Mark Loan as Paid/Completed
                    </div>
                    <div className='mt-1 text-xs text-green-700'>
                      This payment will bring the remaining balance to $0.00. Check this box to mark the loan as completed.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4'>
            <button
              type='button'
              onClick={handleClose}
              disabled={isSubmitting}
              className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSubmitting || !paymentDate || !amount}
              className='rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isSubmitting ? 'Creating...' : 'Create Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

