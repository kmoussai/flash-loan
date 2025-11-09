'use client'

import { useMemo } from 'react'
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

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface RequestFormSubmission {
  id: string
  form_data: Record<string, any>
  submitted_at: string
  submitted_by?: string | null
}

interface ClientDocumentRequest {
  id: string
  loan_application_id?: string
  document_type_id?: string | null
  request_kind: RequestKind
  status: DocumentRequestStatus
  expires_at?: string | null
  requested_by?: string | null
  created_at?: string
  magic_link_sent_at?: string | null
  form_schema?: Record<string, any> | null
  request_form_submissions?: RequestFormSubmission[]
  application?: {
    id: string
    loan_amount: number | null
    application_status: string
    created_at: string
  } | null
  document_type?: {
    id: string
    name: string | null
    slug?: string | null
  } | null
}

interface DocumentsSectionProps {
  locale: string
  onNavigateToApplications: () => void
}

const requestKindKeys: Partial<Record<RequestKind, string>> = {
  document: 'Request_Kind_document',
  address: 'Request_Kind_address',
  reference: 'Request_Kind_reference',
  employment: 'Request_Kind_employment',
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
  const { data, error, isLoading } = useSWR<{
    documentRequests: ClientDocumentRequest[]
  }>('/api/client/document-requests', fetcher)

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
                    <Link
                      href={{
                        pathname: '/upload-documents',
                        query: { request: request.id }
                      }}
                      className='inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100'
                    >
                      {t('Fulfill_Request')}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
