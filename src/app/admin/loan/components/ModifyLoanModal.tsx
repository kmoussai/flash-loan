'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Select from '@/src/app/[locale]/components/Select'
import DatePicker from '@/src/app/[locale]/components/DatePicker'
import { PaymentFrequency } from '@/src/types'
import { frequencyOptions } from '@/src/lib/utils/schedule'
import {
  calculatePaymentAmount,
  calculatePaymentBreakdown,
  calculateFailedPaymentFees,
  calculateModificationBalance,
  calculateBreakdownUntilZero,
  roundCurrency
} from '@/src/lib/loan'
import { getCanadianHolidays, parseLocalDate } from '@/src/lib/utils/date'

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * Avoids timezone issues that occur with toISOString()
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
import useSWR from 'swr'
import { fetcher } from '@/lib/utils'
import { formatCurrency, formatDate } from '../[id]/utils'
import EditablePaymentScheduleList from '@/src/app/[locale]/components/EditablePaymentScheduleList'
import { PayementScheduleItem } from '@/src/types'

interface ModifyLoanModalProps {
  loanId: string
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  loan: any // Loan data with contract info
}

export default function ModifyLoanModal({
  loanId,
  open,
  onClose,
  onSuccess,
  loan
}: ModifyLoanModalProps) {
  // Prevent opening modal for completed loans
  useEffect(() => {
    if (open && loan?.status === 'completed') {
      onClose()
    }
  }, [open, loan?.status, onClose])

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
  const [action, setAction] = useState<'modify' | 'stop'>('modify')
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('')
  const [debouncedPaymentAmount, setDebouncedPaymentAmount] = useState<number | ''>('')
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>('monthly')
  const [numberOfPayments, setNumberOfPayments] = useState<number>(0)
  // Initialize startDate to tomorrow by default
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return formatLocalDate(tomorrow)
  })
  const [paymentSchedule, setPaymentSchedule] = useState<
    PayementScheduleItem[]
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{
    updatedCount: number
    createdCount: number
    deletedCount: number
    totalBalance: number
  } | null>(null)
  // Track if payment amount was manually set by user (vs auto-calculated)
  const [isPaymentAmountManual, setIsPaymentAmountManual] = useState(false)

  // Fetch payments to determine future payments count
  const { data: paymentsData } = useSWR(
    open ? `/api/admin/loans/${loanId}/payments` : null,
    fetcher
  )

  const payments = paymentsData || []

  // Memoize today to avoid recreating on every render
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const futurePaymentsCount = useMemo(() => {
    return payments.filter((p: any) => {
      const paymentDate = parseLocalDate(p.payment_date)
      paymentDate.setHours(0, 0, 0, 0)
      const isFutureDate = paymentDate >= today
      const isPendingOrFailed =
        ['pending', 'failed'].includes(p.status) && paymentDate < today
      return isFutureDate || isPendingOrFailed
    }).length
  }, [payments, today])

  // Memoize contract terms to prevent infinite loops
  // Use stable references - check if loan_contracts array exists and has items
  const hasContracts = useMemo(() => {
    return Array.isArray(loan?.loan_contracts) && loan.loan_contracts.length > 0
  }, [loan?.loan_contracts?.length])

  const contract = useMemo(() => {
    if (!hasContracts) return null
    return loan.loan_contracts[0]
  }, [hasContracts, loan?.loan_contracts?.[0]])

  // Use stable empty object reference
  const EMPTY_OBJECT = useMemo(() => ({}), [])
  const EMPTY_FEES = useMemo(() => ({}), [])

  const contractTerms = useMemo(() => {
    if (!contract?.contract_terms) return EMPTY_OBJECT
    return contract.contract_terms
  }, [contract?.contract_terms, EMPTY_OBJECT])

  const fees = useMemo(() => {
    if (!contractTerms.fees) return EMPTY_FEES
    return contractTerms.fees
  }, [contractTerms.fees, EMPTY_FEES])

  const brokerageFee = useMemo(() => {
    return fees.brokerage_fee || 0
  }, [fees.brokerage_fee])

  const interestRate = loan?.interest_rate || 29

  // Extract contract term values to use as stable dependencies
  const contractPaymentFrequency = useMemo(() => {
    if (contractTerms?.payment_frequency) {
      return contractTerms.payment_frequency as PaymentFrequency
    }
    return 'monthly' as PaymentFrequency
  }, [contractTerms?.payment_frequency])
  const contractPaymentAmount = useMemo(
    () => contractTerms.payment_amount || 0,
    [contractTerms.payment_amount]
  )
  const contractNumberOfPayments = useMemo(
    () => contractTerms.number_of_payments || 0,
    [contractTerms.number_of_payments]
  )

  // Initialize form with current loan data when modal opens
  useEffect(() => {
    if (!open || !loan) return

    // Always set frequency from contract, defaulting to monthly if not available
    // Validate that the frequency is a valid option value
    const validFrequency: PaymentFrequency = (
      ['weekly', 'bi-weekly', 'twice-monthly', 'monthly'].includes(
        contractPaymentFrequency
      )
        ? contractPaymentFrequency
        : 'monthly'
    ) as PaymentFrequency
    setPaymentFrequency(validFrequency)
    setPaymentAmount(contractPaymentAmount)
    setDebouncedPaymentAmount(contractPaymentAmount)
    setNumberOfPayments(contractNumberOfPayments)
    setIsPaymentAmountManual(false) // Contract amount is considered auto-calculated initially
    setAction('modify')
    setPreviewData(null)
    setError(null)
    setPaymentSchedule([])

    // Set default start date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    setStartDate(formatLocalDate(tomorrow))
  }, [
    open,
    loan?.id,
    contractPaymentFrequency,
    contractPaymentAmount,
    contractNumberOfPayments
  ])

  // Memoize failed payments calculation to avoid recreating on every render
  const failedPayments = useMemo(() => {
    return payments.filter(
      (p: any) =>
        p.status === 'failed' &&
        (() => {
          const paymentDate = parseLocalDate(p.payment_date)
          paymentDate.setHours(0, 0, 0, 0)
          return paymentDate < today
        })()
    )
  }, [payments, today])

  // Memoize origination fee
  const originationFee = useMemo(
    () => fees.origination_fee || 55,
    [fees.origination_fee]
  )

  // Calculate total balance (used in multiple effects)
  const totalBalance = useMemo(() => {
    const remainingBalance = Number(loan?.remaining_balance || 0)
    const failedPaymentResult = calculateFailedPaymentFees({
      failedPayments: failedPayments.map((p: any) => ({
        amount: Number(p.amount || 0),
        interest: Number(p.interest || 0),
        paymentDate: p.payment_date
      })),
      originationFee: originationFee
    })
    return remainingBalance + failedPaymentResult.totalAmount
  }, [loan?.remaining_balance, failedPayments, originationFee])

  // Debounce payment amount changes (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPaymentAmount(paymentAmount)
    }, 500)

    return () => clearTimeout(timer)
  }, [paymentAmount])

  // Unified recalculation effect: handles all parameter changes
  // Recalculates payment amount, number of payments, and breakdown based on what changed
  useEffect(() => {
    if (action !== 'modify' || !startDate || !paymentFrequency || totalBalance <= 0) {
      return
    }

    const currentAmount = typeof debouncedPaymentAmount === 'number' ? debouncedPaymentAmount : 0
    const currentNumberOfPayments = numberOfPayments

    // Strategy: If payment amount is manually set, calculate number of payments from it
    // If payment amount is not set or was auto-calculated, calculate it from number of payments
    let finalAmount = currentAmount
    let finalNumberOfPayments = currentNumberOfPayments

    if (isPaymentAmountManual && currentAmount > 0) {
      // Payment amount was manually set → calculate number of payments
      const breakdown = calculateBreakdownUntilZero({
        startingBalance: totalBalance,
        paymentAmount: currentAmount,
        paymentFrequency: paymentFrequency,
        interestRate: interestRate,
        firstPaymentDate: startDate,
        maxPeriods: 1000
      })

      if (breakdown.length > 0) {
        finalNumberOfPayments = breakdown.length
        if (finalNumberOfPayments !== currentNumberOfPayments) {
          setNumberOfPayments(finalNumberOfPayments)
        }
      }
    } else if (currentNumberOfPayments > 0) {
      // Number of payments is set → calculate payment amount
      const calculatedAmount = calculatePaymentAmount({
        principalAmount: totalBalance,
        interestRate: interestRate,
        paymentFrequency: paymentFrequency,
        numberOfPayments: currentNumberOfPayments,
        brokerageFee: 0,
        originationFee: 0
      })

      if (calculatedAmount) {
        finalAmount = calculatedAmount
        // Only update if different to prevent infinite loops
        if (Math.abs(finalAmount - currentAmount) > 0.01) {
          setPaymentAmount(calculatedAmount)
          setDebouncedPaymentAmount(calculatedAmount)
          setIsPaymentAmountManual(false) // Mark as auto-calculated
        }
      }
    } else {
      // Neither is set yet, skip calculation
      return
    }

    // Now calculate the breakdown with the final values
    if (finalAmount > 0 && finalNumberOfPayments > 0) {
      const breakdown = calculateBreakdownUntilZero({
        startingBalance: totalBalance,
        paymentAmount: finalAmount,
        paymentFrequency: paymentFrequency,
        interestRate: interestRate,
        firstPaymentDate: startDate,
        maxPeriods: finalNumberOfPayments || 1000
      })

      if (breakdown.length > 0) {
        // Convert breakdown to schedule format
        const scheduleWithBreakdown = breakdown.map(payment => ({
          due_date: payment.dueDate,
          amount: payment.amount,
          interest: payment.interest,
          principal: payment.principal,
          remaining_balance: payment.remainingBalance
        }))

        // Only update schedule if it's different
        const scheduleChanged =
          JSON.stringify(scheduleWithBreakdown) !==
          JSON.stringify(paymentSchedule)
        if (scheduleChanged) {
          setPaymentSchedule(scheduleWithBreakdown)
        }

        // Calculate which payments will be updated, created, or deleted
        const existingFuturePayments = payments.filter((p: any) => {
          const paymentDate = parseLocalDate(p.payment_date)
          paymentDate.setHours(0, 0, 0, 0)
          const isFutureDate = paymentDate >= today
          const isPendingOrFailed =
            ['pending', 'failed'].includes(p.status) && paymentDate < today
          return isFutureDate || isPendingOrFailed
        })

        const existingConfirmedPayments = payments.filter((p: any) =>
          ['confirmed', 'paid', 'manual', 'rebate'].includes(p.status)
        )
        const maxPaymentNumber = existingConfirmedPayments.length > 0
          ? Math.max(...existingConfirmedPayments.map((p: any) => p.payment_number || 0))
          : 0

        const existingFuturePaymentsMap = new Map(
          existingFuturePayments.map((p: any) => [p.payment_number, p])
        )

        let updatedCount = 0
        let createdCount = 0
        const paymentNumbersToKeep = new Set<number>()

        scheduleWithBreakdown.forEach((_, index) => {
          const paymentNumber = maxPaymentNumber + index + 1
          paymentNumbersToKeep.add(paymentNumber)

          if (existingFuturePaymentsMap.has(paymentNumber)) {
            updatedCount++
          } else {
            createdCount++
          }
        })

        const deletedCount = existingFuturePayments.filter(
          (p: any) => !paymentNumbersToKeep.has(p.payment_number)
        ).length

        setPreviewData({
          updatedCount,
          createdCount,
          deletedCount,
          totalBalance
        })
      }
    }
  }, [
    paymentFrequency,
    numberOfPayments,
    startDate,
    debouncedPaymentAmount,
    totalBalance,
    interestRate,
    action,
    payments,
    today,
    paymentSchedule,
    isPaymentAmountManual
  ])

  // Handle schedule changes from EditablePaymentScheduleList
  const handleScheduleChange = (schedule: PayementScheduleItem[]) => {
    setPaymentSchedule(schedule)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (action === 'stop') {
      // Stop action doesn't need form validation
    } else if (action === 'modify') {
      if (
        !paymentAmount ||
        !paymentFrequency ||
        !numberOfPayments ||
        !startDate
      ) {
        setError('Please fill in all required fields')
        return
      }

      if (Number(paymentAmount) <= 0) {
        setError('Payment amount must be greater than 0')
        return
      }

      if (numberOfPayments <= 0) {
        setError('Number of payments must be greater than 0')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const payload: any = {
        action
      }

      if (action === 'modify') {
        payload.payment_amount = Number(paymentAmount)
        payload.payment_frequency = paymentFrequency
        payload.number_of_payments = numberOfPayments
        payload.start_date = startDate

        // Include edited payment schedule if available
        if (paymentSchedule && paymentSchedule.length > 0) {
          payload.payment_schedule = paymentSchedule
        }
      }

      const response = await fetch(`/api/admin/loans/${loanId}/modify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to modify loan')
      }

      await onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'An error occurred while modifying the loan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setAction('modify')
      setPaymentAmount('')
      setPaymentFrequency('monthly')
      setNumberOfPayments(0)
      setStartDate('')
      setPaymentSchedule([])
      setError(null)
      setPreviewData(null)
      onClose()
    }
  }

  // Don't render modal if not open or if loan is completed
  if (!open || loan?.status === 'completed') return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-4'>
      <div className='my-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <h3 className='text-lg font-semibold text-gray-900'>
            Modify Loan Payments
          </h3>
          <button
            type='button'
            onClick={handleClose}
            disabled={isSubmitting}
            className='rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='Close modify loan modal'
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

          {/* Action Selection */}
          <div className='mb-6'>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              Action <span className='text-red-500'>*</span>
            </label>
            <div className='grid grid-cols-2 gap-3'>
              <button
                type='button'
                onClick={() => setAction('modify')}
                className={`rounded-lg border-2 p-3 text-sm font-medium transition ${
                  action === 'modify'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                Modify Schedule
              </button>
              <button
                type='button'
                onClick={() => setAction('stop')}
                className={`rounded-lg border-2 p-3 text-sm font-medium transition ${
                  action === 'stop'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                Stop Payments
              </button>
            </div>
          </div>

          {/* Stop Action Info */}
          {action === 'stop' && (
            <div className='mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4'>
              <p className='text-sm text-yellow-800'>
                <strong>Warning:</strong> This will mark {futurePaymentsCount}{' '}
                future payment(s) as cancelled with a note. Past payments will
                remain unchanged.
              </p>
            </div>
          )}

          {/* Modify Form Fields */}
          {action === 'modify' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label
                    htmlFor='paymentFrequency'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Payment Frequency <span className='text-red-500'>*</span>
                  </label>
                  <Select
                    key={`frequency-${paymentFrequency}`}
                    value={String(paymentFrequency || 'monthly')}
                    onValueChange={e =>
                      setPaymentFrequency(e as PaymentFrequency)
                    }
                    options={frequencyOptions}
                    disabled={isSubmitting}
                    className='w-full'
                  />
                </div>

                <div>
                  <label
                    htmlFor='numberOfPayments'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Number of Payments <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='numberOfPayments'
                    type='number'
                    min={1}
                    value={numberOfPayments}
                    onChange={e =>
                      setNumberOfPayments(Number(e.target.value) || 0)
                    }
                    disabled={isSubmitting}
                    required
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label
                    htmlFor='paymentAmount'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Payment Amount (CAD) <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='paymentAmount'
                    type='number'
                    min={0}
                    step='0.01'
                    value={
                      typeof paymentAmount === 'number'
                        ? roundCurrency(paymentAmount)
                        : ''
                    }
                    onChange={e => {
                      const value = e.target.value
                      setPaymentAmount(value === '' ? '' : Number(value))
                      // Mark as manually set when user changes it
                      if (value !== '') {
                        setIsPaymentAmountManual(true)
                      }
                    }}
                    disabled={isSubmitting}
                    required
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
                  />
                  <p className='mt-1 text-xs text-gray-500'>
                    {typeof paymentAmount === 'number' && paymentAmount > 0
                      ? 'Changing this will recalculate the number of payments needed'
                      : 'Automatically calculated based on remaining balance, fees, and number of payments'}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor='startDate'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Start Date <span className='text-red-500'>*</span>
                  </label>
                  <DatePicker
                    id='startDate'
                    value={startDate}
                    onChange={date => setStartDate(date || '')}
                    minDate={(() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      tomorrow.setHours(0, 0, 0, 0)
                      return tomorrow
                    })()}
                    disabled={isSubmitting}
                    required
                    placeholder='Select start date'
                    holidays={getCanadianHolidays()}
                    className='w-full'
                  />
                </div>
              </div>

              {/* Preview */}
              {previewData && (
                <div className='mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4'>
                  <p className='mb-2 text-sm font-medium text-blue-900'>
                    Summary:
                  </p>
                  <ul className='space-y-1 text-xs text-blue-800'>
                    {previewData.updatedCount > 0 && (
                      <li>
                        • {previewData.updatedCount} payment(s) will be updated
                      </li>
                    )}
                    {previewData.createdCount > 0 && (
                      <li>
                        • {previewData.createdCount} new payment(s) will be created
                      </li>
                    )}
                    {previewData.deletedCount > 0 && (
                      <li>
                        • {previewData.deletedCount} payment(s) will be deleted
                      </li>
                    )}
                    <li>
                      • Total balance:{' '}
                      {formatCurrency(previewData.totalBalance)}
                    </li>
                    <li>
                      • Payment amount: {formatCurrency(Number(paymentAmount))}
                    </li>
                  </ul>
                </div>
              )}

              {/* Payment Schedule */}
              {paymentSchedule.length > 0 && (
                <div className='mt-4'>
                  <h4 className='mb-3 text-sm font-semibold text-gray-700'>
                    Payment Schedule
                  </h4>
                  <EditablePaymentScheduleList
                    schedule={paymentSchedule}
                    onScheduleChange={handleScheduleChange}
                    holidays={getCanadianHolidays()}
                    minDate={(() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      tomorrow.setHours(0, 0, 0, 0)
                      return tomorrow
                    })()}
                  />
                </div>
              )}
            </div>
          )}

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
              disabled={
                isSubmitting ||
                (action !== 'stop' &&
                  (!paymentAmount ||
                    !startDate ||
                    numberOfPayments <= 0 ||
                    paymentSchedule.length === 0))
              }
              className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                action === 'stop'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSubmitting
                ? 'Processing...'
                : action === 'stop'
                  ? 'Stop Payments'
                  : 'Modify Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
