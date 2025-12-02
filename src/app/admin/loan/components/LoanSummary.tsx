import { fetcher } from '@/lib/utils'
import React, { useState } from 'react'
import useSWR from 'swr'
import { LoanPayment, LoanContract } from '@/src/lib/supabase/types'
import { formatCurrency, formatDate } from '../[id]/utils'
import { Loan } from '@/src/lib/supabase'
import Select from '@/src/app/[locale]/components/Select'
import GenerateContractModal from '../../applications/[id]/components/GenerateContractModal'
import ContractViewer from '../../components/ContractViewer'
import { GenerateContractPayload } from '@/src/app/types/contract'
import { IconEdit, IconClock } from '@/src/app/components/icons'
import DatePicker from '@/src/app/[locale]/components/DatePicker'
import { getCanadianHolidays } from '@/src/lib/utils/date'
import { ContractDefaultsResponse } from '@/src/types'
import ManualPaymentModal from './ManualPaymentModal'
import RebatePaymentModal from './RebatePaymentModal'

interface LoanSummaryProps {
  loan: any
  onLoanUpdate?: () => Promise<void> | void
}
function LoanSummary({ loan, onLoanUpdate }: LoanSummaryProps) {
  const loanId = loan.id
  const applicationId = loan.application_id
  const [openGenerator, setOpenGenerator] = useState(false)
  const [submittingContract, setSubmittingContract] = useState(false)
  const [showContractViewer, setShowContractViewer] = useState(false)
  const [contract, setContract] = useState<LoanContract | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false)
  const [showRebatePaymentModal, setShowRebatePaymentModal] = useState(false)
  const { data, error, isLoading, mutate } = useSWR<LoanPayment[]>(
    `/api/admin/loans/${loanId}/payments`,
    fetcher
  )

  const handleSubmit = async (payload: GenerateContractPayload) => {
    try {
      setSubmittingContract(true)
      const response = await fetch(
        `/api/admin/applications/${loan.application_id}/contract/generate?loanId=${loanId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit contract')
      }
      alert('Contract submitted successfully')
      setOpenGenerator(false)
      setSubmittingContract(false)
    } catch (error) {
      setSubmittingContract(false)
      console.error('Error submitting contract:', error)
    }
  }

  const handleViewContract = async () => {
    if (!applicationId) return
    setLoadingContract(true)
    try {
      const response = await fetch(
        `/api/admin/applications/${applicationId}/contract`
      )
      if (!response.ok) {
        if (response.status === 404) {
          setContract(null)
          setShowContractViewer(true)
          return
        }
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch contract')
      }
      const result = await response.json()
      setContract(result.contract as LoanContract)
      setShowContractViewer(true)
    } catch (e: any) {
      console.error('Error fetching contract:', e)
      alert(e.message || 'Failed to fetch contract')
    } finally {
      setLoadingContract(false)
    }
  }
  if (isLoading) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent'></div>
        </div>
      </div>
    )
  }
  if (error) {
    return <div>Error: {error.message}</div>
  }
  return (
    <div className='space-y-3 p-2'>
      <LoanSummaryTable
        loan={loan}
        openGenerator={openGenerator}
        setOpenGenerator={setOpenGenerator}
        onViewContract={handleViewContract}
        loadingContract={loadingContract}
      />
      <PaymentTable 
        payments={data ?? []} 
        loanId={loanId} 
        applicationId={applicationId}
        loan={loan}
        onPaymentUpdate={mutate}
        onAddManualPayment={() => setShowManualPaymentModal(true)}
        onAddRebatePayment={() => setShowRebatePaymentModal(true)}
        onLoanUpdate={onLoanUpdate}
      />
      {showManualPaymentModal && (
        <ManualPaymentModal
          loanId={loanId}
          applicationId={applicationId}
          open={showManualPaymentModal}
          onClose={() => setShowManualPaymentModal(false)}
          onSuccess={async () => {
            await mutate()
            if (onLoanUpdate) {
              await onLoanUpdate()
            }
          }}
          remainingBalance={loan.remaining_balance}
        />
      )}
      {showRebatePaymentModal && (
        <RebatePaymentModal
          loanId={loanId}
          applicationId={applicationId}
          open={showRebatePaymentModal}
          onClose={() => setShowRebatePaymentModal(false)}
          onSuccess={async () => {
            await mutate()
            if (onLoanUpdate) {
              await onLoanUpdate()
            }
          }}
          remainingBalance={loan.remaining_balance}
        />
      )}
      {openGenerator && (
        <GenerateContractModal
          applicationId={loan.application_id}
          open={openGenerator}
          loadingContract={submittingContract}
          onSubmit={handleSubmit}
          onClose={() => setOpenGenerator(false)}
        />
      )}
      {showContractViewer && applicationId && (
        <ContractViewer
          contract={contract}
          applicationId={applicationId}
          onClose={() => {
            setShowContractViewer(false)
            setContract(null)
          }}
        />
      )}
    </div>
  )
}

export default LoanSummary

function PaymentTable({
  payments,
  loanId,
  applicationId,
  loan,
  onPaymentUpdate,
  onAddManualPayment,
  onLoanUpdate,
  onAddRebatePayment
}: {
  payments: LoanPayment[]
  loanId: string
  applicationId?: string
  loan?: any
  onPaymentUpdate: () => Promise<any>
  onAddManualPayment?: () => void
  onLoanUpdate?: () => Promise<void> | void
  onAddRebatePayment?: () => void
}) {
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
                    <td className='px-3 py-1.5 text-xs text-gray-500'>
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

function LoanSummaryTable({
  loan,
  openGenerator,
  setOpenGenerator,
  onViewContract,
  loadingContract
}: {
  loan: any
  openGenerator: boolean
  setOpenGenerator: (open: boolean) => void
  onViewContract: () => void
  loadingContract: boolean
}) {
  const handleGenerateContract = async () => {
    setOpenGenerator(true)
  }
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'defaulted':
        return 'bg-red-100 text-red-800'
      case 'pending_disbursement':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleOpenContract = () => {
    if (loan.crmContractPath) {
      // Construct the full URL - adjust base URL based on your CRM storage configuration
      // The path format appears to be: companyId/branchId/filename
      // You may need to adjust this based on your actual CRM storage setup
      const baseUrl = 'https://softloan-ca.s3.amazonaws.com'
      const contractUrl = `${baseUrl}/${loan.crmContractPath}`
      window.open(contractUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const borrowerName = loan.users
    ? `${loan.users.first_name || ''} ${loan.users.last_name || ''}`.trim() ||
      'N/A'
    : 'N/A'

  // Get the latest contract from loan_contracts array
  const contract =
    Array.isArray(loan.loan_contracts) && loan.loan_contracts.length > 0
      ? loan.loan_contracts[0]
      : null

  const isContractSent =
    contract?.sent_at !== null && contract?.sent_at !== undefined
  const canSendContract =
    contract &&
    contract.contract_status !== 'signed' &&
    (contract.contract_status === 'generated' ||
      contract.contract_status === 'draft' ||
      isContractSent)

  const hasContract = contract !== null || loan.crmContractPath !== null

  const handleSendContract = async () => {
    if (!contract || !loan.application_id) return

    try {
      const response = await fetch(
        `/api/admin/applications/${loan.application_id}/contract/send?contract_id=${contract.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ method: 'email' })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to send contract')
        return
      }

      alert(
        isContractSent
          ? 'Contract resent successfully!'
          : 'Contract sent successfully!'
      )
      // Optionally refresh the loan data
      window.location.reload()
    } catch (error: any) {
      console.error('Error sending contract:', error)
      alert('Failed to send contract. Please try again.')
    }
  }

  return (
    <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
      <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2'>
        <div className='flex items-center justify-between'>
          <h3 className='text-base font-semibold text-gray-900'>
            Loan Summary
          </h3>
          <div className='flex items-center gap-2'>
            {canSendContract && (
              <button
                onClick={handleSendContract}
                className='flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                  />
                </svg>
                {isContractSent ? 'Resend Contract' : 'Send Contract'}
              </button>
            )}
            {loan.crmContractPath && (
              <button
                onClick={handleOpenContract}
                className='flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                  />
                </svg>
                View Contract
              </button>
            )}
            {/* View Contract */}
            {hasContract && !loan.crmContractPath && (
              <button
                onClick={onViewContract}
                disabled={loadingContract}
                className='flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                  />
                </svg>
                {loadingContract ? 'Loading...' : 'View Contract'}
              </button>
            )}
            {/* Generate contract */}
            {!loan.crmContractPath &&
              contract?.contract_status !== 'signed' && (
                <button
                  className='flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700'
                  onClick={handleGenerateContract}
                >
                  {contract?.contract_status === 'generated'
                    ? 'Regenerate Contract'
                    : 'Generate Contract'}
                </button>
              )}
          </div>
        </div>
      </div>
      <div className='p-4'>
        {/* <pre>{JSON.stringify(loan.loan_contracts, null, 2)}</pre> */}
        <div className='grid gap-4 md:grid-cols-2'>
          {/* Loan Information */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold text-gray-700'>
              Loan Information
            </h4>
            <div className='space-y-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Loan Number:</span>
                <span className='font-medium text-gray-900'>
                  {loan.loan_number
                    ? `LN-${String(loan.loan_number).padStart(6, '0')}`
                    : 'N/A'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Principal Amount:</span>
                <span className='font-medium text-gray-900'>
                  {formatCurrency(Number(loan.principal_amount))}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Remaining Balance:</span>
                <span className='font-medium text-gray-900'>
                  {formatCurrency(Number(loan.remaining_balance))}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Interest Rate:</span>
                <span className='font-medium text-gray-900'>
                  {loan.interest_rate}%
                </span>
              </div>
              {/* Contract sent at */}
              {contract?.sent_at && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Contract Sent At:</span>
                  <span className='font-medium text-gray-900'>
                    {formatDate(contract.sent_at)}
                  </span>
                </div>
              )}

              <div className='flex justify-between'>
                <span className='text-gray-500'>Status:</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(
                    loan.status
                  )}`}
                >
                  {loan.status?.toUpperCase().replace('_', ' ') || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Borrower & Dates */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold text-gray-700'>
              Borrower & Dates
            </h4>
            <div className='space-y-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Borrower:</span>
                <span className='font-medium text-gray-900'>
                  {borrowerName}
                </span>
              </div>
              {loan.users?.email && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Email:</span>
                  <span className='font-medium text-gray-900'>
                    {loan.users.email}
                  </span>
                </div>
              )}
              {loan.users?.phone && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Phone:</span>
                  <span className='font-medium text-gray-900'>
                    {loan.users.phone}
                  </span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-gray-500'>Disbursement Date:</span>
                <span className='font-medium text-gray-900'>
                  {formatDate(loan.disbursement_date)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Due Date:</span>
                <span className='font-medium text-gray-900'>
                  {formatDate(loan.due_date)}
                </span>
              </div>
              {loan.loan_applications && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Application Status:</span>
                  <span className='font-medium text-gray-900'>
                    {loan.loan_applications.application_status || 'N/A'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

