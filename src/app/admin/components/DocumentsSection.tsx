'use client'

import { useEffect, useState } from 'react'
import ClientDocumentsSection from './ClientDocumentsSection'

type RequestKind = 'document' | 'address' | 'reference' | 'employment' | 'bank' | 'other'

interface DocumentItem {
  name: string
  path: string
  size: number | null
  last_modified: string | null
  document_name?: string | null
  mime_type?: string | null
  signed_url?: string | null
}

interface DocumentsResponse {
  client_id: string
  application_id?: string | null
  client_files: DocumentItem[]
  application_files: DocumentItem[]
}

interface RequestFormSubmission {
  id: string
  form_data: Record<string, any>
  submitted_at: string
  submitted_by?: string | null
}

interface RequestTypeOption {
  id: string
  name: string
  slug: string
  default_request_kind: RequestKind
  default_form_schema?: Record<string, any>
  description?: string | null
}

interface AdminRequestItem {
  id: string
  status: string
  request_kind: RequestKind
  form_schema?: Record<string, any>
  expires_at?: string | null
  magic_link_sent_at?: string | null
  uploaded_file_key?: string | null
  request_link?: string | null
  group_link?: string | null
  group_id?: string | null
  document_type?: {
    id: string
    name: string
    slug: string
    default_request_kind?: RequestKind
    default_form_schema?: Record<string, any>
    description?: string | null
  }
  request_form_submissions?: RequestFormSubmission[]
}

