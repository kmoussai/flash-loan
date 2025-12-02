'use client'

import { fetcher } from '@/lib/utils'
import React, { useState } from 'react'
import useSWR from 'swr'
import { LoanPayment } from '@/src/lib/supabase/types'
import { formatCurrency, formatDate } from '../[id]/utils'
import DatePicker from '@/src/app/[locale]/components/DatePicker'
import { getCanadianHolidays } from '@/src/lib/utils/date'
import { ContractDefaultsResponse } from '@/src/types'
import { IconEdit, IconClock } from '@/src/app/components/icons'

interface PaymentTableProps {
  payments: LoanPayment[]
  loanId: string
  applicationId?: string
  loan?: any
  onPaymentUpdate: () => Promise<any>
  onAddManualPayment?: () => void
  onLoanUpdate?: () => Promise<void> | void
  onAddRebatePayment?: () => void
}

export default function PaymentTable({
  payments,
  loanId,
  applicationId,
  loan,
  onPaymentUpdate,
  onAddManualPayment,
  onLoanUpdate,
  onAddRebatePayment
}: PaymentTableProps) {
  const [editingPayment, setEditingPayment] = useState<LoanPayment | null>(null)
  const [editAmount, setEditAmount] = useState<string>('')
  const [editDate, setEditDate] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deferringPayment, setDeferringPayment] = useState<LoanPayment | null>(null)
  const [deferFeeOption, setDeferFeeOption] = useState<'none' | 'end' | null>(null)
  const [deferFeeAmount, setDeferFeeAmount] = useState<string>('50')
  const [isDeferring, setIsDeferring] = useState(false)
  const [deferError, setDeferError] = useState<string | null>(null)

  // Fetch employment pay dates if applicationId is available
  const { data: defaultsData } = useSWR<ContractDefaultsResponse>(
    applicationId ? `/api/admin/applications/${applicationId}/contract/defaults` : null,
    fetcher
  )

  // Get contract fees from loan data (already fetched with loan)
  const contractFees = React.useMemo(() => {
    if (loan?.loan_contracts && Array.isArray(loan.loan_contracts) && loan.loan_contracts.length > 0) {
      const contract = loan.loan_contracts[0]
      return contract?.contract_terms?.fees
    }
    return null
  }, [loan])

  // Update defer fee amount when contract fees are available
  React.useEffect(() => {
    if (contractFees) {
      const fee = contractFees.deferral_fee ??
                  contractFees.other_fees ??
                  50
      setDeferFeeAmount(fee.toString())
    }
  }, [contractFees])

  // Get holidays and employment pay dates
  const holidays = getCanadianHolidays()
  const employmentPayDates = defaultsData?.defaults?.employmentPayDates || []

  const handleEditClick = (payment: LoanPayment) => {
    setEditingPayment(payment)
    setEditAmount(payment.amount.toString())
    // Convert payment_date to YYYY-MM-DD format for date input
    const date = new Date(payment.payment_date)
    setEditDate(date.toISOString().split('T')[0])
    setError(null)
  }

  const handleSave = async () => {
    if (!editingPayment) return

    setError(null)
    setIsSaving(true)

    try {
      const updates: { amount?: number; payment_date?: string; notes?: string } = {}
      const noteChanges: string[] = []
      const now = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      if (editAmount && Number(editAmount) !== editingPayment.amount) {
        const amount = Number(editAmount)
        if (isNaN(amount) || amount <= 0) {
          setError('Amount must be a positive number')
          setIsSaving(false)
          return
        }
        const oldAmount = formatCurrency(Number(editingPayment.amount))
        const newAmount = formatCurrency(amount)
        updates.amount = amount
        noteChanges.push(`Payment amount changed from ${oldAmount} to ${newAmount}`)
      }

      if (editDate) {
        const newDate = new Date(editDate)
        const oldDate = new Date(editingPayment.payment_date)
        // Compare dates (ignoring time)
        if (
          newDate.toISOString().split('T')[0] !==
          oldDate.toISOString().split('T')[0]
        ) {
          updates.payment_date = newDate.toISOString()
          const oldDateStr = formatDate(editingPayment.payment_date)
          const newDateStr = formatDate(newDate.toISOString())
          noteChanges.push(`Payment date changed from ${oldDateStr} to ${newDateStr}`)
        }
      }

      if (Object.keys(updates).length === 0) {
        setEditingPayment(null)
        setIsSaving(false)
        return
      }

      // Add notes for changes
      if (noteChanges.length > 0) {
        const noteText = `[${now}] ${noteChanges.join('; ')}`
        const existingNotes = editingPayment.notes || ''
        updates.notes = existingNotes
          ? `${existingNotes}\n${noteText}`
          : noteText
      }

      const response = await fetch(
        `/api/admin/loans/${loanId}/payments/${editingPayment.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update payment')
      }

      // Refresh the payment list
      await onPaymentUpdate()
      setEditingPayment(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update payment')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingPayment(null)
    setEditAmount('')
    setEditDate('')
    setError(null)
  }

  const handleDeferClick = (payment: LoanPayment) => {
    setDeferringPayment(payment)
    setDeferFeeOption(null)
    // Use deferral fee from contract, or default to 50
    const fee = contractFees?.deferral_fee ??
                contractFees?.other_fees ??
                50
    setDeferFeeAmount(fee.toString())
    setDeferError(null)
  }

  const handleDeferSave = async () => {
    if (!deferringPayment || !deferFeeOption) {
      setDeferError('Please select a fee option')
      return
    }

    setDeferError(null)
    setIsDeferring(true)

    try {
      const feeAmount = deferFeeOption === 'none' ? 0 : Number(deferFeeAmount)
      if (deferFeeOption !== 'none' && (isNaN(feeAmount) || feeAmount < 0)) {
        setDeferError('Fee amount must be a positive number')
        setIsDeferring(false)
        return
      }

      const response = await fetch(
        `/api/admin/loans/${loanId}/payments/${deferringPayment.id}/defer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            move_to_end: true,
            fee_amount: feeAmount,
            add_fee_to_payment: deferFeeOption === 'end'
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to defer payment')
      }

      // Refresh the payment list
      await onPaymentUpdate()
      // Refresh loan data if callback provided
      if (onLoanUpdate) {
        await onLoanUpdate()
      }
      setDeferringPayment(null)
      setDeferFeeOption(null)
      setDeferFeeAmount('50')
    } catch (err: any) {
      setDeferError(err.message || 'Failed to defer payment')
    } finally {
      setIsDeferring(false)
    }
  }

  const handleDeferCancel = () => {
    setDeferringPayment(null)
    setDeferFeeOption(null)
    setDeferFeeAmount('50')
    setDeferError(null)
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'paid':
        return 'bg-emerald-100 text-emerald-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'deferred':
        return 'bg-orange-100 text-orange-800'
      case 'manual':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      case 'rebate':
        return 'bg-purple-100 text-purple-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className='space-y-3 p-2'>
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 flex items-center justify-between'>
          <h3 className='text-base font-semibold text-gray-900'>
            Payment History
          </h3>
          <div className='flex items-center gap-2'>
            {onAddManualPayment && (
              <button
                onClick={onAddManualPayment}
                className='inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700'
                title='Add manual payment'
              >
                <svg
                  className='mr-1.5 h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                Add Manual Payment
              </button>
            )}
            {onAddRebatePayment && (
              <button
                onClick={onAddRebatePayment}
                className='inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700'
                title='Add rebate payment'
              >
                <svg
                  className='mr-1.5 h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                Add Rebate
              </button>
            )}
          </div>
        </div>
        <div className='max-h-[300px] overflow-x-auto overflow-y-auto'>
          {payments.length === 0 ? (
            <div className='p-4 text-center'>
              <p className='text-xs text-gray-500'>No payments recorded yet</p>
            </div>
          ) : (
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Payment Date
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Amount
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Principal
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Interest
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Method
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Status
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Notes
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white'>
                {payments.map((payment: LoanPayment) => (
                  <tr
                    key={payment.id}
                    className='transition-colors hover:bg-gray-50'
                  >
                    <td className='whitespace-nowrap px-3 py-1.5 text-xs text-gray-900'>
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5 text-xs font-semibold text-gray-900'>
                      {formatCurrency(parseFloat(payment.amount.toString()))}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5 text-xs text-gray-700'>
                      {payment.principal !== null && payment.principal !== undefined
                        ? formatCurrency(Number(payment.principal))
                        : '-'}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5 text-xs text-gray-700'>
                      {payment.interest !== null && payment.interest !== undefined
                        ? formatCurrency(Number(payment.interest))
                        : '-'}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5 text-xs text-gray-500'>
                      {payment.method || 'N/A'}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5'>
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(
                          payment.status
                        )}`}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className='px-3 py-1.5 text-xs text-gray-500 whitespace-pre-line max-w-xs'>
                      {payment.notes || '-'}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5'>
                      <div className='flex items-center gap-1'>
                        <button
                          onClick={() => handleEditClick(payment)}
                          className='inline-flex items-center rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600'
                          title='Edit payment'
                          aria-label='Edit payment'
                        >
                          <IconEdit className='h-4 w-4' />
                        </button>
                        {payment.status === 'pending' && (
                          <button
                            onClick={() => handleDeferClick(payment)}
                            className='inline-flex items-center rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-orange-600'
                            title='Defer payment'
                            aria-label='Defer payment'
                          >
                            <IconClock className='h-4 w-4' />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4'>
          <div className='w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl'>
            {/* Header */}
            <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
              <h3 className='text-lg font-semibold text-gray-900'>
                Edit Payment
              </h3>
              <button
                type='button'
                onClick={handleCancel}
                className='rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
                aria-label='Close edit payment modal'
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
            <div className='px-6 py-5'>
              {error && (
                <div className='mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600'>
                  {error}
                </div>
              )}

              <div className='space-y-4'>
                <div>
                  <label
                    htmlFor='edit-amount'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Amount (CAD) <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='edit-amount'
                    type='number'
                    min={0}
                    step='0.01'
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    disabled={isSaving}
                    required
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
                  />
                </div>

                <div>
                  <label
                    htmlFor='edit-date'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Payment Date <span className='text-red-500'>*</span>
                  </label>
                  <DatePicker
                    id='edit-date'
                    value={editDate}
                    onChange={date => setEditDate(date || '')}
                    disabled={isSaving}
                    required
                    placeholder='Select payment date'
                    holidays={holidays}
                    employmentPayDates={employmentPayDates}
                    className='w-full'
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className='flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4'>
              <button
                type='button'
                onClick={handleCancel}
                disabled={isSaving}
                className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleSave}
                disabled={isSaving}
                className='rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defer Payment Modal */}
      {deferringPayment && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4'>
          <div className='w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl'>
            {/* Header */}
            <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
              <h3 className='text-lg font-semibold text-gray-900'>
                Defer Payment
              </h3>
              <button
                type='button'
                onClick={handleDeferCancel}
                className='rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
                aria-label='Close defer payment modal'
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
            <div className='px-6 py-5'>
              {deferError && (
                <div className='mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600'>
                  {deferError}
                </div>
              )}

              <div className='space-y-4'>
                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    Current Payment Information
                  </label>
                  <div className='space-y-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600'>
                    <div>
                      <span className='font-medium'>Date:</span> {formatDate(deferringPayment.payment_date)}
                    </div>
                    <div>
                      <span className='font-medium'>Amount:</span> {formatCurrency(Number(deferringPayment.amount))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    Deferral Fee Option <span className='text-red-500'>*</span>
                  </label>
                  <div className='space-y-2'>
                    <label className='flex cursor-pointer items-center rounded-lg border border-gray-300 p-3 transition hover:bg-gray-50'>
                      <input
                        type='radio'
                        name='fee-option'
                        value='none'
                        checked={deferFeeOption === 'none'}
                        onChange={() => setDeferFeeOption('none')}
                        disabled={isDeferring}
                        className='h-4 w-4 text-indigo-600 focus:ring-indigo-500'
                      />
                      <div className='ml-3'>
                        <div className='text-sm font-medium text-gray-900'>
                          No Deferral Fee
                        </div>
                        <div className='text-xs text-gray-500'>
                          Payment will be moved to the end without any additional fees
                        </div>
                      </div>
                    </label>
                    <label className='flex cursor-pointer items-center rounded-lg border border-gray-300 p-3 transition hover:bg-gray-50'>
                      <input
                        type='radio'
                        name='fee-option'
                        value='end'
                        checked={deferFeeOption === 'end'}
                        onChange={() => setDeferFeeOption('end')}
                        disabled={isDeferring}
                        className='h-4 w-4 text-indigo-600 focus:ring-indigo-500'
                      />
                      <div className='ml-3 flex-1'>
                        <div className='text-sm font-medium text-gray-900'>
                          Add Fee to Payment at End
                        </div>
                        <div className='text-xs text-gray-500'>
                          Fee of {formatCurrency(Number(deferFeeAmount))} will be added to the payment amount when moved to the end
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {deferFeeOption === 'end' && (
                  <div>
                    <label className='mb-1 block text-sm font-medium text-gray-700'>
                      Deferral Fee Amount (CAD)
                    </label>
                    <div className='rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600'>
                      {formatCurrency(Number(deferFeeAmount))}
                      <span className='ml-2 text-xs text-gray-500'>
                        (from contract fees)
                      </span>
                    </div>
                  </div>
                )}

                <div className='rounded-lg bg-blue-50 p-3 text-sm text-blue-800'>
                  <p className='font-medium'>What will happen:</p>
                  <ul className='mt-1 list-inside list-disc space-y-1 text-xs'>
                    <li>Current payment amount, interest, and principal will be set to $0</li>
                    <li>Payment will be moved to the end of the schedule</li>
                    {deferFeeOption === 'end' && (
                      <li>New payment amount will be {formatCurrency(Number(deferringPayment.amount) + Number(deferFeeAmount))} (original + fee)</li>
                    )}
                    {deferFeeOption === 'none' && (
                      <li>New payment amount will be {formatCurrency(Number(deferringPayment.amount))} (original amount)</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className='flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4'>
              <button
                type='button'
                onClick={handleDeferCancel}
                disabled={isDeferring}
                className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleDeferSave}
                disabled={isDeferring || !deferFeeOption}
                className='rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isDeferring ? 'Processing...' : 'Defer Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

