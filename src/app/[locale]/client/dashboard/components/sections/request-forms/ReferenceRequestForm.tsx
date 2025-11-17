'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { ClientDocumentRequest } from './types'

interface ReferenceRequestFormProps {
  request: ClientDocumentRequest
  onSuccess?: () => void
}

type ReferenceFormValue = {
  name: string
  phone: string
  relationship: string
}

export default function ReferenceRequestForm({
  request,
  onSuccess
}: ReferenceRequestFormProps) {
  const t = useTranslations('Client_Dashboard')
  const tCommon = useTranslations('')

  const [references, setReferences] = useState<ReferenceFormValue[]>([
    { name: '', phone: '', relationship: '' },
    { name: '', phone: '', relationship: '' }
  ])

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Initialize values from latest submission if available
  useEffect(() => {
    const latestSubmission = request.request_form_submissions?.[0]
    if (latestSubmission?.form_data?.references && Array.isArray(latestSubmission.form_data.references)) {
      const submittedRefs = latestSubmission.form_data.references
      setReferences([
        {
          // Support both new format (name) and old format (first_name + last_name)
          name: submittedRefs[0]?.name || 
                [submittedRefs[0]?.first_name, submittedRefs[0]?.last_name]
                  .filter(Boolean)
                  .join(' ') || '',
          phone: submittedRefs[0]?.phone || '',
          relationship: submittedRefs[0]?.relationship || ''
        },
        {
          name: submittedRefs[1]?.name || 
                [submittedRefs[1]?.first_name, submittedRefs[1]?.last_name]
                  .filter(Boolean)
                  .join(' ') || '',
          phone: submittedRefs[1]?.phone || '',
          relationship: submittedRefs[1]?.relationship || ''
        }
      ])
    }
  }, [request.request_form_submissions])

  const referenceRelationshipOptions = useMemo(
    () => [
      { value: 'family', label: tCommon('Family') },
      { value: 'friend', label: tCommon('Friend') },
      { value: 'colleague', label: tCommon('Colleague') },
      { value: 'employer', label: tCommon('Employer') },
      { value: 'other', label: tCommon('Other') }
    ],
    [tCommon]
  )

  const updateReferenceValue = useCallback(
    (index: number, field: keyof ReferenceFormValue, value: string) => {
      setReferences(prev => {
        const next = [...prev]
        next[index] = {
          ...next[index],
          [field]: value
        }
        // Ensure we always have 2 references
        while (next.length < 2) {
          next.push({ name: '', phone: '', relationship: '' })
        }
        return next
      })
      setError(null)
    },
    []
  )

  const validate = useCallback((): string | null => {
    const requiredFields: Array<keyof ReferenceFormValue> = ['name', 'phone', 'relationship']
    
    for (let i = 0; i < 2; i++) {
      const ref = references[i]
      for (const field of requiredFields) {
        if (!ref[field] || (typeof ref[field] === 'string' && ref[field].trim().length === 0)) {
          return t('Please_Fill_Required_Fields') || 'Please fill all required fields.'
        }
      }
    }

    return null
  }, [references, t])

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

      // Normalize references - only include required fields
      const normalizedReferences = references.map(ref => ({
        name: String(ref.name ?? '').trim(),
        phone: String(ref.phone ?? '').trim(),
        relationship: String(ref.relationship ?? '').trim()
      }))

      const payload = {
        references: normalizedReferences
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
  }, [references, request.id, validate, onSuccess])

  return (
    <div className='space-y-4'>
      {[0, 1].map(index => {
        const ref = references[index] || {
          name: '',
          phone: '',
          relationship: ''
        }

        return (
          <div
            key={index}
            className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'
          >
            <h4 className='mb-4 text-sm font-semibold text-primary'>
              {index === 0
                ? t('First_Reference') || 'Reference #1'
                : t('Second_Reference') || 'Reference #2'}
            </h4>
            <div className='space-y-3'>
              <div>
                <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
                  {tCommon('Full_Name') || tCommon('Name') || 'Full Name'} *
                </label>
                <input
                  type='text'
                  value={ref.name || ''}
                  onChange={e =>
                    updateReferenceValue(index, 'name', e.target.value)
                  }
                  className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  placeholder={tCommon('Full_Name') || 'Full Name'}
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
                  {tCommon('Phone_Number')} *
                </label>
                <input
                  type='tel'
                  value={ref.phone || ''}
                  onChange={e =>
                    updateReferenceValue(index, 'phone', e.target.value)
                  }
                  className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  placeholder={tCommon('Phone_Number') || 'Phone Number'}
                  required
                />
              </div>
              <div>
                <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
                  {tCommon('Relationship')} *
                </label>
                <select
                  value={ref.relationship || ''}
                  onChange={e =>
                    updateReferenceValue(index, 'relationship', e.target.value)
                  }
                  className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  required
                >
                  <option value=''>
                    {t('Select_Option') || 'Select an option'}
                  </option>
                  {referenceRelationshipOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )
      })}

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