export default function DocumentsSection({
  clientId,
  applicationId
}: {
  clientId: string
  applicationId?: string
}) {
  const [data, setData] = useState<DocumentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMime, setPreviewMime] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string | null>(null)
  const [previewClientInfo, setPreviewClientInfo] = useState<{
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    date_of_birth: string | null
    national_id: string | null
  } | null>(null)
  const [previewIsIdDocument, setPreviewIsIdDocument] = useState(false)
  const [previewIsSpecimenDocument, setPreviewIsSpecimenDocument] = useState(false)
  const [previewBankInfo, setPreviewBankInfo] = useState<Record<string, any> | null>(null)
  const [previewRequestId, setPreviewRequestId] = useState<string | null>(null)
  const [loadingDocumentView, setLoadingDocumentView] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  // Forward-compatible with future non-file (form) requests
  const [requestTypes, setRequestTypes] = useState<RequestTypeOption[]>([])
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>(
    {}
  )
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [requests, setRequests] = useState<AdminRequestItem[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [submittingRequest, setSubmittingRequest] = useState<
    Record<string, boolean>
  >({})

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ client_id: clientId })
      if (applicationId) params.set('application_id', applicationId)
      const res = await fetch(`/api/admin/documents?${params.toString()}`)
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Failed to load documents')
      }
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clientId) fetchDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, applicationId])

  useEffect(() => {
    if (applicationId) {
      loadDocTypes()
      loadRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId])

  const loadDocTypes = async () => {
    try {
      const res = await fetch('/api/admin/document-types')
      if (!res.ok) throw new Error('Failed to load document types')
      const json = await res.json()
      // Accept additional fields if backend later adds them (kind/requires_upload)
      setRequestTypes(
        (json.document_types || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          default_request_kind:
            (d.default_request_kind as RequestKind) || 'document',
          default_form_schema:
            typeof d.default_form_schema === 'object' && d.default_form_schema !== null
              ? d.default_form_schema
              : undefined,
          description: d.description || null
        }))
      )
    } catch {}
  }

  const loadRequests = async () => {
    if (!applicationId) return
    try {
      setLoadingRequests(true)
      const res = await fetch(
        `/api/admin/loan-apps/${applicationId}/document-requests`
      )
      if (!res.ok) throw new Error('Failed to load requests')
      const json = await res.json()
      const normalized: AdminRequestItem[] = (json.requests || []).map(
        (r: any) => ({
          ...r,
          request_kind: (r.request_kind || 'document') as RequestKind,
          form_schema:
            typeof r.form_schema === 'object' && r.form_schema !== null
              ? r.form_schema
              : undefined,
          document_type: r.document_type
            ? {
                id: r.document_type.id,
                name: r.document_type.name,
                slug: r.document_type.slug,
                default_request_kind:
                  (r.document_type.default_request_kind as RequestKind) ||
                  'document',
                default_form_schema:
                  typeof r.document_type.default_form_schema === 'object' &&
                  r.document_type.default_form_schema !== null
                    ? r.document_type.default_form_schema
                    : undefined,
                description: r.document_type.description || null
              }
            : undefined,
          request_form_submissions: Array.isArray(r.request_form_submissions)
            ? r.request_form_submissions.map((sub: any) => ({
                id: sub.id,
                form_data: sub.form_data || {},
                submitted_at: sub.submitted_at,
                submitted_by: sub.submitted_by ?? null
              }))
            : []
        })
      )
      setRequests(normalized)
    } catch {
      setRequests([])
    } finally {
      setLoadingRequests(false)
    }
  }

  const toggleType = (id: string) => {
    setSelectedTypes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const submitRequestDocs = async () => {
    if (!applicationId) return
    const ids = Object.keys(selectedTypes).filter(id => selectedTypes[id])
    if (ids.length === 0) return

    const payloadRequests = ids
      .map(id => {
        const type = requestTypes.find(rt => rt.id === id)
        if (!type) return null
        return {
          document_type_id: id,
          request_kind: type.default_request_kind,
          form_schema: type.default_request_kind === 'document'
            ? undefined
            : type.default_form_schema || {}
        }
      })
      .filter(Boolean) as Array<{
        document_type_id: string
        request_kind: RequestKind
        form_schema?: Record<string, any>
      }>

    if (!payloadRequests.length) return
    try {
      setSending(true)
      const res = await fetch(
        `/api/admin/loan-apps/${applicationId}/request-docs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: payloadRequests, note })
        }
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to request documents')
      }
      setRequestModalOpen(false)
      setSelectedTypes({})
      setNote('')
      await loadRequests()
    } catch (e) {
      // noop; could display toast
    } finally {
      setSending(false)
    }
  }

  const formatSize = (size: number | null) => {
    if (!size || size <= 0) return '—'
    const units = ['B', 'KB', 'MB', 'GB']
    let s = size
    let i = 0
    while (s >= 1024 && i < units.length - 1) {
      s /= 1024
      i++
    }
    return `${s.toFixed(1)} ${units[i]}`
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getFieldLabel = (
    schema: Record<string, any> | undefined,
    fieldId: string
  ) => {
    const fields = Array.isArray(schema?.fields) ? schema?.fields : []
    const match = fields.find((f: any) => f?.id === fieldId)
    return match?.label || fieldId
  }

  const formatSubmissionValue = (value: any) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    return JSON.stringify(value)
  }

  const formatDateValue = (dateString: string | null | undefined) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatEmploymentOverview = (formData: Record<string, any>) => {
    const incomeSource = formData.incomeSource
    if (!incomeSource) return 'No employment information provided.'

    const parts: (string | JSX.Element)[] = []

    switch (incomeSource) {
      case 'employed':
        parts.push(
          <>
            The applicant is <strong>employed</strong>
          </>
        )
        if (formData.occupation) {
          parts.push(
            <>
              {' '}as a <strong>{formData.occupation}</strong>
            </>
          )
        }
        if (formData.companyName) {
          parts.push(
            <>
              {' '}at <strong>{formData.companyName}</strong>
            </>
          )
        }
        if (formData.post) {
          parts.push(` (Post: ${formData.post})`)
        }
        if (formData.supervisorName) {
          parts.push(
            <>
              {' '}under supervisor <strong>{formData.supervisorName}</strong>
            </>
          )
        }
        if (formData.workPhone) {
          parts.push(` (Phone: ${formData.workPhone})`)
        }
        if (formData.payrollFrequency) {
          const freq = formData.payrollFrequency.replace('-', ' ')
          parts.push(
            <>
              {' '}with <strong>{freq}</strong> payroll
            </>
          )
        }
        if (formData.dateHired) {
          const date = formatDateValue(formData.dateHired)
          if (date) {
            parts.push(
              <>
                . Hired on <strong>{date}</strong>
              </>
            )
          }
        }
        if (formData.nextPayDate) {
          const date = formatDateValue(formData.nextPayDate)
          if (date) {
            parts.push(
              <>
                . Next pay date: <strong>{date}</strong>
              </>
            )
          }
        }
        // Check for address in both camelCase (form_data) and snake_case (income_fields) formats
        const workAddress = formData.workAddress || formData.work_address
        const workProvince = formData.workProvince || formData.work_province
        if (workAddress || workProvince) {
          const addressParts = [workAddress, workProvince].filter(Boolean)
          if (addressParts.length > 0) {
            parts.push(
              <>
                . Work address: <strong>{addressParts.join(', ')}</strong>
              </>
            )
          }
        }
        break

      case 'employment-insurance':
        parts.push(
          <>
            The applicant receives <strong>Employment Insurance</strong> benefits
          </>
        )
        if (formData.employmentInsuranceStartDate) {
          const date = formatDateValue(formData.employmentInsuranceStartDate)
          if (date) {
            parts.push(
              <>
                {' '}starting <strong>{date}</strong>
              </>
            )
          }
        }
        if (formData.nextDepositDate) {
          const date = formatDateValue(formData.nextDepositDate)
          if (date) {
            parts.push(
              <>
                . Next deposit: <strong>{date}</strong>
              </>
            )
          }
        }
        break

      case 'self-employed':
        parts.push(
          <>
            The applicant is <strong>self-employed</strong>
          </>
        )
        if (formData.paidByDirectDeposit) {
          const paid = formData.paidByDirectDeposit === 'yes' ? 'Yes' : 'No'
          parts.push(
            <>
              . Paid by direct deposit: <strong>{paid}</strong>
            </>
          )
        }
        if (formData.selfEmployedPhone) {
          parts.push(
            <>
              {' '}Contact: <strong>{formData.selfEmployedPhone}</strong>
            </>
          )
        }
        if (formData.depositsFrequency) {
          const freq = formData.depositsFrequency.replace('-', ' ')
          parts.push(
            <>
              {' '}Deposits frequency: <strong>{freq}</strong>
            </>
          )
        }
        if (formData.selfEmployedStartDate) {
          const date = formatDateValue(formData.selfEmployedStartDate)
          if (date) {
            parts.push(
              <>
                . Started: <strong>{date}</strong>
              </>
            )
          }
        }
        if (formData.nextDepositDate) {
          const date = formatDateValue(formData.nextDepositDate)
          if (date) {
            parts.push(
              <>
                . Next deposit: <strong>{date}</strong>
              </>
            )
          }
        }
        // Check for address in both camelCase (form_data) and snake_case (income_fields) formats
        const businessAddress = formData.workAddress || formData.work_address || formData.businessAddress || formData.business_address
        const businessProvince = formData.workProvince || formData.work_province || formData.businessProvince || formData.business_province
        if (businessAddress || businessProvince) {
          const addressParts = [businessAddress, businessProvince].filter(Boolean)
          if (addressParts.length > 0) {
            parts.push(
              <>
                . Business address: <strong>{addressParts.join(', ')}</strong>
              </>
            )
          }
        }
        break

      case 'retirement-plan':
        parts.push(
          <>
            The applicant receives <strong>Retirement Plan</strong> benefits
          </>
        )
        if (formData.nextDepositDate) {
          const date = formatDateValue(formData.nextDepositDate)
          if (date) {
            parts.push(
              <>
                . Next deposit: <strong>{date}</strong>
              </>
            )
          }
        }
        break

      case 'csst-saaq':
        parts.push(
          <>
            The applicant receives <strong>CSST/SAAQ disability benefits</strong>
          </>
        )
        if (formData.nextDepositDate) {
          const date = formatDateValue(formData.nextDepositDate)
          if (date) {
            parts.push(
              <>
                . Next deposit: <strong>{date}</strong>
              </>
            )
          }
        }
        break

      case 'parental-insurance':
        parts.push(
          <>
            The applicant receives <strong>Parental Insurance</strong> benefits
          </>
        )
        if (formData.nextDepositDate) {
          const date = formatDateValue(formData.nextDepositDate)
          if (date) {
            parts.push(
              <>
                . Next deposit: <strong>{date}</strong>
              </>
            )
          }
        }
        break

      default:
        return <>Unknown employment type.</>
    }

    return parts.length > 0 ? <>{parts}</> : <>No employment details provided.</>
  }

  const formatReferenceOverview = (references: Array<any>) => {
    if (!Array.isArray(references) || references.length === 0) {
      return <>No references provided.</>
    }

    return (
      <div className='space-y-4'>
        {references.map((ref: any, idx: number) => {
          const fullName = [ref?.first_name, ref?.last_name].filter(Boolean).join(' ')
          const relationship = ref?.relationship ? ref.relationship.charAt(0).toUpperCase() + ref.relationship.slice(1) : null
          
          return (
            <div key={idx} className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
              <div className='mb-2 flex items-start justify-between'>
                <h4 className='text-sm font-semibold text-gray-900'>
                  Reference #{idx + 1}
                </h4>
                {relationship && (
                  <span className='inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700'>
                    {relationship}
                  </span>
                )}
              </div>
              <div className='space-y-2 text-sm text-gray-700'>
                {fullName && (
                  <div className='flex items-start gap-2'>
                    <svg className='mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
                    </svg>
                    <span className='text-gray-900'>
                      <strong>{fullName}</strong>
                    </span>
                  </div>
                )}
                {ref?.phone && (
                  <div className='flex items-start gap-2'>
                    <svg className='mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                    </svg>
                    <a href={`tel:${ref.phone}`} className='text-blue-600 hover:text-blue-800 hover:underline'>
                      {ref.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const openPreview = (file: DocumentItem) => {
    if (!file.signed_url) return
    setPreviewUrl(file.signed_url)
    setPreviewMime(file.mime_type || null)
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewMime(null)
    setPreviewFileName(null)
    setPreviewClientInfo(null)
    setPreviewIsIdDocument(false)
    setPreviewIsSpecimenDocument(false)
    setPreviewBankInfo(null)
    setPreviewRequestId(null)
  }

  const openDocumentRequestView = async (requestId: string) => {
    try {
      setLoadingDocumentView(true)
      const res = await fetch(`/api/admin/document-requests/${requestId}/view`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load document')
      }
      const data = await res.json()
      setPreviewUrl(data.signed_url)
      setPreviewMime(data.mime_type || 'application/octet-stream')
      setPreviewFileName(data.file_name || 'document')
      setPreviewIsIdDocument(data.is_id_document || false)
      setPreviewIsSpecimenDocument(data.is_specimen_document || false)
      setPreviewClientInfo(data.client_info || null)
      setPreviewBankInfo(data.bank_info || null)
      setPreviewRequestId(requestId)
    } catch (e: any) {
      alert(e?.message || 'Failed to load document')
    } finally {
      setLoadingDocumentView(false)
    }
  }

  const handleVerify = async (reqId: string) => {
    try {
      setSubmittingRequest(prev => ({ ...prev, [reqId]: true }))
      const res = await fetch(`/api/admin/document-requests/${reqId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verified' })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to verify')
      }
      await loadRequests()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingRequest(prev => ({ ...prev, [reqId]: false }))
    }
  }

  const handleReject = async (reqId: string) => {
    try {
      setSubmittingRequest(prev => ({ ...prev, [reqId]: true }))
      const res = await fetch(`/api/admin/document-requests/${reqId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to reject')
      }
      await loadRequests()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingRequest(prev => ({ ...prev, [reqId]: false }))
    }
  }

  const handleRequestAgain = async (reqId: string) => {
    try {
      setSubmittingRequest(prev => ({ ...prev, [reqId]: true }))
      const res = await fetch(`/api/admin/document-requests/${reqId}/resend`, {
        method: 'POST'
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to send magic link')
      }
      await loadRequests()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingRequest(prev => ({ ...prev, [reqId]: false }))
    }
  }

  const handleDeleteRequest = async (reqId: string) => {
    if (!confirm('Are you sure you want to delete this document request?'))
      return
    try {
      setSubmittingRequest(prev => ({ ...prev, [reqId]: true }))
      const res = await fetch(`/api/admin/document-requests/${reqId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to delete request')
      }
      await loadRequests()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingRequest(prev => ({ ...prev, [reqId]: false }))
    }
  }

  const documentTypeOptions = requestTypes.filter(
    rt => rt.default_request_kind === 'document'
  )
  const infoRequestOptions = requestTypes.filter(
    rt => rt.default_request_kind !== 'document'
  )

  return (
    <>
      {/* All Client Documents - Only show when applicationId is not provided */}
      {typeof applicationId === 'undefined' && (
        <div className='mb-6'>
          <ClientDocumentsSection clientId={clientId} active={true} />
        </div>
      )}

      {/* Requested Items Status - Modern Design */}
      {typeof applicationId !== 'undefined' && (
        <div className='mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4'>
            <div className='flex items-center gap-2'>
              <svg
                className='h-5 w-5 text-indigo-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                />
              </svg>
              <h3 className='text-base font-bold text-gray-900'>
                Requested Items
              </h3>
            </div>
            <div className='flex items-center gap-2'>
              {typeof applicationId !== 'undefined' && (
                <button
                  onClick={() => setRequestModalOpen(true)}
                  className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg'
                >
                  <svg
                    className='h-4 w-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 4v16m8-8H4'
                    />
                  </svg>
                  Request Items
                </button>
              )}
              <button
                onClick={async () => {
                  if (applicationId) {
                    await loadRequests()
                  }
                }}
                disabled={loading || loadingRequests}
                className='rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50'
              >
                {loading || loadingRequests ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className='p-6'>
            {loadingRequests ? (
              <div className='flex items-center justify-center py-8'>
                <div className='text-center'>
                  <div className='mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600'></div>
                  <p className='mt-2 text-sm text-gray-600'>
                    Loading requests…
                  </p>
                </div>
              </div>
            ) : requests.length === 0 ? (
              <div className='py-8 text-center'>
                <svg
                  className='mx-auto h-12 w-12 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                <p className='mt-3 text-sm font-medium text-gray-900'>
                  No requests yet
                </p>
                <p className='mt-1 text-xs text-gray-500'>
                  Request items to begin the workflow
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {Object.entries(
                  requests.reduce((acc: Record<string, any[]>, r: any) => {
                    const key = r.group_id || 'ungrouped'
                    if (!acc[key]) acc[key] = []
                    acc[key].push(r)
                    return acc
                  }, {})
                ).map(([groupId, groupRequests]) => {
                  const anyWithGroupLink = (groupRequests as any[]).find(
                    (gr: any) => gr.group_link
                  )
                  
                  // Debug: log if group_link is missing
                  if (groupId !== 'ungrouped' && !anyWithGroupLink?.group_link) {
                    console.warn('Group link missing for group:', groupId, 'Requests:', groupRequests)
                  }
                  
                  return (
                    <div
                      key={groupId}
                      className='overflow-hidden rounded-xl border border-gray-200 bg-white'
                    >
                      <div className='flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-5 py-3'>
                        <div className='flex items-center gap-2'>
                          <svg
                            className='h-4 w-4 text-gray-500'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                            />
                          </svg>
                          <span className='text-sm font-semibold text-gray-900'>
                            {groupId === 'ungrouped'
                              ? 'Ungrouped Items'
                              : `Group: ${groupId}`}
                          </span>
                        </div>
                        {anyWithGroupLink?.group_link && (
                          <button
                            onClick={async (e) => {
                              const linkToCopy = anyWithGroupLink.group_link
                              if (!linkToCopy) {
                                alert('No link available to copy.')
                                return
                              }

                              const button = e.currentTarget
                              const originalText = button.innerHTML

                              try {
                                // Try modern clipboard API first
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                  await navigator.clipboard.writeText(linkToCopy)
                                } else {
                                  // Fallback: use the old execCommand method
                                  const textArea = document.createElement('textarea')
                                  textArea.value = linkToCopy
                                  textArea.style.position = 'fixed'
                                  textArea.style.left = '-999999px'
                                  textArea.style.top = '-999999px'
                                  document.body.appendChild(textArea)
                                  textArea.focus()
                                  textArea.select()
                                  
                                  try {
                                    const successful = document.execCommand('copy')
                                    if (!successful) {
                                      throw new Error('execCommand failed')
                                    }
                                  } finally {
                                    document.body.removeChild(textArea)
                                  }
                                }

                                // Show temporary success feedback
                                button.innerHTML = `
                                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Copied!
                                `
                                button.classList.add('bg-emerald-50', 'border-emerald-300', 'text-emerald-700')
                                button.classList.remove('bg-indigo-50', 'border-indigo-300', 'text-indigo-700')
                                setTimeout(() => {
                                  button.innerHTML = originalText
                                  button.classList.remove('bg-emerald-50', 'border-emerald-300', 'text-emerald-700')
                                  button.classList.add('bg-indigo-50', 'border-indigo-300', 'text-indigo-700')
                                }, 2000)
                              } catch (err: any) {
                                console.error('Failed to copy link:', err)
                                // Last resort: show the link in a prompt so user can manually copy
                                const userConfirmed = confirm(
                                  `Failed to copy automatically. The link is:\n\n${linkToCopy}\n\nClick OK to open it in a new tab, or Cancel to manually copy it.`
                                )
                                if (userConfirmed) {
                                  window.open(linkToCopy, '_blank')
                                }
                              }
                            }}
                            className='flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100'
                            title={`Copy reusable dashboard link: ${anyWithGroupLink.group_link}`}
                          >
                            <svg
                              className='h-3.5 w-3.5'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                              />
                            </svg>
                            Copy Link
                          </button>
                        )}
                      </div>
                      <div className='divide-y divide-gray-100'>
                        {(groupRequests as any[]).map((r: any) => {
                          const getStatusStyles = (status: string) => {
                            switch (status) {
                              case 'verified':
                                return 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              case 'rejected':
                                return 'bg-red-100 text-red-700 border-red-200'
                              case 'uploaded':
                                return 'bg-blue-100 text-blue-700 border-blue-200'
                              case 'requested':
                                return 'bg-amber-100 text-amber-700 border-amber-200'
                              default:
                                return 'bg-gray-100 text-gray-700 border-gray-200'
                            }
                          }

                          const isDocumentRequest =
                            r.request_kind === 'document'
                          const displayName = isDocumentRequest
                            ? r.document_type?.name || 'Unknown Document'
                            : r.form_schema?.title ||
                              r.document_type?.name ||
                              'Information Request'
                          const latestSubmission: RequestFormSubmission | undefined =
                            Array.isArray(r.request_form_submissions) &&
                            r.request_form_submissions.length > 0
                              ? r.request_form_submissions[0]
                              : undefined
                          
                          // Check if this is an ID document type
                          const documentSlug = r.document_type?.slug?.toLowerCase() || ''
                          const documentName = r.document_type?.name?.toLowerCase() || ''
                          const isIdDocument = isDocumentRequest && (
                            documentSlug.includes('id') ||
                            documentSlug.includes('passport') ||
                            documentSlug.includes('driver') ||
                            documentSlug.includes('license') ||
                            documentName.includes('id') ||
                            documentName.includes('passport') ||
                            documentName.includes('driver') ||
                            documentName.includes('license')
                          )
                          
                          // Check if this is a specimen document
                          const isSpecimenDocument = isDocumentRequest && (
                            documentSlug === 'specimen_check' ||
                            documentSlug.includes('specimen') ||
                            documentName.includes('specimen')
                          )

                          return (
                            <div
                              key={r.id}
                              className='px-5 py-4 transition-colors hover:bg-gray-50'
                            >
                              <div className='flex items-start justify-between gap-4'>
                                <div className='min-w-0 flex-1'>
                                  <div className='mb-2 flex flex-wrap items-center gap-3'>
                                    <h4 className='text-sm font-semibold text-gray-900'>
                                      {displayName}
                                    </h4>
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusStyles(r.status)}`}
                                    >
                                      {r.status}
                                    </span>
                                    {!isDocumentRequest && (
                                      <span className='inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700'>
                                        {r.request_kind}
                                      </span>
                                    )}
                                  </div>
                                  {r.form_schema?.description && !isDocumentRequest && (
                                    <p className='mb-2 text-xs text-gray-500'>
                                      {r.form_schema.description}
                                    </p>
                                  )}
                                  <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
                                    {r.magic_link_sent_at && (
                                      <div className='flex items-center gap-1'>
                                        <svg
                                          className='h-3.5 w-3.5'
                                          fill='none'
                                          stroke='currentColor'
                                          viewBox='0 0 24 24'
                                        >
                                          <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                                          />
                                        </svg>
                                        <span>
                                          Sent:{' '}
                                          {new Date(
                                            r.magic_link_sent_at
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                    {isDocumentRequest && r.uploaded_file_key && (
                                      <div className='flex items-center gap-1'>
                                        <svg
                                          className='h-3.5 w-3.5'
                                          fill='none'
                                          stroke='currentColor'
                                          viewBox='0 0 24 24'
                                        >
                                          <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                                          />
                                        </svg>
                                        <span className='font-mono text-xs'>
                                          File uploaded
                                        </span>
                                      </div>
                                    )}
                                    {latestSubmission && (
                                      <div className='flex items-center gap-1'>
                                        <svg
                                          className='h-3.5 w-3.5'
                                          fill='none'
                                          stroke='currentColor'
                                          viewBox='0 0 24 24'
                                        >
                                          <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z'
                                          />
                                        </svg>
                                        <span>
                                          Last submission:{' '}
                                          {formatDateTime(
                                            latestSubmission.submitted_at
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {!isDocumentRequest && latestSubmission && (
                                    <div className='mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700'>
                                      <p className='mb-3 text-xs uppercase tracking-wide text-gray-500'>
                                        Submitted details
                                      </p>
                                      
                                      {r.request_kind === 'employment' ? (
                                        <div className='rounded-lg bg-white p-4 shadow-sm'>
                                          <p className='text-sm leading-relaxed text-gray-900'>
                                            {formatEmploymentOverview(latestSubmission.form_data || {})}
                                          </p>
                                        </div>
                                      ) : r.request_kind === 'reference' &&
                                        Array.isArray(latestSubmission.form_data?.references) ? (
                                        <div>
                                          {formatReferenceOverview(latestSubmission.form_data.references)}
                                        </div>
                                      ) : (
                                        <dl className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                          {Object.entries(latestSubmission.form_data || {}).map(([key, value]) => (
                                            <div key={key} className='rounded bg-white p-3 shadow-sm'>
                                              <dt className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                                                {getFieldLabel(r.form_schema, key)}
                                              </dt>
                                              <dd className='mt-1 break-words text-sm text-gray-900'>
                                                {formatSubmissionValue(value)}
                                              </dd>
                                            </div>
                                          ))}
                                          {Object.keys(latestSubmission.form_data || {}).length === 0 && (
                                            <div className='col-span-full text-sm text-gray-500'>
                                              No fields were provided.
                                            </div>
                                          )}
                                        </dl>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className='flex flex-shrink-0 flex-wrap items-center gap-2'>
                                  {(r.status === 'uploaded' ||
                                    r.status === 'verified') &&
                                    isDocumentRequest &&
                                    r.uploaded_file_key && (
                                      <button
                                        onClick={() =>
                                          openDocumentRequestView(r.id)
                                        }
                                        disabled={loadingDocumentView}
                                        className='flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50'
                                      >
                                        {loadingDocumentView ? (
                                          <svg
                                            className='h-3.5 w-3.5 animate-spin'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                          >
                                            <path
                                              strokeLinecap='round'
                                              strokeLinejoin='round'
                                              strokeWidth={2}
                                              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            className='h-3.5 w-3.5'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                          >
                                            <path
                                              strokeLinecap='round'
                                              strokeLinejoin='round'
                                              strokeWidth={2}
                                              d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                                            />
                                            <path
                                              strokeLinecap='round'
                                              strokeLinejoin='round'
                                              strokeWidth={2}
                                              d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                                            />
                                          </svg>
                                        )}
                                        View
                                      </button>
                                    )}
                                  {r.status === 'uploaded' && (isIdDocument || isSpecimenDocument) && (
                                    <>
                                      <button
                                        onClick={() => handleVerify(r.id)}
                                        disabled={!!submittingRequest[r.id]}
                                        className='flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50'
                                      >
                                        <svg
                                          className='h-3.5 w-3.5'
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
                                        Verify
                                      </button>
                                      <button
                                        onClick={() => handleReject(r.id)}
                                        disabled={!!submittingRequest[r.id]}
                                        className='flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50'
                                      >
                                        <svg
                                          className='h-3.5 w-3.5'
                                          fill='none'
                                          stroke='currentColor'
                                          viewBox='0 0 24 24'
                                        >
                                          <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M6 18L18 6M6 6l12 12'
                                          />
                                        </svg>
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {r.status === 'uploaded' && 
                                   (r.request_kind === 'reference' || r.request_kind === 'employment' || r.request_kind === 'bank') &&
                                   latestSubmission && (
                                    <>
                                      <button
                                        onClick={() => handleVerify(r.id)}
                                        disabled={!!submittingRequest[r.id]}
                                        className='flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50'
                                      >
                                        <svg
                                          className='h-3.5 w-3.5'
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
                                        Verify
                                      </button>
                                      <button
                                        onClick={() => handleReject(r.id)}
                                        disabled={!!submittingRequest[r.id]}
                                        className='flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50'
                                      >
                                        <svg
                                          className='h-3.5 w-3.5'
                                          fill='none'
                                          stroke='currentColor'
                                          viewBox='0 0 24 24'
                                        >
                                          <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M6 18L18 6M6 6l12 12'
                                          />
                                        </svg>
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {(r.status === 'verified' ||
                                    r.status === 'rejected') && (
                                    <button
                                      onClick={() => handleRequestAgain(r.id)}
                                      disabled={!!submittingRequest[r.id]}
                                      className='flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
                                    >
                                      <svg
                                        className='h-3.5 w-3.5'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                      >
                                        <path
                                          strokeLinecap='round'
                                          strokeLinejoin='round'
                                          strokeWidth={2}
                                          d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                        />
                                      </svg>
                                      Request Again
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteRequest(r.id)}
                                    disabled={!!submittingRequest[r.id]}
                                    className='rounded-lg border border-gray-300 bg-white p-1.5 text-gray-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50'
                                    title='Delete request'
                                  >
                                    <svg
                                      className='h-4 w-4'
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
          onClick={closePreview}
        >
          <div
            className='mx-4 flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white'
            onClick={e => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b border-gray-200 px-4 py-2'>
              <h4 className='text-sm font-medium text-gray-900'>
                {previewFileName || 'Document Preview'}
                {previewIsIdDocument && (
                  <span className='ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800'>
                    ID Document
                  </span>
                )}
                {previewIsSpecimenDocument && (
                  <span className='ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800'>
                    Specimen Check
                  </span>
                )}
              </h4>
              <button
                onClick={closePreview}
                className='rounded p-1 hover:bg-gray-100'
              >
                <svg
                  className='h-5 w-5 text-gray-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>
            {previewIsIdDocument && previewClientInfo && (
              <div className='border-b border-gray-200 bg-blue-50 px-4 py-3'>
                <h5 className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700'>
                  Client Information (Compare with Document)
                </h5>
                <div className='grid grid-cols-2 gap-3 text-sm'>
                  <div>
                    <span className='text-xs text-gray-500'>Full Name:</span>
                    <p className='font-medium text-gray-900'>
                      {[previewClientInfo.first_name, previewClientInfo.last_name]
                        .filter(Boolean)
                        .join(' ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className='text-xs text-gray-500'>Date of Birth:</span>
                    <p className='font-medium text-gray-900'>
                      {previewClientInfo.date_of_birth
                        ? new Date(previewClientInfo.date_of_birth).toLocaleDateString('en-CA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className='text-xs text-gray-500'>Email:</span>
                    <p className='font-medium text-gray-900'>
                      {previewClientInfo.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className='text-xs text-gray-500'>Phone:</span>
                    <p className='font-medium text-gray-900'>
                      {previewClientInfo.phone || 'N/A'}
                    </p>
                  </div>
                  {previewClientInfo.national_id && (
                    <div className='col-span-2'>
                      <span className='text-xs text-gray-500'>National ID:</span>
                      <p className='font-medium text-gray-900'>
                        {previewClientInfo.national_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {previewIsSpecimenDocument && previewBankInfo && (
              <div className='border-b border-gray-200 bg-purple-50 px-4 py-3'>
                <h5 className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700'>
                  Submitted Bank Information (Compare with Document)
                </h5>
                <div className='grid grid-cols-2 gap-3 text-sm'>
                  {previewBankInfo.bank_name && (
                    <div>
                      <span className='text-xs text-gray-500'>Bank Name:</span>
                      <p className='font-medium text-gray-900'>{previewBankInfo.bank_name}</p>
                    </div>
                  )}
                  {previewBankInfo.account_name && (
                    <div>
                      <span className='text-xs text-gray-500'>Account Name:</span>
                      <p className='font-medium text-gray-900'>{previewBankInfo.account_name}</p>
                    </div>
                  )}
                  {previewBankInfo.institution_number && (
                    <div>
                      <span className='text-xs text-gray-500'>Institution Number:</span>
                      <p className='font-medium text-gray-900'>{previewBankInfo.institution_number}</p>
                    </div>
                  )}
                  {previewBankInfo.transit_number && (
                    <div>
                      <span className='text-xs text-gray-500'>Transit Number:</span>
                      <p className='font-medium text-gray-900'>{previewBankInfo.transit_number}</p>
                    </div>
                  )}
                  {previewBankInfo.account_number && (
                    <div className='col-span-2'>
                      <span className='text-xs text-gray-500'>Account Number:</span>
                      <p className='font-medium text-gray-900'>{previewBankInfo.account_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(previewIsIdDocument || previewIsSpecimenDocument) && previewRequestId && (
              <div className='border-b border-gray-200 bg-amber-50 px-4 py-2'>
                <div className='flex items-center justify-between'>
                  <p className='text-xs text-amber-800'>
                    {previewIsIdDocument 
                      ? '⚠️ Verify this ID document matches the client information above'
                      : '⚠️ Verify this specimen check matches the bank information above'}
                  </p>
                  {requests.find(r => r.id === previewRequestId)?.status === 'uploaded' && (
                    <button
                      onClick={() => {
                        if (previewRequestId) {
                          handleVerify(previewRequestId)
                          closePreview()
                        }
                      }}
                      disabled={!!submittingRequest[previewRequestId]}
                      className='flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50'
                    >
                      <svg
                        className='h-3.5 w-3.5'
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
                      {previewIsIdDocument ? 'Verify KYC' : 'Verify'}
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className='flex-1 overflow-auto bg-gray-50'>
              {previewMime?.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  className='h-full w-full'
                  title={previewFileName || 'PDF Document'}
                />
              ) : previewMime?.startsWith('image/') ? (
                <div className='flex h-full w-full items-center justify-center p-4'>
                  <img
                    src={previewUrl}
                    alt={previewFileName || 'Document'}
                    className='max-h-full max-w-full object-contain'
                  />
                </div>
              ) : (
                <div className='p-6 text-center'>
                  <p className='text-sm text-gray-700'>
                    Preview not available for this file type.
                  </p>
                  <a
                    href={previewUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'
                  >
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                      />
                    </svg>
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Request Items Modal - Modern Design */}
      {requestModalOpen && typeof applicationId !== 'undefined' && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'
          onClick={() => setRequestModalOpen(false)}
        >
          <div
            className='mx-4 flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl max-h-[90vh]'
            onClick={e => e.stopPropagation()}
          >
            <div className='flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm'>
                  <svg
                    className='h-6 w-6 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    />
                  </svg>
                </div>
                <h4 className='text-lg font-bold text-white'>Request Items</h4>
              </div>
              <button
                onClick={() => setRequestModalOpen(false)}
                className='rounded-lg p-2 transition-colors hover:bg-white/20'
              >
                <svg
                  className='h-5 w-5 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>
            <div className='flex-1 space-y-5 overflow-y-auto p-6'>
              <div>
                <p className='mb-3 text-sm font-semibold text-gray-900'>
                  Select items to request:
                </p>
                <div className='space-y-4'>
                  {documentTypeOptions.length > 0 && (
                    <div>
                      <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Document uploads
                      </p>
                      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        {documentTypeOptions.map(dt => {
                          const isRequested = requests.some(
                            r =>
                              r.document_type?.id === dt.id &&
                              (r.status === 'requested' ||
                                r.status === 'uploaded')
                          )
                          return (
                            <label
                              key={dt.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-all ${
                                isRequested
                                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                                  : selectedTypes[dt.id]
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                              }`}
                            >
                              <input
                                type='checkbox'
                                className='mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
                                checked={!!selectedTypes[dt.id]}
                                onChange={() => toggleType(dt.id)}
                                disabled={isRequested}
                              />
                              <div className='min-w-0 flex-1'>
                                <span
                                  className={`block text-sm font-medium ${isRequested ? 'text-gray-400' : 'text-gray-900'}`}
                                >
                                  {dt.name}
                                </span>
                                {dt.description && (
                                  <span className='mt-1 block text-xs text-gray-500'>
                                    {dt.description}
                                  </span>
                                )}
                                {isRequested && (
                                  <span className='mt-1 block text-xs font-medium text-amber-600'>
                                    ✓ Already requested
                                  </span>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {infoRequestOptions.length > 0 && (
                    <div>
                      <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Information requests
                      </p>
                      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        {infoRequestOptions.map(dt => {
                          const isRequested = requests.some(
                            r =>
                              r.document_type?.id === dt.id &&
                              (r.status === 'requested' ||
                                r.status === 'uploaded')
                          )
                          return (
                            <label
                              key={dt.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-all ${
                                isRequested
                                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                                  : selectedTypes[dt.id]
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                              }`}
                            >
                              <input
                                type='checkbox'
                                className='mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
                                checked={!!selectedTypes[dt.id]}
                                onChange={() => toggleType(dt.id)}
                                disabled={isRequested}
                              />
                              <div className='min-w-0 flex-1'>
                                <span
                                  className={`block text-sm font-medium ${isRequested ? 'text-gray-400' : 'text-gray-900'}`}
                                >
                                  {dt.name}
                                </span>
                                <span className='mt-0.5 inline-block rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700'>
                                  {dt.default_request_kind}
                                </span>
                                {dt.description && (
                                  <span className='mt-1 block text-xs text-gray-500'>
                                    {dt.description}
                                  </span>
                                )}
                                {isRequested && (
                                  <span className='mt-1 block text-xs font-medium text-amber-600'>
                                    ✓ Already requested
                                  </span>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Note when bank information is selected */}
              {infoRequestOptions.some(
                dt => dt.default_request_kind === 'bank' && selectedTypes[dt.id]
              ) && (
                <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                  <div className='flex items-start gap-3'>
                    <svg
                      className='h-5 w-5 shrink-0 text-blue-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                    <div className='flex-1'>
                      <p className='text-sm font-medium text-blue-900'>
                        Specimen Document Required
                      </p>
                      <p className='mt-1 text-xs text-blue-700'>
                        A specimen check document request will be automatically added along with the bank information request.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className='mb-2 block text-sm font-semibold text-gray-700'>
                  Optional Note
                </label>
                <textarea
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder='Add instructions for the applicant (optional)'
                ></textarea>
              </div>
            </div>
            <div className='flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4'>
              <button
                onClick={() => setRequestModalOpen(false)}
                className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={submitRequestDocs}
                disabled={
                  sending ||
                  Object.keys(selectedTypes).filter(id => selectedTypes[id])
                    .length === 0
                }
                className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
              >
                {sending ? (
                  <>
                    <svg
                      className='h-4 w-4 animate-spin'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                      />
                    </svg>
                    Send Requests
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
