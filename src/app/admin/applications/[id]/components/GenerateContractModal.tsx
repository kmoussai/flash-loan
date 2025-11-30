'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Select from '@/src/app/[locale]/components/Select'
import DatePicker from '@/src/app/[locale]/components/DatePicker'
import EditablePaymentScheduleList from '@/src/app/[locale]/components/EditablePaymentScheduleList'
import {
  PaymentFrequency,
  GenerateContractPayload,
  PayementScheduleItem
} from '@/src/types'
import useSWR from 'swr'
import { fetcher } from '@/lib/utils'
import { ContractDefaultsResponse } from '@/src/types'
import { calculatePaymentAmount } from '@/src/lib/utils/loan'
import { getCanadianHolidays } from '@/src/lib/utils/date'
import { buildSchedule, frequencyOptions } from '@/src/lib/utils/schedule'

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
  const [paymentSchedule, setPaymentSchedule] = useState<PayementScheduleItem[]>([])
  const scheduleManuallyEdited = useRef(false)

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
    // Reset manual edit flag when loading defaults
    scheduleManuallyEdited.current = false
  }, [data])

  // Auto-calculate payment amount when relevant fields change
  useEffect(() => {
    if (
      !loanAmount ||
      loanAmount <= 0 ||
      !paymentFrequency ||
      !numberOfPayments ||
      numberOfPayments <= 0 ||
      !nextPaymentDate
    ) {
      // Clear payment amount if required fields are missing
      if (loanAmount === '' || numberOfPayments === 0) {
        setPaymentAmount('')
      }
      return
    }

    const totalAmount = Number(loanAmount) + Number(brokerageFee)
    const calculatedAmount = calculatePaymentAmount(
      paymentFrequency,
      totalAmount,
      interestRate,
      numberOfPayments
    )

    if (calculatedAmount !== undefined) {
      setPaymentAmount(calculatedAmount)
    } else {
      setPaymentAmount('')
    }
  }, [loanAmount, paymentFrequency, numberOfPayments, nextPaymentDate, brokerageFee, interestRate])

  // Reset manual edit flag when number of payments changes (major change)
  useEffect(() => {
    scheduleManuallyEdited.current = false
  }, [numberOfPayments, paymentFrequency])

  // Rebuild payment schedule when base parameters change (only if not manually edited)
  useEffect(() => {
    if (
      !paymentAmount ||
      paymentAmount <= 0 ||
      !paymentFrequency ||
      !numberOfPayments ||
      numberOfPayments <= 0 ||
      !nextPaymentDate ||
      scheduleManuallyEdited.current
    ) {
      return
    }

    const newSchedule = buildSchedule({
      paymentAmount: Number(paymentAmount),
      paymentFrequency,
      numberOfPayments,
      nextPaymentDate
    })
    setPaymentSchedule(newSchedule)
  }, [paymentAmount, paymentFrequency, numberOfPayments, nextPaymentDate])

  // Handle manual schedule edits
  const handleScheduleChange = (updatedSchedule: PayementScheduleItem[]) => {
    scheduleManuallyEdited.current = true
    setPaymentSchedule(updatedSchedule)
  }

  // Form submission handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)

    // Validation
    if (!loanAmount || loanAmount <= 0) {
      setFormError('Loan amount is required and must be greater than 0.')
      return
    }

    if (!paymentAmount || paymentAmount <= 0) {
      setFormError('Payment amount is required. Please ensure all fields are filled correctly.')
      return
    }

    if (!selectedAccountId) {
      setFormError('Please select a bank account.')
      return
    }

    if (!nextPaymentDate) {
      setFormError('Next payment date is required.')
      return
    }

    // Validate next payment date is at least tomorrow
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

    if (numberOfPayments <= 0) {
      setFormError('Number of payments must be greater than 0.')
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
      paymentSchedule: paymentSchedule.length > 0 
        ? paymentSchedule 
        : buildSchedule({
            paymentAmount: Number(paymentAmount),
            paymentFrequency,
            numberOfPayments,
            nextPaymentDate
          })
    }
    
    Promise.resolve(onSubmit(payload))
      .then(() => {
        setLoadingContract(false)
      })
      .catch((err) => {
        setLoadingContract(false)
        setFormError(err?.message || 'Failed to generate contract. Please try again.')
      })
  }


  if (!open) return null

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

        {/* Form */}
        <form onSubmit={handleSubmit} className='flex flex-1 flex-col overflow-hidden'>
          {/* Body */}
          <div className='flex-1 overflow-y-auto px-6 py-5'>
            <div className='space-y-4'>
              {/* Loan amount + Frequency */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label 
                    htmlFor='loanAmount'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Loan Amount (CAD) <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='loanAmount'
                    name='loanAmount'
                    type='number'
                    min={0}
                    step='0.01'
                    value={loanAmount}
                    onChange={e => {
                      const value = e.target.value
                      setLoanAmount(value === '' ? '' : Number(value))
                    }}
                    disabled={isLoading}
                    required
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
                  />
                </div>

                <div>
                  <label 
                    htmlFor='paymentFrequency'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Payment Frequency <span className='text-red-500'>*</span>
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
                  <label 
                    htmlFor='numberOfPayments'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Number of Payments <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='numberOfPayments'
                    name='numberOfPayments'
                    type='number'
                    min={1}
                    value={numberOfPayments}
                    onChange={e =>
                      setNumberOfPayments(Number(e.target.value) || 0)
                    }
                    disabled={isLoading}
                    required
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
                  />
                </div>

                <div>
                  <label 
                    htmlFor='paymentAmount'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Payment Amount (CAD) <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='paymentAmount'
                    name='paymentAmount'
                    type='number'
                    min={0}
                    step='0.01'
                    value={paymentAmount}
                    onChange={e => {
                      const value = e.target.value
                      setPaymentAmount(value === '' ? '' : Number(value))
                    }}
                    disabled={isLoading}
                    required
                    // readOnly
                    className='w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed'
                    title='This value is automatically calculated based on loan amount, frequency, and number of payments'
                  />
                  <p className='mt-1 text-xs text-gray-500'>
                    Automatically calculated
                  </p>
                </div>
              </div>

              {/* Interest + next payment */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='hidden'>
                  <label 
                    htmlFor='interestRate'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Interest Rate (%)
                  </label>
                  <input
                    id='interestRate'
                    name='interestRate'
                    type='number'
                    min={0}
                    step='0.01'
                    value={interestRate}
                    onChange={e => setInterestRate(Number(e.target.value))}
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  />
                </div>

                <div>
                  <label 
                    htmlFor='nextPaymentDate'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Next Payment Date <span className='text-red-500'>*</span>
                  </label>
                  <DatePicker
                    id='nextPaymentDate'
                    name='nextPaymentDate'
                    value={nextPaymentDate}
                    onChange={(date) => setNextPaymentDate(date || '')}
                    minDate={(() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      tomorrow.setHours(0, 0, 0, 0)
                      return tomorrow
                    })()}
                    disabled={isLoading}
                    required
                    placeholder='Select next payment date'
                    holidays={getCanadianHolidays()}
                    employmentPayDates={data?.defaults.employmentPayDates ?? []}
                    className='w-full'
                  />
                  <p className='mt-1 text-xs text-gray-500'>
                    Must be at least tomorrow (today + 1 day). Holidays are highlighted.
                  </p>
                </div>
              </div>

              {/* Brokerage Fee */}
              <div>
                <label 
                  htmlFor='brokerageFee'
                  className='mb-1 block text-sm font-medium text-gray-700'
                >
                  Brokerage Fee (CAD)
                </label>
                <input
                  id='brokerageFee'
                  name='brokerageFee'
                  type='number'
                  min={0}
                  step='0.01'
                  value={brokerageFee}
                  onChange={e => {
                    const value = e.target.value
                    setBrokerageFee(value === '' ? 0 : Number(value))
                  }}
                  disabled={isLoading}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
                  placeholder='0.00'
                />
                <p className='mt-1 text-xs text-gray-500'>
                  Brokerage fee for loan broker services.
                </p>
              </div>

              {/* Account select */}
              <div>
                <label 
                  htmlFor='bankAccount'
                  className='mb-1 block text-sm font-medium text-gray-700'
                >
                  Bank Account <span className='text-red-500'>*</span>
                </label>
                <Select
                  value={selectedAccountId}
                  onValueChange={e => {
                    setSelectedAccountId(e as string)
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
              {formError && (
                <div className='rounded-lg bg-red-50 p-3'>
                  <p className='text-sm text-red-600'>{formError}</p>
                </div>
              )}
            </div>

            {/* Payment Schedule */}
            <div className='mt-6'>
              <h3 className='mb-3 text-lg font-semibold text-gray-900'>
                Payment Schedule
              </h3>
              <EditablePaymentScheduleList
                schedule={paymentSchedule.length > 0 
                  ? paymentSchedule 
                  : buildSchedule({
                      paymentAmount,
                      paymentFrequency,
                      numberOfPayments,
                      nextPaymentDate
                    })}
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
          </div>

          {/* Footer */}
          <div className='flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-6 py-4'>
            <button
              type='button'
              onClick={onClose}
              disabled={loadingContract || isLoading}
              className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loadingContract || isLoading}
              className='rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {loadingContract ? 'Generating…' : 'Generate Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GenerateContractModal