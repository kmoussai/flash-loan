'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { ClientDocumentRequest } from './types'

interface BankInformationRequestFormProps {
  request: ClientDocumentRequest
  onSuccess?: () => void
}

type BankFormValues = {
  bank_name: string
  account_number: string
  transit_number: string
  institution_number: string
  account_name: string
}

export default function BankInformationRequestForm({
  request,
  onSuccess
}: BankInformationRequestFormProps) {
  const t = useTranslations('Client_Dashboard')
  const tCommon = useTranslations('')

  const [values, setValues] = useState<BankFormValues>({
    bank_name: '',
    account_number: '',
    transit_number: '',
    institution_number: '',
    account_name: ''
  })

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof BankFormValues, string>>>({})

  // Initialize values from latest submission if available
  useEffect(() => {
    const latestSubmission = request.request_form_submissions?.[0]
    if (latestSubmission?.form_data) {
      const formData = latestSubmission.form_data
      setValues({
        bank_name: formData.bank_name || '',
        account_number: formData.account_number || '',
        transit_number: formData.transit_number || '',
        institution_number: formData.institution_number || '',
        account_name: formData.account_name || ''
      })
    }
  }, [request.request_form_submissions])

  const validateField = useCallback((field: keyof BankFormValues, value: string): string | null => {
    const trimmedValue = value.trim()
    
    // Check if field is required and empty
    if (!trimmedValue) {
      return null // Let the general validation handle required fields
    }

    // Validate numeric fields
    if (field === 'institution_number') {
      if (!/^\d+$/.test(trimmedValue)) {
        return 'Institution number must contain only digits'
      }
      if (trimmedValue.length !== 3) {
        return 'Institution number must be exactly 3 digits'
      }
    }

    if (field === 'transit_number') {
      if (!/^\d+$/.test(trimmedValue)) {
        return 'Transit number must contain only digits'
      }
      if (trimmedValue.length !== 5) {
        return 'Transit number must be exactly 5 digits'
      }
    }

    if (field === 'account_number') {
      if (!/^\d+$/.test(trimmedValue)) {
        return 'Account number must contain only digits'
      }
      if (trimmedValue.length < 7 || trimmedValue.length > 12) {
        return 'Account number must be between 7 and 12 digits'
      }
    }

    return null
  }, [])

  const updateValue = useCallback((field: keyof BankFormValues, value: string) => {
    // Only allow digits for numeric fields
    let processedValue = value
    if (field === 'institution_number' || field === 'transit_number' || field === 'account_number') {
      processedValue = value.replace(/\D/g, '') // Remove non-digits
    }

    setValues(prev => ({
      ...prev,
      [field]: processedValue
    }))
    
    // Clear general error
    setError(null)
    
    // Validate field and set field-specific error
    const fieldError = validateField(field, processedValue)
    setFieldErrors(prev => ({
      ...prev,
      [field]: fieldError || undefined
    }))
  }, [validateField])

  const validate = useCallback((): string | null => {
    const requiredFields: Array<keyof BankFormValues> = [
      'bank_name',
      'account_number',
      'transit_number',
      'institution_number',
      'account_name'
    ]

    // Check for required fields
    for (const field of requiredFields) {
      if (!values[field] || (typeof values[field] === 'string' && values[field].trim().length === 0)) {
        return t('Please_Fill_Required_Fields') || 'Please fill all required fields.'
      }
    }

    // Check for field-specific validation errors
    for (const field of ['institution_number', 'transit_number', 'account_number'] as Array<keyof BankFormValues>) {
      const fieldError = validateField(field, values[field] || '')
      if (fieldError) {
        return fieldError
      }
    }

    return null
  }, [values, t, validateField])

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

      const payload = {
        bank_name: String(values.bank_name).trim(),
        account_number: String(values.account_number).trim(),
        transit_number: String(values.transit_number).trim(),
        institution_number: String(values.institution_number).trim(),
        account_name: String(values.account_name).trim()
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

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
        <div className='space-y-3'>
          <div>
            <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
              {tCommon('Bank_Name') || 'Bank Name'} *
            </label>
            <input
              type='text'
              value={values.bank_name || ''}
              onChange={e => updateValue('bank_name', e.target.value)}
              className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              placeholder={tCommon('Bank_Name') || 'Bank Name'}
              required
            />
          </div>

          <div>
            <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
              {tCommon('Account_Name') || 'Account Name'} *
            </label>
            <input
              type='text'
              value={values.account_name || ''}
              onChange={e => updateValue('account_name', e.target.value)}
              className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              placeholder={tCommon('Account_Name') || 'Account Name'}
              required
            />
          </div>

          <div>
            <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
              {tCommon('Institution_Number') || 'Institution Number'} *
            </label>
            <input
              type='text'
              inputMode='numeric'
              maxLength={3}
              value={values.institution_number || ''}
              onChange={e => updateValue('institution_number', e.target.value)}
              onBlur={() => {
                const error = validateField('institution_number', values.institution_number || '')
                setFieldErrors(prev => ({ ...prev, institution_number: error || undefined }))
              }}
              className={`w-full rounded border px-3 py-2 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 ${
                fieldErrors.institution_number
                  ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 bg-white focus:border-primary focus:ring-primary'
              }`}
              placeholder='000'
              required
            />
            <p className='mt-1 text-xs text-gray-500'>3 digits</p>
            {fieldErrors.institution_number && (
              <p className='mt-1 text-xs text-red-600'>{fieldErrors.institution_number}</p>
            )}
          </div>

          <div>
            <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
              {tCommon('Transit_Number') || 'Transit Number'} *
            </label>
            <input
              type='text'
              inputMode='numeric'
              maxLength={5}
              value={values.transit_number || ''}
              onChange={e => updateValue('transit_number', e.target.value)}
              onBlur={() => {
                const error = validateField('transit_number', values.transit_number || '')
                setFieldErrors(prev => ({ ...prev, transit_number: error || undefined }))
              }}
              className={`w-full rounded border px-3 py-2 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 ${
                fieldErrors.transit_number
                  ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 bg-white focus:border-primary focus:ring-primary'
              }`}
              placeholder='00000'
              required
            />
            <p className='mt-1 text-xs text-gray-500'>5 digits</p>
            {fieldErrors.transit_number && (
              <p className='mt-1 text-xs text-red-600'>{fieldErrors.transit_number}</p>
            )}
          </div>

          <div>
            <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
              {tCommon('Account_Number') || 'Account Number'} *
            </label>
            <input
              type='text'
              inputMode='numeric'
              maxLength={12}
              value={values.account_number || ''}
              onChange={e => updateValue('account_number', e.target.value)}
              onBlur={() => {
                const error = validateField('account_number', values.account_number || '')
                setFieldErrors(prev => ({ ...prev, account_number: error || undefined }))
              }}
              className={`w-full rounded border px-3 py-2 text-sm text-primary shadow-sm focus:outline-none focus:ring-1 ${
                fieldErrors.account_number
                  ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 bg-white focus:border-primary focus:ring-primary'
              }`}
              placeholder={tCommon('Account_Number') || 'Account number'}
              required
            />
            {fieldErrors.account_number && (
              <p className='mt-1 text-xs text-red-600'>{fieldErrors.account_number}</p>
            )}
          </div>
        </div>
      </div>

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

