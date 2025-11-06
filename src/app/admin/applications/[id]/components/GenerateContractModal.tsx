'use client'

import { useEffect, useMemo, useState } from 'react'
import Button from '@/src/app/[locale]/components/Button'
import Select from '@/src/app/[locale]/components/Select'
import type { PaymentFrequency } from '@/src/lib/supabase/types'

const paymentFrequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'weekly', label: 'Weekly' }
]

interface GenerateContractModalProps {
  applicationId: string
  open: boolean
  loadingContract: boolean
  onSubmit: (options: {
    paymentFrequency: PaymentFrequency
    numberOfPayments: number
    loanAmount: number
    nextPaymentDate: string
  }) => Promise<void> | void
  onClose: () => void
}

interface ContractDefaultsResponse {
  success: boolean
  defaults: {
    termMonths: number
    paymentFrequency: PaymentFrequency
    numberOfPayments?: number
    loanAmount?: number
    nextPaymentDate?: string
  }
}

const DEFAULT_PAYMENT_FREQUENCY: PaymentFrequency = 'monthly'
const DEFAULT_NUMBER_OF_PAYMENTS = 3
const DEFAULT_LOAN_AMOUNT = 0
const DEFAULT_NEXT_PAYMENT_DATE = new Date().toISOString().split('T')[0]

const normalizeDateInput = (value: unknown): string | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().split('T')[0]
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
      return null
    }

    return parsed.toISOString().split('T')[0]
  }

  return null
}

