'use client'

import { useEffect, useMemo, useState } from 'react'
import Button from '@/src/app/[locale]/components/Button'
import Select from '@/src/app/[locale]/components/Select'
import { addDays, addMonths } from 'date-fns'
import {
  PaymentFrequency,
  GenerateContractPayload,
  PayementScheduleItem
} from '@/src/types'

const frequencyConfig: Record<
  PaymentFrequency,
  { paymentsPerYear: number; daysBetween: number; monthsBetween: number }
> = {
  weekly: { paymentsPerYear: 52, daysBetween: 7, monthsBetween: 0 },
  'bi-weekly': { paymentsPerYear: 26, daysBetween: 14, monthsBetween: 0 },
  'twice-monthly': { paymentsPerYear: 24, daysBetween: 15, monthsBetween: 0 }, // use 15 days instead of 0.5 month
  monthly: { paymentsPerYear: 12, daysBetween: 0, monthsBetween: 1 }
}

import useSWR from 'swr'
import { calculateLoanSchedule, fetcher } from '@/lib/utils'
import PaymentScheduleList from '@/src/app/[locale]/components/PaymentScheduleList'
import { ContractDefaultsResponse } from '@/src/types'
import { calculatePaymentAmount } from '@/src/lib/utils/loan'

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'twice-monthly', label: 'Twice per Month' },
  { value: 'weekly', label: 'Weekly' }
]

interface GenerateContractModalProps {
  applicationId: string
  open: boolean
  loadingContract: boolean
  onSubmit: (payload: GenerateContractPayload) => Promise<void> | void
  onClose: () => void
}

