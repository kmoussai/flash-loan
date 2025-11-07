'use client'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getInveriteIframeConfig,
  initializeInveriteSession
} from '@/src/lib/ibv/inverite'
import type { QuickApplyFormData } from '../types'

interface Step5BankVerificationProps {
  ibvVerified: boolean
  formData: Pick<QuickApplyFormData, 'firstName' | 'lastName' | 'email' | 'phone'>
  onRequestGuidReceived?: (requestGuid: string) => void
}

const INVERITE_INIT_KEY = 'inverite_init_session_id'

export default function Step5BankVerification({
  ibvVerified,
  formData,
  onRequestGuidReceived
}: Step5BankVerificationProps) {
  const t = useTranslations('')
  const [iframeSrc, setIframeSrc] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef<boolean>(false)
  const isInitializing = useRef<boolean>(false)

  const iframeConfig = useMemo(
    () => getInveriteIframeConfig(undefined, iframeSrc),
    [iframeSrc]
  )

  async function startInverite() {
    if (isInitializing.current || hasInitialized.current || iframeSrc) {
      console.log('[Inverite] Already initialized or in progress, skipping')
      return
    }

    const sessionId = typeof window !== 'undefined'
      ? sessionStorage.getItem(INVERITE_INIT_KEY)
      : null

    if (sessionId) {
      console.log('[Inverite] Session already initialized in this browser session')
      hasInitialized.current = true
      return
    }

    try {
      isInitializing.current = true
      setError(null)
      setLoading(true)

      const initSessionId = `inverite_${Date.now()}_${Math.random().toString(36).substring(7)}`
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(INVERITE_INIT_KEY, initSessionId)
      }

      const { requestGuid, iframeUrl } = await initializeInveriteSession({
        firstName: formData.firstName,
        lastName: formData.lastName,
        // email: formData.email,
        phone: formData.phone
      })
      const src = iframeUrl || getInveriteIframeConfig(requestGuid).src
      setIframeSrc(src)
      hasInitialized.current = true

      if (requestGuid && onRequestGuidReceived) {
        onRequestGuidReceived(requestGuid)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to start Inverite session')
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(INVERITE_INIT_KEY)
      }
      hasInitialized.current = false
      isInitializing.current = false
    } finally {
      setLoading(false)
      isInitializing.current = false
    }
  }

  useEffect(() => {
    if (!hasInitialized.current && !iframeSrc && !isInitializing.current) {
      startInverite()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className='space-y-6'>
      <div className='mb-6 sm:mb-8'>
        <div className='overflow-hidden rounded-xl border border-gray-200 shadow-lg'>
          {error ? (
            <div className='flex flex-col items-center justify-center p-8 text-center'>
              <p className='mb-4 text-sm text-red-600'>
                {t('Bank_Connection_Failed') || 'Bank connection failed.'}
              </p>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem(INVERITE_INIT_KEY)
                  }
                  hasInitialized.current = false
                  isInitializing.current = false
                  setIframeSrc('')
                  startInverite()
                }}
                className='hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-white'
              >
                {t('Retry') || 'Retry'}
              </button>
            </div>
          ) : (
            <iframe
              className={iframeConfig.className}
              src={iframeConfig.src}
              title={iframeConfig.title}
              allow={iframeConfig.allow}
            ></iframe>
          )}
        </div>
      </div>
      {loading && (
        <div className='text-center text-sm text-text-secondary'>
          {t('Connecting_To_Bank') || 'Connecting to Inverite...'}
        </div>
      )}
      {ibvVerified && (
        <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <svg
                className='h-5 w-5 text-green-600'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-green-800'>
                {t('Verification_Complete') || 'Verification Complete'}
              </h3>
              <p className='mt-1 text-sm text-green-700'>
                {t('Submitting_Application') ||
                  'Submitting your loan application...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

