'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { formatDate } from '../../../utils/formatters'
import type { ClientDocumentRequest, RequestFormSubmission } from './types'

interface SubmittedInformationDisplayProps {
  request: ClientDocumentRequest
  submission: RequestFormSubmission
  locale: string
}

export default function SubmittedInformationDisplay({
  request,
  submission,
  locale
}: SubmittedInformationDisplayProps) {
  const t = useTranslations('Client_Dashboard')

  // Helper function to check if a value is empty
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string' && value.trim().length === 0) return true
    if (Array.isArray(value) && value.length === 0) return true
    if (typeof value === 'object' && Object.keys(value).length === 0) return true
    return false
  }

  // Helper function to check if reference has any data
  const hasReferenceData = (ref: any): boolean => {
    return !!(
      ref?.name ||
      ref?.first_name ||
      ref?.last_name ||
      ref?.phone ||
      ref?.relationship ||
      ref?.notes
    )
  }

  // Filter form data to only include non-empty values
  const filteredFormData = useMemo(() => {
    return Object.entries(submission.form_data || {}).filter(([key, value]) => {
      if (key === 'references') return false // Handle references separately
      return !isEmpty(value)
    })
  }, [submission.form_data])

  // Filter references to only include those with data
  const references = useMemo(() => {
    if (
      request.request_kind === 'reference' &&
      Array.isArray(submission.form_data?.references)
    ) {
      return submission.form_data.references.filter(hasReferenceData)
    }
    return []
  }, [request.request_kind, submission.form_data])

  // Only show section if there's data to display
  const hasDataToShow = references.length > 0 || filteredFormData.length > 0

  if (!hasDataToShow) {
    return (
      <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500'>
        {t('No_Information_Provided') || 'No information provided'}
      </div>
    )
  }

  return (
    <>
      <div className='mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700'>
        {t('Last_Submitted') || 'Last submitted'}:{' '}
        {formatDate(locale, submission.submitted_at, t('Not_Available'))}
      </div>

      <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700'>
        <p className='mb-3 text-xs uppercase tracking-wide text-gray-500'>
          {t('Submitted_Information') || 'Submitted Information'}
        </p>
        <dl className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
          {/* Show references if available */}
          {references.length > 0 && (
            <div className='col-span-full space-y-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                {t('References') || 'References'}
              </p>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {references.map((ref: any, idx: number) => {
                  // Support both new format (name) and old format (first_name + last_name)
                  const name = ref?.name || 
                               [ref?.first_name, ref?.last_name]
                                 .filter(Boolean)
                                 .join(' ')
                  const phone = ref?.phone
                  const relationship = ref?.relationship
                  const notes = ref?.notes

                  // Only show reference card if it has at least one field
                  if (!name && !phone && !relationship && !notes) return null

                  return (
                    <div key={idx} className='rounded bg-white p-3 shadow-sm'>
                      <p className='text-sm font-semibold text-gray-900'>
                        {t('Reference') || 'Reference'} #{idx + 1}
                      </p>
                      <dl className='mt-2 space-y-1 text-sm text-gray-700'>
                        {name && (
                          <div>
                            <span className='block text-xs font-medium uppercase tracking-wide text-gray-500'>
                              {t('Name') || 'Name'}
                            </span>
                            <span className='block text-gray-900'>{name}</span>
                          </div>
                        )}
                        {phone && (
                          <div>
                            <span className='block text-xs font-medium uppercase tracking-wide text-gray-500'>
                              {t('Phone') || 'Phone'}
                            </span>
                            <span className='block text-gray-900'>{phone}</span>
                          </div>
                        )}
                        {relationship && (
                          <div>
                            <span className='block text-xs font-medium uppercase tracking-wide text-gray-500'>
                              {t('Relationship') || 'Relationship'}
                            </span>
                            <span className='block text-gray-900 capitalize'>
                              {relationship}
                            </span>
                          </div>
                        )}
                        {notes && (
                          <div>
                            <span className='block text-xs font-medium uppercase tracking-wide text-gray-500'>
                              {t('Notes') || 'Notes'}
                            </span>
                            <span className='block text-gray-900'>{notes}</span>
                          </div>
                        )}
                      </dl>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* Show other form fields */}
          {filteredFormData.map(([key, value]) => {
            const field = (request.form_schema?.fields as any[])?.find(
              (f: any) => f.id === key
            )
            const label = field?.label || key
            const displayValue = String(value).trim()

            // Skip if value is empty after trimming
            if (!displayValue) return null

            return (
              <div key={key} className='rounded bg-white p-3 shadow-sm'>
                <dt className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                  {label}
                </dt>
                <dd className='mt-1 break-words text-sm text-gray-900'>
                  {displayValue}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </>
  )
}