export const GenerateContractModal = ({
  applicationId,
  open,
  onSubmit,
  onClose
}: GenerateContractModalProps) => {
  const { data, error, isLoading } = useSWR<ContractDefaultsResponse>(
    `/api/admin/applications/${applicationId}/contract/defaults`,
    fetcher
  )
  const [loanAmount, setLoanAmount] = useState<number | ''>('')
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>('monthly')
  const [numberOfPayments, setNumberOfPayments] = useState<number>(0)
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('')
  const [nextPaymentDate, setNextPaymentDate] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [interestRate, setInterestRate] = useState(29)
  const [brokerageFee, setBrokerageFee] = useState<number>(200)
  const [formError, setFormError] = useState<string | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)

  // Accounts
  const accounts = useMemo(() => data?.defaults.accountOptions ?? [], [data])

  // Initialize defaults when data loads
  useEffect(() => {
    if (!data?.defaults) return
    const defaults = data.defaults
    setLoanAmount(defaults.loanAmount ?? 0)
    setPaymentFrequency(defaults.paymentFrequency)
    setNumberOfPayments(defaults.numberOfPayments ?? 0)
    setNextPaymentDate(defaults.nextPaymentDate ?? '')
    setPaymentAmount(defaults.paymentAmount ?? 0)
    setBrokerageFee(defaults.brokerageFee ?? 200)
    if (defaults.accountOptions?.[0])
      setSelectedAccountId(defaults.accountOptions[0].account_number)
  }, [data])

  const recalculatePaymentAmount = () => {
    if (
      !loanAmount ||
      !paymentFrequency ||
      !numberOfPayments ||
      !nextPaymentDate
    )
      return
    const paymentAmount = calculatePaymentAmount(
      paymentFrequency,
      loanAmount + brokerageFee,
      interestRate,
      numberOfPayments
    )
    if (paymentAmount) {
      setPaymentAmount(paymentAmount)
    }
  }
  // === Submit handler ===
  const handleSubmit = () => {
    setFormError(null)

    if (!loanAmount || !paymentAmount || !selectedAccountId) {
      setFormError('Please fill all required fields.')
      return
    }

    // Validate next payment date is at least tomorrow
    if (!nextPaymentDate) {
      setFormError('Next payment date is required.')
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const selectedDate = new Date(nextPaymentDate)
    selectedDate.setHours(0, 0, 0, 0)

    if (selectedDate < tomorrow) {
      setFormError('Next payment date must be at least tomorrow (today + 1 day).')
      return
    }

    setLoadingContract(true)
    const payload: GenerateContractPayload = {
      loanAmount: Number(loanAmount),
      paymentFrequency,
      numberOfPayments: Number(numberOfPayments),
      nextPaymentDate,
      account: accounts.find(acc => acc.account_number === selectedAccountId),
      interestRate: Number(interestRate),
      paymentAmount: Number(paymentAmount),
      brokerageFee: brokerageFee,
      paymentSchedule: buildSchedule({
        paymentAmount: Number(paymentAmount),
        paymentFrequency,
        numberOfPayments,
        nextPaymentDate
      })
    }
    setLoadingContract(false)
    onSubmit(payload)
  }

  function buildSchedule(arg0: {
    paymentAmount: number | ''
    paymentFrequency: PaymentFrequency
    numberOfPayments: number
    nextPaymentDate: string
  }): PayementScheduleItem[] {
    const isMonthly = paymentFrequency === 'monthly'
    return Array.from({ length: numberOfPayments }, (_v, i) => ({
      due_date: isMonthly
        ? addMonths(nextPaymentDate, i)
        : addDays(
            nextPaymentDate,
            i * frequencyConfig[paymentFrequency].daysBetween
          ),
      amount: Number(paymentAmount)
    })) as unknown as PayementScheduleItem[]
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4'>
      <div className='flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-gray-200 bg-white shadow-xl'>
        {/* Header */}
        <div className='flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>
              Generate Contract
            </h3>
            <p className='text-sm text-gray-600'>
              Specify repayment terms, payment schedule, and bank account.
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
            aria-label='Close generate contract modal'
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

        {/* Body */}
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          <div className='space-y-4'>
            {/* Loan amount + Frequency */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Loan Amount (CAD)
                </label>
                <input
                  type='number'
                  min={0}
                  step='0.01'
                  value={loanAmount}
                  onBlur={recalculatePaymentAmount}
                  onChange={e => {
                    const value = e.target.value
                    setLoanAmount(Number(value))
                  }}
                  disabled={isLoading}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
                />
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Payment Frequency
                </label>
                <Select
                  value={paymentFrequency}
                  onValueChange={e =>
                    setPaymentFrequency(e as PaymentFrequency)
                  }
                  options={frequencyOptions}
                  disabled={isLoading}
                  className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                />
              </div>
            </div>

            {/* Payments + amount */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Number of Payments
                </label>
                <input
                  type='number'
                  min={1}
                  value={numberOfPayments}
                  onBlur={recalculatePaymentAmount}
                  onChange={e =>
                    setNumberOfPayments(e.target.value as unknown as number)
                  }
                  disabled={isLoading}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                />
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Payment Amount (CAD)
                </label>
                <input
                  type='number'
                  min={0}
                  step='0.01'
                  value={paymentAmount}
                  onChange={e => {
                    const value = e.target.value
                    setPaymentAmount(Number(value))
                  }}
                  disabled={isLoading}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                />
              </div>
            </div>

            {/* Interest + next payment */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='hidden'>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Interest Rate (%)
                </label>
                <input
                  type='number'
                  min={0}
                  step='0.01'
                  value={interestRate}
                  onChange={e => setInterestRate(Number(e.target.value))}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                />
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Next Payment Date
                </label>
                <input
                  type='date'
                  value={nextPaymentDate}
                  min={(() => {
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    return tomorrow.toISOString().split('T')[0]
                  })()}
                  onChange={e => setNextPaymentDate(e.target.value)}
                  disabled={isLoading}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                />
                <p className='mt-1 text-xs text-gray-500'>
                  Must be at least tomorrow (today + 1 day)
                </p>
              </div>
            </div>

            {/* Brokerage Fee */}
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Brokerage Fee (CAD)
              </label>
              <input
                type='number'
                min={0}
                step='0.01'
                onBlur={recalculatePaymentAmount}
                value={brokerageFee}
                onChange={e => {
                  const value = e.target.value
                  setBrokerageFee(Number(value))
                }}
                disabled={isLoading}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                placeholder='0.00'
              />
              <p className='mt-1 text-xs text-gray-500'>
                Brokerage fee for loan broker services.
              </p>
            </div>

            {/* Account select */}
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Bank Account
              </label>
              <Select
                value={selectedAccountId}
                onValueChange={e => {
                  setSelectedAccountId(e as string)
                  recalculatePaymentAmount()
                }}
                disabled={isLoading}
                className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                options={
                  data?.defaults.accountOptions?.map(acc => ({
                    value: acc.account_number,
                    label: `${acc.account_number} - ${acc.bank_name}`
                  })) ?? []
                }
              />

              <p className='mt-1 text-xs text-gray-500'>
                Select the account that will be used for loan payments.
              </p>
            </div>

            {isLoading && (
              <p className='text-sm text-gray-500'>Loading default values…</p>
            )}
            {formError && <p className='text-sm text-red-600'>{formError}</p>}
          </div>
          {/* payment schedule */}
          <div className='grid  gap-4'>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>
                Payment Schedule
              </h3>
              <div className='max-h-[200px] overflow-y-auto'>
                <PaymentScheduleList
                  schedule={buildSchedule({
                    paymentAmount,
                    paymentFrequency,
                    numberOfPayments,
                    nextPaymentDate
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4'>
          <button
            type='button'
            onClick={onClose}
            disabled={loadingContract}
            className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loadingContract}
            className='rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
          >
            {loadingContract ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GenerateContractModal
