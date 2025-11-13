'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import type {
  ApplicationStatus,
  DocumentRequestStatus,
  RequestKind,
  Frequency
} from '@/src/lib/supabase/types'
import {
  formatCurrency,
  formatDate,
  getDocumentStatusBadgeClass,
  getApplicationStatusBadgeClass
} from '../../utils/formatters'

import useSWR from 'swr'
import { fetcher } from '@/lib/utils'
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
  const tCommon = useTranslations('')
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
      if (req.request_kind === 'document') return

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

      if (req.request_kind === 'reference') {
        const prevRefs = Array.isArray(latest?.form_data?.references)
          ? latest?.form_data?.references
          : []
        initial.references = [0, 1].map(index => ({
          first_name: prevRefs?.[index]?.first_name ?? '',
          last_name: prevRefs?.[index]?.last_name ?? '',
          phone: prevRefs?.[index]?.phone ?? '',
          relationship: prevRefs?.[index]?.relationship ?? '',
          notes: prevRefs?.[index]?.notes ?? ''
        }))
      }

      // Special initialization for employment forms: keep prior values if any
      if (req.request_kind === 'employment') {
        const prev = latest?.form_data || {}
        // Ensure incomeSource exists for conditional UI
        initial['incomeSource'] = prev['incomeSource'] ?? ''
        // Carry over known employment-related fields when present
        ;[
          'occupation',
          'companyName',
          'supervisorName',
          'workPhone',
          'post',
          'payrollFrequency',
          'dateHired',
          'nextPayDate',
          'employmentInsuranceStartDate',
          'paidByDirectDeposit',
          'selfEmployedPhone',
          'depositsFrequency',
          'selfEmployedStartDate',
          'nextDepositDate'
        ].forEach(key => {
          initial[key] = prev[key] ?? initial[key] ?? ''
        })
      }

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

  const updateReferenceValue = useCallback(
    (requestId: string, index: number, field: string, value: any) => {
      setInlineValues(prev => {
        const existing = prev[requestId] || {}
        const currentRefs = Array.isArray(existing.references)
          ? existing.references
          : [0, 1].map(() => ({
              first_name: '',
              last_name: '',
              phone: '',
              relationship: '',
              notes: ''
            }))
        const nextRefs = currentRefs.map((ref, idx) =>
          idx === index
            ? {
                ...ref,
                [field]: value
              }
            : ref
        )
        return {
          ...prev,
          [requestId]: {
            ...existing,
            references: nextRefs
          }
        }
      })
    },
    []
  )

  const submitInline = useCallback(async (request: ClientDocumentRequest) => {
    const requestId = request.id
    const values = inlineValues[requestId] || {}

    // Basic required validation for schema-based forms
    let normalizedReferences: Array<{
      first_name: string
      last_name: string
      phone: string
      relationship: string
      notes: string
    }> | null = null

    if (request.request_kind !== 'document') {
      if (request.request_kind !== 'employment') {
        if (request.request_kind !== 'reference') {
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
      } else {
        // Employment validation: require incomeSource and conditionally required fields
        if (!values['incomeSource']) {
          setInlineErrors(prev => ({
            ...prev,
            [requestId]: t('Please_Select_Income_Source') || 'Please select your income source.'
          }))
          return
        }

        // Define which fields are required for each income source
        const requiredFieldsBySource: Record<string, string[]> = {
          'employed': ['occupation', 'companyName', 'supervisorName', 'workPhone', 'post', 'payrollFrequency', 'dateHired', 'nextPayDate'],
          'employment-insurance': ['employmentInsuranceStartDate', 'nextDepositDate'],
          'self-employed': ['paidByDirectDeposit', 'selfEmployedPhone', 'depositsFrequency', 'nextDepositDate', 'selfEmployedStartDate'],
          'retirement-plan': ['nextDepositDate'],
          'csst-saaq': ['nextDepositDate'],
          'parental-insurance': ['nextDepositDate']
        }

        const requiredFields = requiredFieldsBySource[values['incomeSource']] || []
        const missingFields = requiredFields.filter(fieldId => {
          const value = values[fieldId]
          return !value || (typeof value === 'string' && value.trim().length === 0)
        })

        if (missingFields.length > 0) {
          setInlineErrors(prev => ({
            ...prev,
            [requestId]: t('Please_Fill_Required_Fields') || 'Please fill all required fields.'
          }))
          return
        }
      }

      if (request.request_kind === 'reference') {
        const refs = Array.isArray(values.references) ? values.references : []
        const hasTwo = refs.length >= 2
        const normalized = hasTwo
          ? refs.slice(0, 2)
          : [0, 1].map(index => refs[index] ?? { first_name: '', last_name: '', phone: '', relationship: '', notes: '' })

        const missingRequired = normalized.some(ref =>
          ['first_name', 'last_name', 'phone', 'relationship'].some(key => {
            const raw = ref?.[key]
            return typeof raw !== 'string' || raw.trim().length === 0
          })
        )

        if (missingRequired) {
          setInlineErrors(prev => ({
            ...prev,
            [requestId]: t('Please_Fill_Required_Fields') || 'Please fill all required fields.'
          }))
          return
        }

        normalizedReferences = normalized.map(ref => ({
          first_name: String(ref.first_name ?? '').trim(),
          last_name: String(ref.last_name ?? '').trim(),
          phone: String(ref.phone ?? '').trim(),
          relationship: String(ref.relationship ?? '').trim(),
          notes: typeof ref.notes === 'string' ? ref.notes.trim() : ''
        }))
      }
    }

    try {
      setInlineSubmitting(prev => ({ ...prev, [requestId]: true }))
      setInlineSuccess(prev => ({ ...prev, [requestId]: false }))
      setInlineErrors(prev => ({ ...prev, [requestId]: null }))

      let payload: Record<string, any> = {}
      if (request.request_kind === 'reference') {
        payload = {
          references: Array.isArray(normalizedReferences)
            ? normalizedReferences
            : Array.isArray(values.references)
              ? values.references
              : []
        }
      } else if (request.request_kind === 'employment') {
        payload = values
      } else {
        payload = { ...values }
        delete payload.references
      }

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

  const renderSchemaField = useCallback((requestId: string, field: any) => {
    const value = inlineValues[requestId]?.[field.id] ?? ''
    const onChange = (e: any) => updateInlineValue(requestId, field.id, e.target ? e.target.value : e)
    const label = field.label || field.id
    const placeholder = field.placeholder || ''
    const isRequired = !!field.required

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className='space-y-2'>
            <label className='mb-2 block text-sm font-medium text-primary'>
              {label}{isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
            </label>
            <textarea
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              required={isRequired}
              className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              rows={4}
            />
            {field.helperText && <p className='text-xs text-text-secondary'>{field.helperText}</p>}
          </div>
        )
      case 'select':
        return (
          <div key={field.id} className='space-y-2'>
            <label className='mb-2 block text-sm font-medium text-primary'>
              {label}{isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
            </label>
            <select
              value={value}
              onChange={onChange}
              required={isRequired}
              className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            >
              <option value='' disabled>
                {placeholder || (t('Select_Option') as string) || 'Select an option'}
              </option>
              {(field.options || []).map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {field.helperText && <p className='text-xs text-text-secondary'>{field.helperText}</p>}
          </div>
        )
      case 'date':
        return (
          <div key={field.id} className='space-y-2'>
            <label className='mb-2 block text-sm font-medium text-primary'>
              {label}{isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
            </label>
            <input
              type='date'
              value={value}
              onChange={onChange}
              required={isRequired}
              className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            />
          </div>
        )
      case 'phone':
        return (
          <div key={field.id} className='space-y-2'>
            <label className='mb-2 block text-sm font-medium text-primary'>
              {label}{isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
            </label>
            <input
              type='tel'
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              required={isRequired}
              className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            />
          </div>
        )
      case 'number':
        return (
          <div key={field.id} className='space-y-2'>
            <label className='mb-2 block text-sm font-medium text-primary'>
              {label}{isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
            </label>
            <input
              type='number'
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              required={isRequired}
              className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            />
          </div>
        )
      case 'text':
      default:
        return (
          <div key={field.id} className='space-y-2'>
            <label className='mb-2 block text-sm font-medium text-primary'>
              {label}{isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
            </label>
            <input
              type='text'
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              required={isRequired}
              className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
            />
            {field.helperText && <p className='text-xs text-text-secondary'>{field.helperText}</p>}
          </div>
        )
    }
  }, [inlineValues, t, updateInlineValue])

  const referenceRelationshipOptions = useMemo(
    () => ([
      { value: 'family', label: tCommon('Family') },
      { value: 'friend', label: tCommon('Friend') },
      { value: 'colleague', label: tCommon('Colleague') },
      { value: 'employer', label: tCommon('Employer') },
      { value: 'other', label: tCommon('Other') }
    ]),
    [tCommon]
  )

  const renderEmploymentForm = useCallback((request: ClientDocumentRequest) => {
    const requestId = request.id
    const values = inlineValues[requestId] || {}
    const incomeSource: string = values['incomeSource'] || ''
    const schema = request.form_schema
    const fields = (schema?.fields as any[]) || []

    // Find incomeSource field from schema
    const incomeSourceField = fields.find(f => f.id === 'incomeSource')
    const otherFields = fields.filter(f => f.id !== 'incomeSource')

    // Define which fields belong to which income source
    const fieldGroups: Record<string, string[]> = {
      'employed': ['occupation', 'companyName', 'supervisorName', 'workPhone', 'post', 'payrollFrequency', 'dateHired', 'nextPayDate'],
      'employment-insurance': ['employmentInsuranceStartDate', 'nextDepositDate'],
      'self-employed': ['paidByDirectDeposit', 'selfEmployedPhone', 'depositsFrequency', 'nextDepositDate', 'selfEmployedStartDate'],
      'retirement-plan': ['nextDepositDate'],
      'csst-saaq': ['nextDepositDate'],
      'parental-insurance': ['nextDepositDate']
    }

    // Get fields to show based on selected income source
    const fieldsToShow = incomeSource && fieldGroups[incomeSource]
      ? otherFields.filter(f => fieldGroups[incomeSource].includes(f.id))
      : []

    return (
      <div className='space-y-4'>
        {/* Render incomeSource as select dropdown from schema */}
        {incomeSourceField && renderSchemaField(requestId, incomeSourceField)}

        {/* Conditionally render fields based on incomeSource */}
        {fieldsToShow.map(field => renderSchemaField(requestId, field))}
      </div>
    )
  }, [inlineValues, renderSchemaField, updateInlineValue])

  const renderReferenceForm = useCallback(
    (request: ClientDocumentRequest) => {
      const requestId = request.id
      const values = inlineValues[requestId] || {}
      const references: Array<any> = Array.isArray(values.references)
        ? values.references
        : [0, 1].map(() => ({
            first_name: '',
            last_name: '',
            phone: '',
            relationship: '',
            notes: ''
          }))

      return (
        <div className='space-y-6'>
          {[0, 1].map(index => {
            const ref = references[index] || {}
            return (
              <div key={index} className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
                <div className='mb-3 flex items-center justify-between'>
                  <h4 className='text-sm font-semibold text-primary'>
                    {index === 0 ? t('First_Reference') || 'Reference #1' : t('Second_Reference') || 'Reference #2'}
                  </h4>
                </div>
                <div className='space-y-4'>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
                        {tCommon('First_Name')} *
                      </label>
                      <input
                        type='text'
                        value={ref.first_name || ''}
                        onChange={e => updateReferenceValue(requestId, index, 'first_name', e.target.value)}
                        className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
                        {tCommon('Last_Name')} *
                      </label>
                      <input
                        type='text'
                        value={ref.last_name || ''}
                        onChange={e => updateReferenceValue(requestId, index, 'last_name', e.target.value)}
                        className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                      />
                    </div>
                  </div>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
                        {tCommon('Phone_Number')} *
                      </label>
                      <input
                        type='tel'
                        value={ref.phone || ''}
                        onChange={e => updateReferenceValue(requestId, index, 'phone', e.target.value)}
                        className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
                        {tCommon('Relationship')} *
                      </label>
                      <select
                        value={ref.relationship || ''}
                        onChange={e => updateReferenceValue(requestId, index, 'relationship', e.target.value)}
                        className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                        required
                      >
                        <option value=''>
                          {t('Select_Option') ||
                            tCommon('Select_Option') ||
                            'Select an option'}
                        </option>
                        {referenceRelationshipOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className='mb-1 block text-xs font-medium text-primary sm:text-sm'>
                      {t('Additional_Notes') || tCommon('Notes') || 'Notes'}
                    </label>
                    <textarea
                      value={ref.notes || ''}
                      onChange={e => updateReferenceValue(requestId, index, 'notes', e.target.value)}
                      rows={3}
                      className='w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                      placeholder={t('Provide_Details') || 'Optional'}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    },
    [inlineValues, referenceRelationshipOptions, t, tCommon, updateReferenceValue]
  )

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
                    {request.status === 'uploaded' || request.status === 'verified' ? (
                      <div className='rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700'>
                        {t('File_Uploaded_Successfully') || 'File uploaded successfully'}
                        {request.status === 'verified' && (
                          <span className='ml-2 font-medium'>
                            {t('Verified') || 'Verified'}
                          </span>
                        )}
                      </div>
                    ) : request.status === 'rejected' ? (
                      <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                        {t('Document_Rejected') || 'Document was rejected. Please upload a new file.'}
                      </div>
                    ) : (
                      <div className='space-y-4'>
                        <div>
                          <label htmlFor={`file-${request.id}`} className='mb-2 block text-sm font-medium text-primary'>
                            {t('Select_File') || 'Select File'} *
                          </label>
                          <input
                            type='file'
                            id={`file-${request.id}`}
                            onChange={e => handleFileChange(request.id, e.target.files?.[0] || null)}
                            accept='image/jpeg,image/png,application/pdf'
                            className='block w-full cursor-pointer text-sm text-gray-700 file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90'
                          />
                          <p className='mt-1 text-xs text-gray-500'>
                            {t('Allowed_Formats') || 'Allowed: JPEG, PNG, PDF. Max size: 10MB'}
                          </p>
                          {files[request.id] && (
                            <p className='mt-2 text-sm text-gray-600'>
                              {t('Selected') || 'Selected'}: {files[request.id]?.name}
                            </p>
                          )}
                        </div>

                        {inlineErrors[request.id] && (
                          <div className='rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                            {inlineErrors[request.id]}
                          </div>
                        )}

                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                          <button
                            type='button'
                            onClick={() => uploadDocument(request)}
                            disabled={!files[request.id] || !!uploading[request.id]}
                            className='inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50'
                          >
                            {uploading[request.id]
                              ? (t('Uploading_Dots') || 'Uploading...')
                              : (t('Upload_Document') || 'Upload Document')}
                          </button>

                          {uploadSuccess[request.id] && (
                            <span className='inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700'>
                              <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                              </svg>
                              {t('Uploaded_Successfully') || 'Uploaded successfully'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
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
                          <>
                            <div className='mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700'>
                              {t('Last_Submitted') || 'Last submitted'}:{' '}
                              {formatDate(locale, latestSubmission.submitted_at, t('Not_Available'))}
                            </div>
                            
                            {/* Display submitted data */}
                            {(() => {
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
                                return !!(ref?.first_name || ref?.last_name || ref?.phone || ref?.relationship || ref?.notes)
                              }

                              // Filter form data to only include non-empty values
                              const filteredFormData = Object.entries(latestSubmission.form_data || {}).filter(([key, value]) => {
                                if (key === 'references') return false // Handle references separately
                                return !isEmpty(value)
                              })

                              // Filter references to only include those with data
                              const references = request.request_kind === 'reference' && Array.isArray(latestSubmission.form_data?.references)
                                ? latestSubmission.form_data.references.filter(hasReferenceData)
                                : []

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
                                            const name = [ref?.first_name, ref?.last_name].filter(Boolean).join(' ')
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
                                                      <span className='block text-gray-900 capitalize'>{relationship}</span>
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
                                      const field = (request.form_schema?.fields as any[])?.find((f: any) => f.id === key)
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
                              )
                            })()}
                          </>
                        )
                      }
                      
                      // If not submitted, show form
                      return (
                        <>
                          {/* Dynamic renderer */}
                          {request.request_kind === 'employment' ? (
                            renderEmploymentForm(request)
                          ) : request.request_kind === 'reference' ? (
                            renderReferenceForm(request)
                          ) : (
                            <div className='space-y-4'>
                              {((request.form_schema?.fields as any[]) || []).length === 0 ? (
                                <textarea
                                  value={inlineValues[request.id]?.['notes'] ?? ''}
                                  onChange={e => updateInlineValue(request.id, 'notes', e.target.value)}
                                  placeholder={t('Provide_Details') || 'Provide the requested information here'}
                                  className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                                  rows={4}
                                />
                              ) : (
                                (request.form_schema?.fields as any[]).map(field => renderSchemaField(request.id, field))
                              )}
                            </div>
                          )}

                          {/* Error */}
                          {inlineErrors[request.id] && (
                            <div className='mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                              {inlineErrors[request.id]}
                            </div>
                          )}

                          {/* Actions */}
                          <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                            <button
                              type='button'
                              onClick={() => submitInline(request)}
                              disabled={!!inlineSubmitting[request.id]}
                              className='inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50'
                            >
                              {inlineSubmitting[request.id]
                                ? (t('Submitting_Dots') || 'Submitting...')
                                : (t('Submit_Information') || 'Submit Information')}
                            </button>

                            {inlineSuccess[request.id] && (
                              <span className='inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700'>
                                <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                                </svg>
                                {t('Information_Submitted') || 'Information submitted'}
                              </span>
                            )}
                          </div>
                        </>
                      )
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
