'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { uploadRequestedDocument } from '@/src/lib/supabase/document-helpers'
import Button from '../components/Button'
import { createClient } from '@/src/lib/supabase/client'

type RequestItem = {
  id: string
  status: 'requested' | 'uploaded' | 'verified' | 'rejected' | 'expired'
  expires_at?: string | null
  magic_link_sent_at?: string | null
  document_type?: { name: string; slug: string }
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

  const { reqParam, tokenParam } = useMemo(() => {
    if (typeof window === 'undefined') return { reqParam: null, tokenParam: null }
    const u = new URL(window.location.href)
    return {
      reqParam: u.searchParams.get('req'),
      tokenParam: u.searchParams.get('token')
    }
  }, []) as { reqParam: string | null; tokenParam: string | null }

  const loadRequests = async () => {
    try {
      setLoading(true)
      let res: Response
      if (tokenParam && reqParam) {
        res = await fetch(`/api/public/document-requests/${reqParam}?token=${encodeURIComponent(tokenParam)}`)
        if (res.ok) {
          const j = await res.json()
          setRequests(j.request ? [j.request] : [])
          setError(null)
          setLoading(false)
          return
        }
      }
      res = await fetch('/api/user/document-requests')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load requests')
      }
      const j = await res.json()
      setRequests(j.requests || [])
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
      // If public token mode, skip auth wait and load immediately
      if (tokenParam && reqParam) {
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
  }, [supabase, t, tokenParam, reqParam])

  const onFileChange = (requestId: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [requestId]: file }))
  }

  const uploadForRequest = async (requestId: string) => {
    const file = files[requestId]
    if (!file) return
    try {
      setSubmitting(prev => ({ ...prev, [requestId]: true }))
      setSuccess(prev => ({ ...prev, [requestId]: false }))
      if (tokenParam && reqParam) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`/api/public/document-requests/${requestId}/upload?token=${encodeURIComponent(tokenParam)}`, {
          method: 'POST',
          body: form
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Upload failed')
        }
      } else {
        const uploaded = await uploadRequestedDocument(requestId, file)
        if (!uploaded.success || !uploaded.path) {
          throw new Error(uploaded.error || 'Upload failed')
        }
        // Mark upload completed
        const res = await fetch(`/api/user/document-requests/${requestId}/upload-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_key: uploaded.path, meta: { name: file.name, size: file.size, type: file.type } })
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Failed to finalize upload')
        }
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
            <div className='space-y-4'>
              {requests.map((r) => (
                <div key={r.id} className={`rounded-lg border bg-background-secondary p-6 shadow-sm transition-all hover:shadow-md ${reqParam && reqParam === r.id ? 'border-primary border-2 shadow-md' : 'border-gray-200'}`}>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <div className='mb-2 flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20'>
                          <svg className='h-5 w-5 text-primary' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                          </svg>
                        </div>
                        <div>
                          <h3 className='text-lg font-semibold text-primary'>{r.document_type?.name || 'Document'}</h3>
                          <p className='text-xs text-text-secondary mt-0.5'>
                            {t('Requested')}: {formatDateTime(r.magic_link_sent_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                      r.status === 'verified' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                      r.status === 'rejected' ? 'border-red-300 bg-red-50 text-red-700' :
                      r.status === 'uploaded' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                      r.status === 'expired' ? 'border-gray-300 bg-gray-50 text-gray-700' :
                      'border-orange-300 bg-orange-50 text-orange-700'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  {r.status === 'requested' && (
                    <div className='mt-6 flex flex-col gap-4 sm:flex-row sm:items-center'>
                      <div className='flex-1'>
                        <input
                          type='file'
                          id={`file-${r.id}`}
                          onChange={(e) => onFileChange(r.id, e.target.files?.[0] || null)}
                          className='block w-full text-sm text-gray-700 file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90'
                        />
                      </div>
                      <Button
                        onClick={() => uploadForRequest(r.id)}
                        disabled={!files[r.id] || !!submitting[r.id]}
                        className='w-full sm:w-auto disabled:opacity-50'
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
                  )}

                  {r.status === 'uploaded' && (
                    <div className='mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3'>
                      <p className='text-sm text-blue-700'>{t('File_Received')}</p>
                    </div>
                  )}

                  {r.status === 'verified' && (
                    <div className='mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3'>
                      <p className='text-sm font-medium text-emerald-700'>
                        {t('Verified')} ✔
                      </p>
                    </div>
                  )}

                  {r.status === 'rejected' && (
                    <div className='mt-4 rounded-lg border border-red-200 bg-red-50 p-3'>
                      <p className='text-sm text-red-700'>{t('Rejected_Message')}</p>
                    </div>
                  )}

                  {r.status === 'expired' && (
                    <div className='mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3'>
                      <p className='text-sm text-gray-700'>
                        {t('Expired')} — {t('Rejected_Message')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

