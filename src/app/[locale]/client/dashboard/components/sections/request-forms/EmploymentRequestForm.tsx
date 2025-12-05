'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { IncomeSourceType, Frequency } from '@/src/lib/supabase/types'
import type { ClientDocumentRequest } from './types'

interface EmploymentRequestFormProps {
  request: ClientDocumentRequest
  onSuccess?: () => void
}

type EmploymentFormValues = {
  incomeSource: IncomeSourceType | ''
  // Employed fields
  occupation: string
  companyName: string
  supervisorName: string
  workPhone: string
  post: string
  payrollFrequency: Frequency | ''
  dateHired: string
  nextPayDate: string
  workAddress: string
  workProvince: string
  // Employment Insurance fields
  employmentInsuranceStartDate: string
  // Self-Employed fields
  paidByDirectDeposit: 'yes' | 'no' | ''
  selfEmployedPhone: string
  depositsFrequency: Frequency | ''
  selfEmployedStartDate: string
  // Common field for most income types
  nextDepositDate: string
}

// Income source options will be generated dynamically with translations


export default function EmploymentRequestForm({
  request,
  onSuccess
}: EmploymentRequestFormProps) {
  const t = useTranslations('Client_Dashboard')
  const tCommon = useTranslations('')

  const incomeSourceOptions = useMemo(
    () => [
      { value: 'employed' as IncomeSourceType, label: t('Income_Source_employed') || 'Employed' },
      { value: 'employment-insurance' as IncomeSourceType, label: t('Income_Source_employment-insurance') || 'Employment Insurance' },
      { value: 'self-employed' as IncomeSourceType, label: t('Income_Source_self-employed') || 'Self-Employed' },
      { value: 'csst-saaq' as IncomeSourceType, label: t('Income_Source_csst-saaq') || 'CSST/SAAQ' },
      { value: 'parental-insurance' as IncomeSourceType, label: t('Income_Source_parental-insurance') || 'Parental Insurance' },
      { value: 'retirement-plan' as IncomeSourceType, label: t('Income_Source_retirement-plan') || 'Retirement Plan' }
    ],
    [t]
  )

  const frequencyOptions = useMemo(
    () => [
      { value: 'weekly' as Frequency, label: tCommon('Weekly') || 'Weekly' },
      { value: 'bi-weekly' as Frequency, label: tCommon('Bi_Weekly') || 'Bi-Weekly' },
      { value: 'twice-monthly' as Frequency, label: tCommon('Twice_Monthly') || 'Twice Monthly' },
      { value: 'monthly' as Frequency, label: tCommon('Monthly') || 'Monthly' }
    ],
    [tCommon]
  )

  const provinceOptions = useMemo(
    () => [
      { value: 'Alberta', label: 'Alberta' },
      { value: 'British Columbia', label: 'British Columbia' },
      { value: 'Manitoba', label: 'Manitoba' },
      { value: 'New Brunswick', label: 'New Brunswick' },
      { value: 'Newfoundland and Labrador', label: 'Newfoundland and Labrador' },
      { value: 'Northwest Territories', label: 'Northwest Territories' },
      { value: 'Nova Scotia', label: 'Nova Scotia' },
      { value: 'Nunavut', label: 'Nunavut' },
      { value: 'Ontario', label: 'Ontario' },
      { value: 'Prince Edward Island', label: 'Prince Edward Island' },
      { value: 'Quebec', label: 'Quebec' },
      { value: 'Saskatchewan', label: 'Saskatchewan' },
      { value: 'Yukon', label: 'Yukon' }
    ],
    []
  )

  const [values, setValues] = useState<EmploymentFormValues>({
    incomeSource: '',
    occupation: '',
    companyName: '',
    supervisorName: '',
    workPhone: '',
    post: '',
    payrollFrequency: '',
    dateHired: '',
    nextPayDate: '',
    workAddress: '',
    workProvince: '',
    employmentInsuranceStartDate: '',
    paidByDirectDeposit: '',
    selfEmployedPhone: '',
    depositsFrequency: '',
    selfEmployedStartDate: '',
    nextDepositDate: ''
  })

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Initialize values from latest submission if available
  useEffect(() => {
    const latestSubmission = request.request_form_submissions?.[0]
    if (latestSubmission?.form_data) {
      const formData = latestSubmission.form_data
      setValues(prev => ({
        ...prev,
        incomeSource: (formData.incomeSource as IncomeSourceType) || '',
        occupation: formData.occupation || '',
        companyName: formData.companyName || '',
        supervisorName: formData.supervisorName || '',
        workPhone: formData.workPhone || '',
        post: formData.post || '',
        payrollFrequency: (formData.payrollFrequency as Frequency) || '',
        dateHired: formData.dateHired || '',
        nextPayDate: formData.nextPayDate || '',
        // Support both workAddress and businessAddress for backward compatibility
        workAddress: formData.workAddress || formData.businessAddress || '',
        workProvince: formData.workProvince || formData.businessProvince || '',
        employmentInsuranceStartDate: formData.employmentInsuranceStartDate || '',
        paidByDirectDeposit: (formData.paidByDirectDeposit as 'yes' | 'no') || '',
        selfEmployedPhone: formData.selfEmployedPhone || '',
        depositsFrequency: (formData.depositsFrequency as Frequency) || '',
        selfEmployedStartDate: formData.selfEmployedStartDate || '',
        nextDepositDate: formData.nextDepositDate || ''
      }))
    }
  }, [request.request_form_submissions])

  const updateValue = useCallback((field: keyof EmploymentFormValues, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  // Define which fields are required for each income source
  const requiredFieldsBySource: Record<IncomeSourceType, Array<keyof EmploymentFormValues>> = {
    employed: [
      'occupation',
      'companyName',
      'supervisorName',
      'workPhone',
      'payrollFrequency',
      'dateHired',
      'nextPayDate'
    ],
    'employment-insurance': ['employmentInsuranceStartDate', 'nextDepositDate'],
    'self-employed': [
      'paidByDirectDeposit',
      'selfEmployedPhone',
      'depositsFrequency',
      'nextDepositDate',
      'selfEmployedStartDate'
    ],
    'csst-saaq': ['nextDepositDate'],
    'parental-insurance': ['nextDepositDate'],
    'retirement-plan': ['nextDepositDate']
  }

  // Get fields to show based on selected income source
  const fieldsToShow = useMemo(() => {
    if (!values.incomeSource || !requiredFieldsBySource[values.incomeSource]) {
      return []
    }
    return requiredFieldsBySource[values.incomeSource]
  }, [values.incomeSource])

  const validate = useCallback((): string | null => {
    if (!values.incomeSource) {
      return t('Please_Select_Income_Source') || 'Please select your income source.'
    }

    const requiredFields = requiredFieldsBySource[values.incomeSource]
    const missingFields = requiredFields.filter(field => {
      const value = values[field]
      return !value || (typeof value === 'string' && value.trim().length === 0)
    })

    if (missingFields.length > 0) {
      return t('Please_Fill_Required_Fields') || 'Please fill all required fields.'
    }

    return null
  }, [values, t])

  const handleSubmit = useCallback(async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(false)

      const payload: Record<string, any> = {
        incomeSource: values.incomeSource
      }

      // Add fields based on income source
      if (values.incomeSource === 'employed') {
        payload.occupation = values.occupation
        payload.companyName = values.companyName
        payload.supervisorName = values.supervisorName
        payload.workPhone = values.workPhone
        payload.post = values.post
        payload.payrollFrequency = values.payrollFrequency
        payload.dateHired = values.dateHired
        payload.nextPayDate = values.nextPayDate
        payload.workAddress = values.workAddress
        payload.workProvince = values.workProvince
      } else if (values.incomeSource === 'employment-insurance') {
        payload.employmentInsuranceStartDate = values.employmentInsuranceStartDate
        payload.nextDepositDate = values.nextDepositDate
      } else if (values.incomeSource === 'self-employed') {
        payload.paidByDirectDeposit = values.paidByDirectDeposit
        payload.selfEmployedPhone = values.selfEmployedPhone
        payload.depositsFrequency = values.depositsFrequency
        payload.nextDepositDate = values.nextDepositDate
        payload.selfEmployedStartDate = values.selfEmployedStartDate
      } else {
        payload.nextDepositDate = values.nextDepositDate
      }

      const res = await fetch(
        `/api/public/document-requests/${encodeURIComponent(request.id)}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form_data: payload })
        }
      )

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Submission failed')
      }

      setSuccess(true)
      onSuccess?.()
    } catch (e: any) {
      setError(e?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }, [values, request.id, validate, onSuccess])

  const renderField = useCallback(
    (fieldId: keyof EmploymentFormValues, label: string, type: 'text' | 'date' | 'select' = 'text', options?: Array<{ value: string; label: string }>) => {
      const value = values[fieldId] || ''
      const isRequired = fieldsToShow.includes(fieldId)

      if (type === 'select') {
        return (
          <div key={fieldId} className='space-y-2'>
            <label className='mb-2 block text-sm font-medium text-primary'>
              {label}
              {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
            </label>
            <select
              value={value}
              onChange={e => updateValue(fieldId, e.target.value)}
              required={isRequired}
              className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            >
              <option value=''>
                {t('Select_Option') || 'Select an option'}
              </option>
              {options?.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )
      }

      if (type === 'date') {
        return (
          <div key={fieldId} className='space-y-2'>
            <label className='mb-2 block text-sm font-medium text-primary'>
              {label}
              {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
            </label>
            <input
              type='date'
              value={value}
              onChange={e => updateValue(fieldId, e.target.value)}
              required={isRequired}
              className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            />
          </div>
        )
      }

      return (
        <div key={fieldId} className='space-y-2'>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {label}
            {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
          </label>
          <input
            type={fieldId === 'workPhone' || fieldId === 'selfEmployedPhone' ? 'tel' : 'text'}
            value={value}
            onChange={e => updateValue(fieldId, e.target.value)}
            placeholder={label}
            required={isRequired}
            className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
          />
        </div>
      )
    },
    [values, fieldsToShow, updateValue, t]
  )

  return (
    <div className='space-y-4'>
      {/* Income Source Selection */}
      {renderField('incomeSource', tCommon('Income_Source') || 'Income Source', 'select', incomeSourceOptions)}

      {/* Employed Fields */}
      {values.incomeSource === 'employed' && (
        <>
          {renderField('occupation', tCommon('Occupation') || 'Occupation')}
          {renderField('companyName', tCommon('Company_Name') || 'Company Name')}
          {renderField('supervisorName', tCommon('Supervisor_Name') || 'Supervisor Name')}
          {renderField('workPhone', tCommon('Phone_No') || 'Work Phone')}
          {renderField('post', tCommon('Post') || 'Post/Position')}
          {renderField('payrollFrequency', tCommon('Payroll_Frequency') || 'Payroll Frequency', 'select', frequencyOptions)}
          {renderField('dateHired', tCommon('Date_Hired_Approximate') || 'Date Hired', 'date')}
          {renderField('nextPayDate', tCommon('Next_Pay_Date') || 'Next Pay Date', 'date')}
          {renderField('workAddress', tCommon('Work_Address') || 'Work Address')}
          {renderField('workProvince', tCommon('Province') || 'Province', 'select', provinceOptions)}
        </>
      )}

      {/* Employment Insurance Fields */}
      {values.incomeSource === 'employment-insurance' && (
        <>
          {renderField('employmentInsuranceStartDate', tCommon('When_Employment_Insurance_Started') || 'Employment Insurance Start Date', 'date')}
          {renderField('nextDepositDate', tCommon('Next_Deposit_Date') || 'Next Deposit Date', 'date')}
        </>
      )}

      {/* Self-Employed Fields */}
      {values.incomeSource === 'self-employed' && (
        <>
          {renderField('paidByDirectDeposit', tCommon('Paid_By_Direct_Deposit') || 'Paid By Direct Deposit', 'select', [
            { value: 'yes', label: tCommon('Yes') || 'Yes' },
            { value: 'no', label: tCommon('No') || 'No' }
          ])}
          {renderField('selfEmployedPhone', tCommon('Phone_No') || 'Phone Number')}
          {renderField('depositsFrequency', tCommon('Deposits_Frequency') || 'Deposits Frequency', 'select', frequencyOptions)}
          {renderField('selfEmployedStartDate', tCommon('Start_Date_Self_Employed') || 'Self-Employed Start Date', 'date')}
          {renderField('nextDepositDate', tCommon('Next_Deposit_Date') || 'Next Deposit Date', 'date')}
          {renderField('workAddress', tCommon('Work_Address') || 'Work Address')}
          {renderField('workProvince', tCommon('Province') || 'Province', 'select', provinceOptions)}
        </>
      )}

      {/* Other Income Types (CSST/SAAQ, Parental Insurance, Retirement Plan) */}
      {['csst-saaq', 'parental-insurance', 'retirement-plan'].includes(values.incomeSource) && (
        <>
          {renderField('nextDepositDate', tCommon('Next_Deposit_Date') || 'Next Deposit Date', 'date')}
        </>
      )}

      {/* Error */}
      {error && (
        <div className='mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <button
          type='button'
          onClick={handleSubmit}
          disabled={submitting}
          className='inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50'
        >
          {submitting
            ? t('Submitting_Dots') || 'Submitting...'
            : t('Submit_Information') || 'Submit Information'}
        </button>

        {success && (
          <span className='inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700'>
            <svg
              className='mr-2 h-4 w-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
            {t('Information_Submitted') || 'Information submitted'}
          </span>
        )}
      </div>
    </div>
  )
}
