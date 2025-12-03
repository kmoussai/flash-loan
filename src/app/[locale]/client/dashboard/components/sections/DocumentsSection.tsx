'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import type {
  ApplicationStatus,
  DocumentRequestStatus,
  RequestKind
} from '@/src/lib/supabase/types'
import {
  formatCurrency,
  formatDate,
  getDocumentStatusBadgeClass,
  getApplicationStatusBadgeClass
} from '../../utils/formatters'
import useSWR from 'swr'
import { fetcher } from '@/lib/utils'
import type { ClientDocumentRequest } from './request-forms/types'
import DocumentRequestForm from './request-forms/DocumentRequestForm'
import EmploymentRequestForm from './request-forms/EmploymentRequestForm'
import ReferenceRequestForm from './request-forms/ReferenceRequestForm'
import BankInformationRequestForm from './request-forms/BankInformationRequestForm'
import GenericRequestForm from './request-forms/GenericRequestForm'
import SubmittedInformationDisplay from './request-forms/SubmittedInformationDisplay'

interface DocumentsSectionProps {
  locale: string
}

const requestKindKeys: Partial<Record<RequestKind, string>> = {
  document: 'Request_Kind_document',
  address: 'Request_Kind_address',
  reference: 'Request_Kind_reference',
  employment: 'Request_Kind_employment',
  bank: 'Request_Kind_bank',
  other: 'Request_Kind_other'
}

const documentStatusKeys: Record<DocumentRequestStatus, string> = {
  requested: 'Requested',
  uploaded: 'Uploaded',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired'
}

