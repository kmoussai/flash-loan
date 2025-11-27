'use client'

import { useMemo, useState } from 'react'
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
  const tCommon = useTranslations('')

  // Helper function to check if a value is empty
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string' && value.trim().length === 0) return true
    if (Array.isArray(value) && value.length === 0) return true
    if (typeof value === 'object' && Object.keys(value).length === 0) return true
    return false
  }

  // Format date for display
  const formatDateValue = (dateStr: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Get human-readable income source label
  const getIncomeSourceLabel = (source: string): string => {
    const labels: Record<string, string> = {
      'employed': tCommon('Employed') || 'Employed',
      'employment-insurance': tCommon('Employment_Insurance') || 'Employment Insurance',
      'self-employed': tCommon('Self_Employed') || 'Self-Employed',
      'csst-saaq': tCommon('CSST_SAAQ_Benefits') || 'CSST/SAAQ',
      'parental-insurance': tCommon('Parental_Insurance_Plan') || 'Parental Insurance',
      'retirement-plan': tCommon('Retirement_Plan') || 'Retirement Plan'
    }
    return labels[source] || source
  }

  // Get human-readable frequency label
  const getFrequencyLabel = (freq: string): string => {
    const labels: Record<string, string> = {
      'weekly': tCommon('Weekly') || 'Weekly',
      'bi-weekly': tCommon('Bi_Weekly') || 'Bi-Weekly',
      'twice-monthly': tCommon('Twice_Monthly') || 'Twice Monthly',
      'monthly': tCommon('Monthly') || 'Monthly'
    }
    return labels[freq] || freq
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

  // Compact display for employment requests
  if (request.request_kind === 'employment') {
    const formData = submission.form_data || {}
    const incomeSource = formData.incomeSource as string
    const [isExpanded, setIsExpanded] = useState(false)

    return (
      <div className='space-y-2'>
        {/* Compact header with toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left transition-colors hover:bg-blue-100'
        >
          <span className='text-xs font-medium text-blue-700'>
            {t('Last_Submitted') || 'Last submitted'}: {formatDate(locale, submission.submitted_at, t('Not_Available'))}
            {incomeSource && (
              <span className='ml-2 text-blue-600'>
                • {getIncomeSourceLabel(incomeSource)}
              </span>
            )}
          </span>
          <svg
            className={`h-4 w-4 text-blue-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </button>

        {/* Compact employment info - collapsible */}
        {isExpanded && (
          <div className='rounded-lg border border-gray-200 bg-white p-3 text-sm'>
          {/* Employed fields */}
          {incomeSource === 'employed' && (
            <div className='space-y-2'>
              {(formData.occupation || formData.companyName) && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                  {formData.occupation && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Occupation') || 'Occupation'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.occupation}</span>
                    </span>
                  )}
                  {formData.companyName && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Company_Name') || 'Company'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.companyName}</span>
                    </span>
                  )}
                </div>
              )}
              {(formData.supervisorName || formData.workPhone || formData.post) && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                  {formData.supervisorName && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Supervisor_Name') || 'Supervisor'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.supervisorName}</span>
                    </span>
                  )}
                  {formData.workPhone && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Phone_No') || 'Phone'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.workPhone}</span>
                    </span>
                  )}
                  {formData.post && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Post') || 'Post'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.post}</span>
                    </span>
                  )}
                </div>
              )}
              {(formData.payrollFrequency || formData.dateHired || formData.nextPayDate) && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                  {formData.payrollFrequency && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Payroll_Frequency') || 'Frequency'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{getFrequencyLabel(formData.payrollFrequency)}</span>
                    </span>
                  )}
                  {formData.dateHired && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Date_Hired_Approximate') || 'Date Hired'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formatDateValue(formData.dateHired)}</span>
                    </span>
                  )}
                  {formData.nextPayDate && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Next_Pay_Date') || 'Next Pay'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formatDateValue(formData.nextPayDate)}</span>
                    </span>
                  )}
                </div>
              )}
              {(formData.workAddress || formData.workProvince) && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                  {formData.workAddress && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Work_Address') || 'Address'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.workAddress}</span>
                    </span>
                  )}
                  {formData.workProvince && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Province') || 'Province'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.workProvince}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Self-Employed fields */}
          {incomeSource === 'self-employed' && (
            <div className='space-y-2'>
              {(formData.paidByDirectDeposit || formData.selfEmployedPhone || formData.depositsFrequency) && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                  {formData.paidByDirectDeposit && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Paid_By_Direct_Deposit') || 'Direct Deposit'}:</span>{' '}
                      <span className='font-medium text-gray-900 capitalize'>{formData.paidByDirectDeposit}</span>
                    </span>
                  )}
                  {formData.selfEmployedPhone && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Phone_No') || 'Phone'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.selfEmployedPhone}</span>
                    </span>
                  )}
                  {formData.depositsFrequency && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Deposits_Frequency') || 'Frequency'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{getFrequencyLabel(formData.depositsFrequency)}</span>
                    </span>
                  )}
                </div>
              )}
              {(formData.selfEmployedStartDate || formData.nextDepositDate) && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                  {formData.selfEmployedStartDate && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Start_Date_Self_Employed') || 'Start Date'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formatDateValue(formData.selfEmployedStartDate)}</span>
                    </span>
                  )}
                  {formData.nextDepositDate && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Next_Deposit_Date') || 'Next Deposit'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formatDateValue(formData.nextDepositDate)}</span>
                    </span>
                  )}
                </div>
              )}
              {(formData.workAddress || formData.workProvince) && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                  {formData.workAddress && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Work_Address') || 'Address'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.workAddress}</span>
                    </span>
                  )}
                  {formData.workProvince && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Province') || 'Province'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formData.workProvince}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Employment Insurance fields */}
          {incomeSource === 'employment-insurance' && (
            <div className='space-y-2'>
              {(formData.employmentInsuranceStartDate || formData.nextDepositDate) && (
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
                  {formData.employmentInsuranceStartDate && (
                    <span>
                      <span className='text-gray-500'>{tCommon('When_Employment_Insurance_Started') || 'Start Date'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formatDateValue(formData.employmentInsuranceStartDate)}</span>
                    </span>
                  )}
                  {formData.nextDepositDate && (
                    <span>
                      <span className='text-gray-500'>{tCommon('Next_Deposit_Date') || 'Next Deposit'}:</span>{' '}
                      <span className='font-medium text-gray-900'>{formatDateValue(formData.nextDepositDate)}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Other income types */}
          {['csst-saaq', 'parental-insurance', 'retirement-plan'].includes(incomeSource) && formData.nextDepositDate && (
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
              <span>
                <span className='text-gray-500'>{tCommon('Next_Deposit_Date') || 'Next Deposit'}:</span>{' '}
                <span className='font-medium text-gray-900'>{formatDateValue(formData.nextDepositDate)}</span>
              </span>
            </div>
          )}
          </div>
        )}
      </div>
    )
  }

  // Default display for other request types
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