export const GenerateContractModal = ({
  applicationId,
  open,
  loadingContract,
  onSubmit,
  onClose
}: GenerateContractModalProps) => {
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>(DEFAULT_PAYMENT_FREQUENCY)
  const [numberOfPayments, setNumberOfPayments] = useState(DEFAULT_NUMBER_OF_PAYMENTS)
  const [loanAmount, setLoanAmount] = useState<number | ''>(DEFAULT_LOAN_AMOUNT)
  const [nextPaymentDate, setNextPaymentDate] = useState<string>(DEFAULT_NEXT_PAYMENT_DATE)
  const [formError, setFormError] = useState<string | null>(null)
  const [defaultsLoading, setDefaultsLoading] = useState(false)

  const frequencyOptions = useMemo(() => paymentFrequencyOptions, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const controller = new AbortController()

    const loadDefaults = async () => {
      setDefaultsLoading(true)
      setFormError(null)

      try {
        const response = await fetch(
          `/api/admin/applications/${applicationId}/contract/defaults`,
          {
            method: 'GET',
            signal: controller.signal
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to load defaults (${response.status})`)
        }

        const data = (await response.json()) as ContractDefaultsResponse

        const rawNumberOfPayments = Number(
          data.defaults?.numberOfPayments ?? data.defaults?.termMonths ?? DEFAULT_NUMBER_OF_PAYMENTS
        )
        const resolvedNumberOfPayments =
          Number.isFinite(rawNumberOfPayments) && rawNumberOfPayments > 0
            ? Math.round(rawNumberOfPayments)
            : DEFAULT_NUMBER_OF_PAYMENTS

        const rawLoanAmount = Number(data.defaults?.loanAmount ?? DEFAULT_LOAN_AMOUNT)
        const resolvedLoanAmount =
          Number.isFinite(rawLoanAmount) && rawLoanAmount > 0
            ? Math.round(rawLoanAmount * 100) / 100
            : DEFAULT_LOAN_AMOUNT

        const resolvedNextPaymentDate =
          normalizeDateInput(data.defaults?.nextPaymentDate) ?? DEFAULT_NEXT_PAYMENT_DATE

        setNumberOfPayments(resolvedNumberOfPayments)
        setLoanAmount(resolvedLoanAmount)
        setPaymentFrequency(data.defaults?.paymentFrequency ?? DEFAULT_PAYMENT_FREQUENCY)
        setNextPaymentDate(resolvedNextPaymentDate)
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        console.error('Failed to load contract defaults:', error)
        setFormError('Unable to load defaults. Please adjust values manually.')
        setNumberOfPayments(DEFAULT_NUMBER_OF_PAYMENTS)
        setLoanAmount(DEFAULT_LOAN_AMOUNT)
        setPaymentFrequency(DEFAULT_PAYMENT_FREQUENCY)
        setNextPaymentDate(DEFAULT_NEXT_PAYMENT_DATE)
      } finally {
        if (!controller.signal.aborted) {
          setDefaultsLoading(false)
        }
      }
    }

    void loadDefaults()

    return () => {
      controller.abort()
    }
  }, [applicationId, open])

  if (!open) {
    return null
  }

  const handleClose = () => {
    if (!loadingContract) {
      onClose()
    }
  }

  const handleSubmit = async () => {
    const sanitizedNumberOfPayments = Number(numberOfPayments)
    const sanitizedLoanAmount = typeof loanAmount === 'string' ? Number(loanAmount) : loanAmount
    const sanitizedNextPaymentDate = normalizeDateInput(nextPaymentDate)

    if (!Number.isFinite(sanitizedNumberOfPayments) || sanitizedNumberOfPayments <= 0) {
      setFormError('Please enter a valid number of payments greater than 0.')
      return
    }

    if (!Number.isFinite(sanitizedLoanAmount) || sanitizedLoanAmount <= 0) {
      setFormError('Please enter a valid loan amount greater than 0.')
      return
    }

    if (!sanitizedNextPaymentDate) {
      setFormError('Please select a valid next payment date.')
      return
    }

    setFormError(null)

    try {
      await onSubmit({
        paymentFrequency,
        numberOfPayments: Math.round(sanitizedNumberOfPayments),
        loanAmount: Math.round(sanitizedLoanAmount * 100) / 100,
        nextPaymentDate: sanitizedNextPaymentDate
      })
      onClose()
    } catch (error) {
      console.error('Failed to generate contract:', error)
      setFormError('Failed to generate contract. Please try again.')
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4'>
      <div className='w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl'>
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>Generate Contract</h3>
            <p className='text-sm text-gray-600'>Specify the repayment term and frequency.</p>
          </div>
          <button
            type='button'
            onClick={handleClose}
            className='rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
            aria-label='Close generate contract modal'
          >
            <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        <div className='space-y-4 px-6 py-5'>
          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700'>Number of Payments</label>
            <input
              type='number'
              min={1}
              value={Number.isFinite(numberOfPayments) ? numberOfPayments : ''}
              onChange={event => setNumberOfPayments(Number(event.target.value))}
              disabled={defaultsLoading}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
            />
            <p className='mt-1 text-xs text-gray-500'>Calculated from the contract schedule. Enter a positive integer.</p>
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700'>Payment Frequency</label>
            <Select
              value={paymentFrequency}
              onValueChange={value => setPaymentFrequency(value as PaymentFrequency)}
              options={frequencyOptions}
              disabled={defaultsLoading}
              className='bg-white'
            />
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700'>Loan Amount (CAD)</label>
            <input
              type='number'
              min={0}
              step='0.01'
              value={loanAmount === '' ? '' : loanAmount}
              onChange={event => {
                const value = event.target.value
                setLoanAmount(value === '' ? '' : Number(value))
              }}
              disabled={defaultsLoading}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
            />
            <p className='mt-1 text-xs text-gray-500'>Defaults to the application loan amount.</p>
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700'>Next Payment Date</label>
            <input
              type='date'
              value={nextPaymentDate}
              onChange={event => setNextPaymentDate(event.target.value)}
              disabled={defaultsLoading}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50'
            />
            <p className='mt-1 text-xs text-gray-500'>Defaults to the next pay date detected from IBV data.</p>
          </div>

          {defaultsLoading && <p className='text-sm text-gray-500'>Loading default values…</p>}
          {formError && <p className='text-sm text-red-600'>{formError}</p>}
        </div>

        <div className='flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4'>
          <button
            type='button'
            onClick={handleClose}
            disabled={loadingContract}
            className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            disabled={loadingContract}
            className='rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50'
          >
            {loadingContract ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default GenerateContractModal