export default function DocumentsSection({ locale }: DocumentsSectionProps) {
  const t = useTranslations('Client_Dashboard')
  const { data, error, isLoading, mutate } = useSWR<{
    documentRequests: ClientDocumentRequest[]
    pendingCount?: number
    totalCount?: number
  }>('/api/client/document-requests', fetcher)

  // Filter state: show only pending requests by default
  const [showOnlyPending, setShowOnlyPending] = useState(true)

  // Local inline form state for non-document requests
  const [inlineValues, setInlineValues] = useState<
    Record<string, Record<string, any>>
  >({})
  const [inlineErrors, setInlineErrors] = useState<
    Record<string, string | null>
  >({})
  const [inlineSubmitting, setInlineSubmitting] = useState<
    Record<string, boolean>
  >({})
  const [inlineSuccess, setInlineSuccess] = useState<Record<string, boolean>>(
    {}
  )

  // File upload state for document requests
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, boolean>>(
    {}
  )

  // Initialize defaults from latest submission or schema defaults when data changes
  useEffect(() => {
    const nextValues: Record<string, Record<string, any>> = {}
    ;(data?.documentRequests || []).forEach(req => {
      if (
        req.request_kind === 'document' ||
        req.request_kind === 'employment' ||
        req.request_kind === 'reference' ||
        req.request_kind === 'bank'
      )
        return

      const latest = (req.request_form_submissions || [])
        .slice()
        .sort((a, b) => {
          const at = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
          const bt = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
          return bt - at
        })[0]

      const initial: Record<string, any> = {}

      // For generic schema-based forms
      const fields: Array<any> = (req.form_schema?.fields as any[]) || []
      fields.forEach(field => {
        const fallback = field?.defaultValue ?? field?.default ?? ''
        initial[field?.id] = latest?.form_data?.[field?.id] ?? fallback
      })

      nextValues[req.id] = initial
    })
    if (Object.keys(nextValues).length > 0) {
      setInlineValues(prev => ({ ...nextValues, ...prev }))
    }
  }, [data?.documentRequests])

  const updateInlineValue = useCallback(
    (requestId: string, fieldId: string, value: any) => {
      setInlineValues(prev => ({
        ...prev,
        [requestId]: {
          ...(prev[requestId] || {}),
          [fieldId]: value
        }
      }))
    },
    []
  )

  const submitInline = useCallback(
    async (request: ClientDocumentRequest) => {
      const requestId = request.id
      const values = inlineValues[requestId] || {}

      if (
        request.request_kind !== 'document' &&
        request.request_kind !== 'employment' &&
        request.request_kind !== 'reference'
      ) {
        const fields: Array<any> = (request.form_schema?.fields as any[]) || []
        const missing = fields.filter(
          f => f?.required && !String(values[f.id] ?? '').trim()
        )
        if (missing.length > 0) {
          setInlineErrors(prev => ({
            ...prev,
            [requestId]:
              t('Please_Fill_Required_Fields') ||
              'Please fill all required fields.'
          }))
          return
        }
      }

      try {
        setInlineSubmitting(prev => ({ ...prev, [requestId]: true }))
        setInlineSuccess(prev => ({ ...prev, [requestId]: false }))
        setInlineErrors(prev => ({ ...prev, [requestId]: null }))

        const payload: Record<string, any> = { ...values }
        delete payload.references

        const res = await fetch(
          `/api/public/document-requests/${encodeURIComponent(requestId)}/submit`,
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

        setInlineSuccess(prev => ({ ...prev, [requestId]: true }))
        await mutate()
      } catch (e: any) {
        setInlineErrors(prev => ({
          ...prev,
          [requestId]: e?.message || 'Submission failed'
        }))
      } finally {
        setInlineSubmitting(prev => ({ ...prev, [requestId]: false }))
      }
    },
    [inlineValues, mutate, t]
  )

  const handleFileChange = useCallback(
    (requestId: string, file: File | null) => {
      setFiles(prev => ({ ...prev, [requestId]: file }))
      setUploadSuccess(prev => ({ ...prev, [requestId]: false }))
      setInlineErrors(prev => ({ ...prev, [requestId]: null }))
    },
    []
  )

  const uploadDocument = useCallback(
    async (request: ClientDocumentRequest) => {
      const requestId = request.id
      const file = files[requestId]

      if (!file) {
        setInlineErrors(prev => ({
          ...prev,
          [requestId]: t('Please_Select_File') || 'Please select a file'
        }))
        return
      }

      try {
        setUploading(prev => ({ ...prev, [requestId]: true }))
        setUploadSuccess(prev => ({ ...prev, [requestId]: false }))
        setInlineErrors(prev => ({ ...prev, [requestId]: null }))

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(
          `/api/public/document-requests/${encodeURIComponent(requestId)}/upload`,
          {
            method: 'POST',
            body: formData
          }
        )

        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Upload failed')
        }

        setUploadSuccess(prev => ({ ...prev, [requestId]: true }))
        setFiles(prev => ({ ...prev, [requestId]: null }))
        await mutate()
      } catch (e: any) {
        setInlineErrors(prev => ({
          ...prev,
          [requestId]: e?.message || 'Upload failed'
        }))
      } finally {
        setUploading(prev => ({ ...prev, [requestId]: false }))
      }
    },
    [files, mutate, t]
  )

  // Filter requests: show only pending if filter is enabled
  const filteredRequests = useMemo(() => {
    const requests = data?.documentRequests || []
    if (showOnlyPending) {
      return requests.filter(req => req.status === 'requested')
    }
    return requests
  }, [data?.documentRequests, showOnlyPending])

  const pendingCount = data?.pendingCount ?? 0
  const totalCount = data?.totalCount ?? 0
  const hasRequests = filteredRequests.length > 0

  const normalizedRequests = useMemo(
    () =>
      filteredRequests.map(request => {
        const statusLabelKey = documentStatusKeys[request.status]
        const statusLabel =
          (statusLabelKey ? t(statusLabelKey) : request.status) ||
          request.status

        const requestKindKey = requestKindKeys[request.request_kind]
        const requestKindLabel =
          (requestKindKey ? t(requestKindKey) : request.request_kind) ||
          request.request_kind

        const applicationStatusLabel =
          request.application &&
          (t(`Status_${request.application.application_status}`, {
            default: request.application.application_status.replace('_', ' ')
          }) ||
            request.application.application_status)

        return {
          ...request,
          statusLabel,
          requestKindLabel,
          applicationStatusLabel,
          documentName:
            request.document_type?.name ??
            t('Generic_Document_Request') ??
            'Document request',
          statusClass: getDocumentStatusBadgeClass(request.status),
          applicationStatusClass: request.application
            ? getApplicationStatusBadgeClass(
                request.application.application_status as ApplicationStatus
              )
            : null
        }
      }),
    [filteredRequests, t]
  )

  return (
    <section className='space-y-6'>
      <div className='space-y-4'>
        {/* Pending Count Header */}
        {!isLoading && totalCount > 0 && (
          <div className='rounded-lg border border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100/50 p-4 sm:p-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='space-y-1'>
                <h3 className='text-base font-semibold text-gray-900'>
                  {t('Requested_Items_Title') || 'Requested Items'}
                </h3>
                <p className='text-sm text-gray-600'>
                  {pendingCount > 0
                    ? t('Pending_Requests_Count', {
                        count: pendingCount,
                        defaultValue: `${pendingCount} pending request${pendingCount === 1 ? '' : 's'}`
                      })
                    : t('No_Pending_Requests', {
                        defaultValue: 'No pending requests'
                      })}
                </p>
              </div>
              {pendingCount > 0 && (
                <div className='flex items-center gap-2'>
                  <span className='inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white'>
                    {pendingCount}
                  </span>
                  {totalCount > pendingCount && (
                    <button
                      type='button'
                      onClick={() => setShowOnlyPending(!showOnlyPending)}
                      className='text-sm font-medium text-gray-700 underline hover:text-gray-900'
                    >
                      {showOnlyPending
                        ? t('Show_All_Requests', {
                            totalCount,
                            defaultValue: `Show all (${totalCount})`
                          })
                        : t('Show_Pending_Only', {
                            defaultValue: 'Show pending only'
                          })}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Header (shown when loading or when no requests exist) */}
        {(isLoading || (!error && totalCount === 0)) && (
          <div>
            <h3 className='text-base font-semibold text-gray-900'>
              {t('Requested_Items_Title') || 'Requested Items'}
            </h3>
            <p className='text-sm text-gray-600'>
              {t('Requested_Items_Subtitle') ||
                'Items requested for your applications'}
            </p>
          </div>
        )}

        {isLoading && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center'>
            <p className='text-sm text-gray-600'>
              {t('Requested_Items_Loading')}
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-6 text-center'>
            <p className='text-sm font-medium text-red-700'>
              {t('Requested_Items_Error')}
            </p>
            <p className='mt-2 text-xs text-red-600'>{error}</p>
            <button
              type='button'
              // onClick={fetchRequests}
              className='mt-4 inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100'
            >
              {t('Requested_Items_Retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && !hasRequests && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center sm:p-12'>
            {showOnlyPending && totalCount > 0 ? (
              <div className='space-y-3'>
                <p className='text-sm font-medium text-gray-900'>
                  {t('No_Pending_Requests_Title', {
                    defaultValue: 'No pending requests'
                  })}
                </p>
                <p className='text-sm text-gray-600'>
                  {t('All_Requests_Completed', {
                    defaultValue:
                      'All your requests have been completed. Great job!'
                  })}
                </p>
                <button
                  type='button'
                  onClick={() => setShowOnlyPending(false)}
                  className='hover:text-primary/80 mt-4 inline-flex items-center text-sm font-semibold text-primary'
                >
                  {t('View_All_Requests', {
                    totalCount,
                    defaultValue: `View all ${totalCount} request${totalCount === 1 ? '' : 's'}`
                  })}
                </button>
              </div>
            ) : (
              <p className='text-sm text-gray-600'>
                {t('Requested_Items_Empty', {
                  defaultValue: 'No document requests at this time.'
                })}
              </p>
            )}
          </div>
        )}

        {!isLoading && !error && hasRequests && (
          <ul className='space-y-3 sm:space-y-4'>
            {normalizedRequests.map(request => (
              <li
                key={request.id}
                className='rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md'
              >
                {/* Mobile-optimized card layout */}
                <div className='p-4 sm:p-6'>
                  <div className='flex flex-col gap-3 sm:gap-4'>
                    {/* Header row: Status and request kind */}
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0 flex-1'>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm'>
                          {request.requestKindLabel}
                        </p>
                        <h4 className='mt-1 text-base font-semibold text-gray-900 sm:text-lg'>
                          {request.documentName}
                        </h4>
                      </div>
                      <div className='flex flex-shrink-0 flex-col items-end gap-2'>
                        <span className={request.statusClass}>
                          {request.statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className='grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:gap-3'>
                      <div>
                        <p className='text-xs text-gray-500 sm:text-sm'>
                          {t('Requested_On', {
                            date: formatDate(
                              locale,
                              request.created_at,
                              t('Not_Available')
                            )
                          })}
                        </p>
                      </div>
                      {request.expires_at && (
                        <div>
                          <p className='text-xs font-medium text-amber-600 sm:text-sm'>
                            {t('Expires_On', {
                              date: formatDate(
                                locale,
                                request.expires_at,
                                t('Not_Available')
                              )
                            })}
                          </p>
                        </div>
                      )}
                      {request.application && (
                        <div className='col-span-full mt-1 space-y-1 border-t border-gray-100 pt-2'>
                          <p className='text-xs text-gray-500 sm:text-sm'>
                            {t('Linked_Application_Title') ||
                              'Linked Application'}
                          </p>
                          <div className='flex flex-wrap items-center gap-2'>
                            <p className='text-sm font-semibold text-gray-900'>
                              {formatCurrency(
                                locale,
                                request.application.loan_amount,
                                t('Not_Available')
                              )}
                            </p>
                            {request.applicationStatusLabel &&
                              request.applicationStatusClass && (
                                <span
                                  className={request.applicationStatusClass}
                                >
                                  {request.applicationStatusLabel}
                                </span>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document upload section */}
                {request.request_kind === 'document' && (
                  <div className='border-t border-gray-200 bg-gray-50 p-4 sm:rounded-b-lg sm:p-6'>
                    <DocumentRequestForm
                      request={request}
                      file={files[request.id] || null}
                      uploading={!!uploading[request.id]}
                      uploadSuccess={!!uploadSuccess[request.id]}
                      error={inlineErrors[request.id] || null}
                      onFileChange={file => handleFileChange(request.id, file)}
                      onUpload={() => uploadDocument(request)}
                    />
                  </div>
                )}

                {/* Non-document request forms */}
                {request.request_kind !== 'document' && (
                  <div className='border-t border-gray-200 bg-gray-50 p-4 sm:rounded-b-lg sm:p-6'>
                    {(() => {
                      const latestSubmission =
                        request.request_form_submissions?.[0]
                      const hasSubmission =
                        latestSubmission && request.status !== 'requested'

                      // If submitted, show only submitted data
                      if (hasSubmission) {
                        return (
                          <SubmittedInformationDisplay
                            request={request}
                            submission={latestSubmission}
                            locale={locale}
                          />
                        )
                      }

                      // If not submitted, show form
                      if (request.request_kind === 'employment') {
                        return (
                          <EmploymentRequestForm
                            request={request}
                            onSuccess={mutate}
                          />
                        )
                      }

                      if (request.request_kind === 'reference') {
                        return (
                          <ReferenceRequestForm
                            request={request}
                            onSuccess={mutate}
                          />
                        )
                      }

                      if (request.request_kind === 'bank') {
                        return (
                          <BankInformationRequestForm
                            request={request}
                            onSuccess={mutate}
                          />
                        )
                      }

                      const formProps = {
                        request,
                        values: inlineValues[request.id] || {},
                        errors: inlineErrors[request.id] || null,
                        submitting: !!inlineSubmitting[request.id],
                        success: !!inlineSuccess[request.id],
                        onValueChange: (fieldId: string, value: any) =>
                          updateInlineValue(request.id, fieldId, value),
                        onSubmit: () => submitInline(request)
                      }

                      return <GenericRequestForm {...formProps} />
                    })()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
