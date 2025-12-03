'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Select from '@/src/app/[locale]/components/Select'
import DatePicker from '@/src/app/[locale]/components/DatePicker'
import { PaymentFrequency } from '@/src/types'
import { calculatePaymentAmount, calculatePaymentBreakdown } from '@/src/lib/utils/loan'
import { buildSchedule, frequencyOptions } from '@/src/lib/utils/schedule'
import { getCanadianHolidays } from '@/src/lib/utils/date'
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
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly')
  const [numberOfPayments, setNumberOfPayments] = useState<number>(0)
  const [startDate, setStartDate] = useState('')
  const [paymentSchedule, setPaymentSchedule] = useState<PayementScheduleItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{
    cancelledCount: number
    newCount: number
    totalBalance: number
  } | null>(null)

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
      const paymentDate = new Date(p.payment_date)
      paymentDate.setHours(0, 0, 0, 0)
      const isFutureDate = paymentDate >= today
      const isPendingOrFailed = ['pending', 'failed'].includes(p.status) && paymentDate < today
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
  const contractPaymentFrequency = useMemo(() => contractTerms.payment_frequency || 'monthly', [contractTerms.payment_frequency])
  const contractPaymentAmount = useMemo(() => contractTerms.payment_amount || 0, [contractTerms.payment_amount])
  const contractNumberOfPayments = useMemo(() => contractTerms.number_of_payments || 0, [contractTerms.number_of_payments])

  // Initialize form with current loan data
  useEffect(() => {
    if (!open || !loan) return

    setPaymentFrequency(contractPaymentFrequency as PaymentFrequency)
    setPaymentAmount(contractPaymentAmount)
    setNumberOfPayments(contractNumberOfPayments)
    setAction('modify')
    setPreviewData(null)
    setError(null)
    setPaymentSchedule([])

    // Set default start date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    setStartDate(tomorrow.toISOString().split('T')[0])
  }, [open, loan?.id, contractPaymentFrequency, contractPaymentAmount, contractNumberOfPayments])

  // Memoize failed payments calculation to avoid recreating on every render
  const failedPayments = useMemo(() => {
    return payments.filter((p: any) => 
      p.status === 'failed' && (() => {
        const paymentDate = new Date(p.payment_date)
        paymentDate.setHours(0, 0, 0, 0)
        return paymentDate < today
      })()
    )
  }, [payments, today])

  // Memoize origination fee
  const originationFee = useMemo(() => fees.origination_fee || 55, [fees.origination_fee])

  // Auto-calculate payment amount when relevant fields change (for modify action)
  useEffect(() => {
    if (action !== 'modify' || !startDate) return

    // Calculate total balance: remaining_balance + brokerage_fee + failed payment fees
    const remainingBalance = Number(loan?.remaining_balance || 0)
    
    // Calculate failed payment fees: flat fee (origination_fee) + interest from each failed payment
    const failedPaymentFeesAndInterest = failedPayments.reduce((sum: number, p: any) => {
      const flatFee = originationFee // 55 from contract terms
      const paymentInterest = Number(p.interest || 0) // Interest that was supposed to be paid by this payment
      return sum + flatFee + paymentInterest
    }, 0)

    const totalBalance = remainingBalance + brokerageFee + failedPaymentFeesAndInterest

    if (totalBalance > 0 && paymentFrequency && numberOfPayments > 0 && startDate) {
      const calculatedAmount = calculatePaymentAmount(
        paymentFrequency,
        totalBalance,
        interestRate,
        numberOfPayments
      )

      if (calculatedAmount) {
        // Only update if the calculated amount is different to prevent infinite loops
        const currentAmount = typeof paymentAmount === 'number' ? paymentAmount : 0
        if (Math.abs(calculatedAmount - currentAmount) > 0.01) {
          setPaymentAmount(calculatedAmount)
        }
        
        // Build initial schedule
        const builtSchedule = buildSchedule({
          paymentAmount: calculatedAmount,
          paymentFrequency,
          numberOfPayments,
          nextPaymentDate: startDate
        })
        
        // Calculate interest and principal breakdown
        const breakdown = calculatePaymentBreakdown(
          totalBalance,
          calculatedAmount,
          interestRate,
          paymentFrequency,
          numberOfPayments
        )
        
        // Add breakdown to schedule
        const scheduleWithBreakdown = builtSchedule.map((item, index) => ({
          ...item,
          interest: breakdown[index]?.interest,
          principal: breakdown[index]?.principal
        }))
        
        // Only update schedule if it's different
        const scheduleChanged = JSON.stringify(scheduleWithBreakdown) !== JSON.stringify(paymentSchedule)
        if (scheduleChanged) {
          setPaymentSchedule(scheduleWithBreakdown)
        }
        
        setPreviewData({
          cancelledCount: futurePaymentsCount,
          newCount: numberOfPayments,
          totalBalance
        })
      }
    }
  }, [paymentFrequency, numberOfPayments, startDate, loan?.remaining_balance, brokerageFee, originationFee, failedPayments, interestRate, action, futurePaymentsCount])

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
      if (!paymentAmount || !paymentFrequency || !numberOfPayments || !startDate) {
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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4 overflow-y-auto'>
      <div className='w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl my-auto'>
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
            <div className='mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4'>
              <p className='text-sm text-yellow-800'>
                <strong>Warning:</strong> This will mark {futurePaymentsCount} future payment(s) as cancelled with a note.
                Past payments will remain unchanged.
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
                    value={paymentFrequency}
                    onValueChange={e => setPaymentFrequency(e as PaymentFrequency)}
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
                    onChange={e => setNumberOfPayments(Number(e.target.value) || 0)}
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
                    value={paymentAmount}
                    onChange={e => {
                      const value = e.target.value
                      setPaymentAmount(value === '' ? '' : Number(value))
                    }}
                    disabled={isSubmitting}
                    required
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
                  />
                  <p className='mt-1 text-xs text-gray-500'>
                    Automatically calculated based on remaining balance and fees
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
                <div className='rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4'>
                  <p className='text-sm font-medium text-blue-900 mb-2'>Summary:</p>
                  <ul className='text-xs text-blue-800 space-y-1'>
                    <li>• {previewData.cancelledCount} future payment(s) will be cancelled</li>
                    <li>• {previewData.newCount} new payment(s) will be created</li>
                    <li>• Total balance: {formatCurrency(previewData.totalBalance)}</li>
                    <li>• Payment amount: {formatCurrency(Number(paymentAmount))}</li>
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
              disabled={isSubmitting || (action !== 'stop' && (!paymentAmount || !startDate || numberOfPayments <= 0 || paymentSchedule.length === 0))}
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

