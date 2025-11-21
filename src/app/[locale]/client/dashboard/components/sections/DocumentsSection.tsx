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
  onNavigateToApplications: () => void
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

export default function DocumentsSection({
  locale,
  onNavigateToApplications
}: DocumentsSectionProps) {
  const t = useTranslations('Client_Dashboard')
  const { data, error, isLoading, mutate } = useSWR<{
    documentRequests: ClientDocumentRequest[]
  }>('/api/client/document-requests', fetcher)

  // Local inline form state for non-document requests
  const [inlineValues, setInlineValues] = useState<Record<string, Record<string, any>>>({})
  const [inlineErrors, setInlineErrors] = useState<Record<string, string | null>>({})
  const [inlineSubmitting, setInlineSubmitting] = useState<Record<string, boolean>>({})
  const [inlineSuccess, setInlineSuccess] = useState<Record<string, boolean>>({})
  
  // File upload state for document requests
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, boolean>>({})

  // Initialize defaults from latest submission or schema defaults when data changes
  useEffect(() => {
    const nextValues: Record<string, Record<string, any>> = {}
    ;(data?.documentRequests || []).forEach(req => {
      if (req.request_kind === 'document' || req.request_kind === 'employment' || req.request_kind === 'reference' || req.request_kind === 'bank') return

      const latest = (req.request_form_submissions || []).slice().sort((a, b) => {
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

  const updateInlineValue = useCallback((requestId: string, fieldId: string, value: any) => {
    setInlineValues(prev => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] || {}),
        [fieldId]: value
      }
    }))
  }, [])

  const submitInline = useCallback(async (request: ClientDocumentRequest) => {
    const requestId = request.id
    const values = inlineValues[requestId] || {}

    if (request.request_kind !== 'document' && request.request_kind !== 'employment' && request.request_kind !== 'reference') {
      const fields: Array<any> = (request.form_schema?.fields as any[]) || []
      const missing = fields.filter(f => f?.required && !String(values[f.id] ?? '').trim())
      if (missing.length > 0) {
        setInlineErrors(prev => ({
          ...prev,
          [requestId]: t('Please_Fill_Required_Fields') || 'Please fill all required fields.'
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

      const res = await fetch(`/api/public/document-requests/${encodeURIComponent(requestId)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_data: payload })
      })

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
  }, [inlineValues, mutate, t])

  const handleFileChange = useCallback((requestId: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [requestId]: file }))
    setUploadSuccess(prev => ({ ...prev, [requestId]: false }))
    setInlineErrors(prev => ({ ...prev, [requestId]: null }))
  }, [])

  const uploadDocument = useCallback(async (request: ClientDocumentRequest) => {
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

      const res = await fetch(`/api/public/document-requests/${encodeURIComponent(requestId)}/upload`, {
        method: 'POST',
        body: formData
      })

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
  }, [files, mutate, t])


  const hasRequests =
    data?.documentRequests?.length && data.documentRequests.length > 0

  const normalizedRequests = useMemo(
    () =>
      data?.documentRequests?.map(request => {
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
      }) ?? [],
    [data?.documentRequests, t]
  )

  return (
    <section className='space-y-6'>
      <div className='rounded-lg bg-background-secondary p-8'>
        <h2 className='text-lg font-semibold text-gray-900'>
          {t('Documents_Title')}
        </h2>
        <p className='mt-2 text-sm text-gray-600'>
          {t('Documents_Description')}
        </p>
        <div className='mt-6 flex flex-wrap gap-3'>
          <Link
            href='/upload-documents'
            className='hover:bg-primary/90 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition'
          >
            {t('Upload_New_Documents')}
          </Link>
          <button
            type='button'
            onClick={onNavigateToApplications}
            className='inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100'
          >
            {t('View_Document_Requests')}
          </button>
        </div>
      </div>

      <div className='space-y-4'>
        <div>
          <h3 className='text-base font-semibold text-gray-900'>
            {t('Requested_Items_Title')}
          </h3>
          <p className='text-sm text-gray-600'>
            {t('Requested_Items_Subtitle')}
          </p>
        </div>

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
          <div className='rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center'>
            <p className='text-sm text-gray-600'>
              {t('Requested_Items_Empty')}
            </p>
          </div>
        )}

        {!isLoading && !error && hasRequests && (
          <ul className='space-y-4'>
            {normalizedRequests.map(request => (
              <li
                key={request.id}
                className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'
              >
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-gray-500'>
                      {t('Requested_For')}
                    </p>
                    <p className='text-lg font-semibold text-gray-900'>
                      {request.documentName}
                    </p>
                    <p className='text-sm text-gray-600'>
                      {t('Requested_On', {
                        date: formatDate(
                          locale,
                          request.created_at,
                          t('Not_Available')
                        )
                      })}
                    </p>
                    {request.expires_at && (
                      <p className='text-sm font-medium text-amber-600'>
                        {t('Expires_On', {
                          date: formatDate(
                            locale,
                            request.expires_at,
                            t('Not_Available')
                          )
                        })}
                      </p>
                    )}
                    {request.application && (
                      <div className='space-y-1 text-sm text-gray-600'>
                        <p>{t('Linked_Application_Title')}</p>
                        <p className='font-medium text-gray-900'>
                          {formatCurrency(
                            locale,
                            request.application.loan_amount,
                            t('Not_Available')
                          )}
                        </p>
                        {request.applicationStatusLabel &&
                          request.applicationStatusClass && (
                            <span className={request.applicationStatusClass}>
                              {request.applicationStatusLabel}
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                  <div className='flex flex-col items-start gap-3 sm:items-end'>
                    <span className={request.statusClass}>
                      {request.statusLabel}
                    </span>
                    <span className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                      {request.requestKindLabel}
                    </span>
                  </div>
                </div>

                {/* Document upload section */}
                {request.request_kind === 'document' && (
                  <div className='mt-5 border-t border-gray-200 pt-4'>
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
                  <div className='mt-5 border-t border-gray-200 pt-4'>
                    {(() => {
                      const latestSubmission = request.request_form_submissions?.[0]
                      const hasSubmission = latestSubmission && request.status !== 'requested'

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
