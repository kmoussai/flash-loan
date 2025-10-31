'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Button from '../components/Button'
import { createClient } from '@/src/lib/supabase/client'

type RequestItem = {
  id: string
  status: 'requested' | 'uploaded' | 'verified' | 'rejected' | 'expired'
  expires_at?: string | null
  magic_link_sent_at?: string | null
  document_type?: { name: string; slug: string }
  uploaded_file_key?: string | null
}

type DocumentStatus = {
  documentType: { name: string; slug: string }
  requestId: string | null
  status: 'requested' | 'uploaded' | 'verified' | 'rejected' | 'expired' | 'not-requested'
  expiresAt?: string | null
  requestedAt?: string | null
}

export default function UploadDocumentsPage() {
  const t = useTranslations('')
  const supabase = useMemo(() => createClient(), [])
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [success, setSuccess] = useState<Record<string, boolean>>({})
  const [ready, setReady] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMime, setPreviewMime] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const { reqParam, groupParam, tokenParam } = useMemo(() => {
    if (typeof window === 'undefined') return { reqParam: null, tokenParam: null }
    const u = new URL(window.location.href)
    return {
      reqParam: u.searchParams.get('req'),
      groupParam: u.searchParams.get('group'),
      tokenParam: u.searchParams.get('token')
    }
  }, []) as { reqParam: string | null; groupParam: string | null; tokenParam: string | null }

  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([])

  const loadRequests = async () => {
    try {
      setLoading(true)
      let res: Response
      let fetchedRequests: RequestItem[] = []
      
      if (tokenParam && reqParam) {
        res = await fetch(`/api/public/document-requests/${reqParam}?token=${encodeURIComponent(tokenParam)}`)
        if (res.ok) {
          const j = await res.json()
          fetchedRequests = j.request ? [j.request] : []
        }
      } else if (tokenParam && groupParam) {
        res = await fetch(`/api/public/document-request-groups/${groupParam}?token=${encodeURIComponent(tokenParam)}`)
        if (res.ok) {
          const j = await res.json()
          fetchedRequests = j.requests || []
        }
      } else {
        res = await fetch('/api/user/document-requests')
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Failed to load requests')
        }
        const j = await res.json()
        fetchedRequests = j.requests || []
      }

      setRequests(fetchedRequests)
      
      // Organize by document type for better display
      const statusMap = new Map<string, DocumentStatus>()
      
      // Initialize with known document types from requests
      fetchedRequests.forEach(req => {
        if (req.document_type) {
          statusMap.set(req.document_type.slug, {
            documentType: req.document_type,
            requestId: req.id,
            status: req.status,
            expiresAt: req.expires_at,
            requestedAt: req.magic_link_sent_at || null
          })
        }
      })
      
      // Also add any document types that were requested but not yet in our list
      const allStatuses = Array.from(statusMap.values())
      setDocumentStatuses(allStatuses)
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    let unsub: { unsubscribe: () => void } | null = null

    const waitForSessionAndLoad = async () => {
      // If public token mode (single request or group), skip auth wait and load immediately
      if (tokenParam && (reqParam || groupParam)) {
        if (!cancelled) {
          setReady(true)
          await loadRequests()
        }
        return
      }

      // If session exists, proceed immediately
      const { data: initial } = await supabase.auth.getSession()
      if (initial.session) {
        if (!cancelled) {
          setReady(true)
          await loadRequests()
        }
        return
      }

      // Listen for session restoration via auth changes
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session && !cancelled) {
          setReady(true)
          loadRequests()
        }
      })
      unsub = listener.subscription

      // Also listen for the bootstrap event dispatched from layout
      const onRestored = () => {
        if (!cancelled) {
          setReady(true)
          loadRequests()
        }
      }
      window.addEventListener('supabase:session-restored', onRestored, { once: true })

      // Fallback: short polling window
      const start = Date.now()
      while (!cancelled && Date.now() - start < 5000) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          if (!cancelled) {
            setReady(true)
            await loadRequests()
          }
          break
        }
        await new Promise(r => setTimeout(r, 150))
      }

      // If still no session (and not in token mode), surface an auth error but stop spinner
      if (!cancelled) {
        const { data } = await supabase.auth.getSession()
        if (!data.session && !(tokenParam && reqParam)) {
          setLoading(false)
          setError(t('Authentication_Required') || 'Authentication required. Please use a valid magic link.')
        }
      }

      return () => {
        window.removeEventListener('supabase:session-restored', onRestored)
      }
    }

    waitForSessionAndLoad()
    return () => {
      cancelled = true
      if (unsub) unsub.unsubscribe()
    }
  }, [supabase, t, tokenParam, reqParam, groupParam])

  const onFileChange = (requestId: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [requestId]: file }))
  }

  const uploadForRequest = async (requestId: string) => {
    const file = files[requestId]
    if (!file) return
    try {
      setSubmitting(prev => ({ ...prev, [requestId]: true }))
      setSuccess(prev => ({ ...prev, [requestId]: false }))
      
      // Always use the public upload endpoint (it now supports both token and session auth)
      const form = new FormData()
      form.append('file', file)
      
      // Build URL with appropriate auth params
      let uploadUrl = `/api/public/document-requests/${requestId}/upload`
      const urlParams = new URLSearchParams()
      
      // Handle group context: if we have a group and token, pass both
      if (tokenParam && groupParam) {
        // Group mode: pass both group ID and token
        urlParams.append('group', groupParam)
        urlParams.append('token', tokenParam)
      } else if (tokenParam) {
        // Single request mode: just pass token
        urlParams.append('token', tokenParam)
      }
      // If no token, rely on session auth (no params needed)
      
      if (urlParams.toString()) {
        uploadUrl += `?${urlParams.toString()}`
      }
      
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: form
      })
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Upload failed')
      }

      setSuccess(prev => ({ ...prev, [requestId]: true }))
      await loadRequests()
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setSubmitting(prev => ({ ...prev, [requestId]: false }))
    }
  }

  const formatDateTime = (s?: string | null) => {
    if (!s) return '—'
    try {
      return new Date(s).toLocaleString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return s
    }
  }

  const openPreview = async (requestId: string) => {
    try {
      setLoadingPreview(true)
      
      // Build URL with auth params if needed
      let viewUrl = `/api/user/document-requests/${requestId}/view`
      const urlParams = new URLSearchParams()
      
      if (tokenParam && groupParam) {
        urlParams.append('group', groupParam)
        urlParams.append('token', tokenParam)
      } else if (tokenParam) {
        urlParams.append('token', tokenParam)
      }
      
      if (urlParams.toString()) {
        viewUrl += `?${urlParams.toString()}`
      }
      
      const res = await fetch(viewUrl)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load document')
      }
      
      const data = await res.json()
      setPreviewUrl(data.signed_url)
      setPreviewMime(data.mime_type || 'application/octet-stream')
      setPreviewFileName(data.file_name || 'document')
    } catch (e: any) {
      setError(e?.message || 'Failed to load document')
    } finally {
      setLoadingPreview(false)
    }
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewMime(null)
    setPreviewFileName(null)
  }

  return (
    <div className='min-h-screen bg-background'>
      <section className='bg-gradient-to-br from-primary/10 to-secondary/10 py-12'>
        <div className='mx-auto max-w-4xl px-6'>
          <h1 className='mb-3 text-4xl font-bold text-primary'>
            {t('Upload_Requested_Documents')}
          </h1>
          <p className='text-lg text-text-secondary'>
            {t('Upload_Requested_Documents_Subtitle')}
          </p>
        </div>
      </section>

      <section className='py-12'>
        <div className='mx-auto max-w-4xl px-6'>
          {error && (
            <div className='mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700'>
              {error}
            </div>
          )}

          {loading ? (
            <div className='flex items-center justify-center rounded-lg border border-gray-200 bg-background-secondary p-12'>
              <div className='text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary'></div>
                <p className='mt-4 text-sm text-text-secondary'>{t('Loading_Requests')}</p>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className='rounded-lg border border-gray-200 bg-background-secondary p-8 text-center'>
              <svg className='mx-auto h-16 w-16 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
              </svg>
              <p className='mt-4 text-sm text-text-secondary'>{t('No_Requests')}</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {/* List of documents to upload */}
              {requests.map((r) => {
                const docStatus = documentStatuses.find(ds => ds.requestId === r.id) || {
                  documentType: r.document_type || { name: 'Document', slug: 'unknown' },
                  requestId: r.id,
                  status: r.status as DocumentStatus['status'],
                  expiresAt: r.expires_at,
                  requestedAt: r.magic_link_sent_at || null
                }
                
                const needsAction = r.status === 'requested' || r.status === 'rejected'
                const isHighlighted = reqParam && reqParam === r.id

                return (
                  <div 
                    key={r.id} 
                    className={`rounded-lg border bg-background-secondary p-5 shadow-sm transition-all ${
                      isHighlighted ? 'border-primary border-2 shadow-md ring-2 ring-primary/20' : 'border-gray-200'
                    } ${needsAction ? 'bg-orange-50/50 border-orange-200' : ''}`}
                  >
                    {/* Document Header */}
                    <div className='flex items-start justify-between mb-4'>
                      <div className='flex items-start gap-3 flex-1'>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg flex-shrink-0 ${
                          needsAction 
                            ? 'bg-orange-100' 
                            : r.status === 'verified' 
                            ? 'bg-emerald-100' 
                            : r.status === 'uploaded' 
                            ? 'bg-blue-100' 
                            : 'bg-gray-100'
                        }`}>
                          {needsAction ? (
                            <svg className='h-6 w-6 text-orange-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' />
                            </svg>
                          ) : (
                            <svg className={`h-6 w-6 ${
                              r.status === 'verified' ? 'text-emerald-600' : 
                              r.status === 'uploaded' ? 'text-blue-600' : 
                              'text-gray-600'
                            }`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                            </svg>
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <h3 className='text-lg font-semibold text-primary mb-1'>
                            {r.document_type?.name || 'Document'}
                          </h3>
                          {r.magic_link_sent_at && (
                            <p className='text-xs text-text-secondary'>
                              {t('Requested')}: {formatDateTime(r.magic_link_sent_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border flex-shrink-0 ${
                        r.status === 'verified' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                        r.status === 'rejected' ? 'border-red-300 bg-red-50 text-red-700' :
                        r.status === 'uploaded' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                        r.status === 'expired' ? 'border-gray-300 bg-gray-50 text-gray-700' :
                        'border-orange-300 bg-orange-50 text-orange-700'
                      }`}>
                        {r.status === 'requested' ? t('Action_Required') || 'Action Required' :
                         r.status === 'uploaded' ? t('Uploaded') :
                         r.status === 'verified' ? t('Verified') :
                         r.status === 'rejected' ? t('Rejected') :
                         r.status === 'expired' ? t('Expired') : r.status}
                      </span>
                    </div>

                    {/* Status Messages */}
                    {r.status === 'uploaded' && (
                      <div className='mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3'>
                        <p className='text-sm text-blue-700'>{t('File_Received')}</p>
                        <button
                          onClick={() => openPreview(r.id)}
                          disabled={loadingPreview}
                          className='flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50'
                        >
                          {loadingPreview ? (
                            <>
                              <svg className='h-4 w-4 animate-spin' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                              </svg>
                              {t('Loading_Dots') || 'Loading...'}
                            </>
                          ) : (
                            <>
                              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                              </svg>
                              {t('View') || 'View'}
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {r.status === 'verified' && (
                      <div className='mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3'>
                        <p className='text-sm font-medium text-emerald-700'>
                          ✓ {t('Verified')}
                        </p>
                        <button
                          onClick={() => openPreview(r.id)}
                          disabled={loadingPreview}
                          className='flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50'
                        >
                          {loadingPreview ? (
                            <>
                              <svg className='h-4 w-4 animate-spin' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                              </svg>
                              {t('Loading_Dots') || 'Loading...'}
                            </>
                          ) : (
                            <>
                              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                              </svg>
                              {t('View') || 'View'}
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {r.status === 'rejected' && (
                      <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3'>
                        <p className='text-sm text-red-700'>{t('Rejected_Message')}</p>
                      </div>
                    )}

                    {r.status === 'expired' && (
                      <div className='mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3'>
                        <p className='text-sm text-gray-700'>
                          {t('Expired')} — {t('Rejected_Message')}
                        </p>
                      </div>
                    )}

                    {/* Upload Form - Only show for requested/rejected documents */}
                    {(r.status === 'requested' || r.status === 'rejected') && (
                      <div className='mt-4 pt-4 border-t border-gray-200'>
                        <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                          <div className='flex-1'>
                            <label htmlFor={`file-${r.id}`} className='block text-sm font-medium text-primary mb-2'>
                              {t('Select_File') || 'Select File'}
                            </label>
                            <input
                              type='file'
                              id={`file-${r.id}`}
                              onChange={(e) => onFileChange(r.id, e.target.files?.[0] || null)}
                              accept='image/jpeg,image/png,application/pdf'
                              className='block w-full text-sm text-gray-700 file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90 cursor-pointer'
                            />
                            <p className='mt-1 text-xs text-text-secondary'>
                              {t('Allowed_Formats') || 'Allowed: JPEG, PNG, PDF. Max size: 10MB'}
                            </p>
                          </div>
                          <div className='flex items-center gap-3'>
                            <Button
                              onClick={() => uploadForRequest(r.id)}
                              disabled={!files[r.id] || !!submitting[r.id]}
                              className='sm:w-auto disabled:opacity-50'
                            >
                              {submitting[r.id] ? t('Uploading_Dots') : t('Upload')}
                            </Button>
                            {success[r.id] && (
                              <span className='inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700'>
                                <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                                </svg>
                                {t('Uploaded_Exclamation')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Document Preview Modal */}
      {previewUrl && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4' onClick={closePreview}>
          <div className='relative max-h-[90vh] w-full max-w-4xl bg-white rounded-lg shadow-xl' onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
              <h3 className='text-lg font-semibold text-primary'>
                {previewFileName || t('Document_Viewer') || 'Document Viewer'}
              </h3>
              <button
                onClick={closePreview}
                className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors'
              >
                <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className='relative max-h-[calc(90vh-80px)] overflow-auto p-6'>
              {previewMime?.startsWith('image/') ? (
                <img 
                  src={previewUrl} 
                  alt={previewFileName || 'Document'}
                  className='mx-auto max-w-full h-auto'
                  onError={() => setError(t('Failed_To_Load_Image') || 'Failed to load image')}
                />
              ) : previewMime === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  className='w-full h-[calc(90vh-200px)] min-h-[600px] border-0 rounded'
                  title={previewFileName || 'PDF Document'}
                />
              ) : (
                <div className='flex flex-col items-center justify-center py-12'>
                  <svg className='h-16 w-16 text-gray-400 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                  </svg>
                  <p className='text-gray-600 mb-4'>{t('Preview_Not_Available') || 'Preview not available for this file type'}</p>
                  <a
                    href={previewUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors'
                  >
                    <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                    </svg>
                    {t('Download') || 'Download'}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

