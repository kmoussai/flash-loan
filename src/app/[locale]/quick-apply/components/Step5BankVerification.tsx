'use client'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getInveriteIframeConfig,
  initializeInveriteSession,
  type InveriteVerificationStatus
} from '@/src/lib/ibv/inverite'
import type { QuickApplyFormData } from '../types'

interface Step5BankVerificationProps {
  ibvVerified: boolean
  ibvStatus?: InveriteVerificationStatus | null
  formData: Pick<
    QuickApplyFormData,
    'firstName' | 'lastName' | 'email' | 'phone'
  >
  onRequestGuidReceived?: (requestGuid: string) => void
  onSubmitWithoutVerification: (status: 'pending' | 'failed') => void
  onClearOverride: () => void
  hasRequestGuid: boolean
  submissionOverride: 'pending' | 'failed' | null
}

const INVERITE_INIT_KEY = 'inverite_init_session_id'

export default function Step5BankVerification({
  ibvVerified,
  ibvStatus,
  formData,
  onRequestGuidReceived,
  onSubmitWithoutVerification,
  onClearOverride,
  hasRequestGuid,
  submissionOverride
}: Step5BankVerificationProps) {
  const t = useTranslations('')
  const [iframeSrc, setIframeSrc] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showPendingFallback, setShowPendingFallback] = useState(false)
  const hasInitialized = useRef<boolean>(false)
  const isInitializing = useRef<boolean>(false)
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  const iframeConfig = useMemo(
    () => getInveriteIframeConfig(undefined, iframeSrc),
    [iframeSrc]
  )

  async function startInverite() {
    if (isInitializing.current || hasInitialized.current || iframeSrc) {
      console.log('[Inverite] Already initialized or in progress, skipping')
      return
    }

    const sessionId =
      typeof window !== 'undefined'
        ? sessionStorage.getItem(INVERITE_INIT_KEY)
        : null

    if (sessionId) {
      console.log(
        '[Inverite] Session already initialized in this browser session'
      )
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

      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
      }
      fallbackTimerRef.current = setTimeout(() => {
        if (!ibvVerified) {
          setShowPendingFallback(true)
        }
      }, 60000)
    } catch (e: any) {
      setError(e?.message || 'Failed to start Inverite session')
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(INVERITE_INIT_KEY)
      }
      hasInitialized.current = false
      isInitializing.current = false
      onClearOverride()
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

  useEffect(() => {
    if (ibvVerified) {
      setShowPendingFallback(false)
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }
  }, [ibvVerified])

  return (
    <div className='space-y-6'>
      <div className='sm:mb-8'>
        <div className='overflow-hidden border border-gray-200 shadow-lg sm:rounded-xl'>
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
                  onClearOverride()
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
        <div className='space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800'>
          <div className='flex items-center gap-2 text-green-700'>
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
            <span className='font-semibold'>
              {t('Bank_Verification_Thank_You') ||
                'Thank you! Your bank verification is complete.'}
            </span>
          </div>
          <p className='text-green-700'>
            {t('Bank_Verification_Thank_You_Helper') ||
              'Our team now has the information they need to process your application. We will reach out shortly with the decision.'}
          </p>
        </div>
      )}
      {!ibvVerified && (
        <div className='space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4'>
          {false && (
            <div className='flex items-start gap-3'>
              <svg
                className='mt-1 h-5 w-5 text-amber-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01M12 5a7 7 0 00-7 7v4a2 2 0 002 2h10a2 2 0 002-2v-4a7 7 0 00-7-7z'
                />
              </svg>
              <div className='space-y-2 text-sm text-amber-800'>
                <p className='font-semibold'>
                  {submissionOverride === 'failed' || ibvStatus === 'failed'
                    ? t('Bank_Verification_Failed') ||
                      'Bank verification failed.'
                    : t('Bank_Verification_Pending') ||
                      'Bank verification pending.'}
                </p>
                <p>
                  {t('Bank_Verification_Manual_Follow_Up') ||
                    'You can continue and our team will follow up to complete bank verification later.'}
                </p>
                {(hasRequestGuid || submissionOverride === 'failed') && (
                  <p className='rounded-md bg-white/80 px-3 py-2 text-xs text-amber-700'>
                    {t('Bank_Verification_Request_Captured') ||
                      'We captured your latest bank verification request so we can resend it if needed.'}
                  </p>
                )}
                {submissionOverride === 'failed' || ibvStatus === 'failed' ? (
                  <div className='flex flex-wrap items-center gap-3 pt-2'>
                    <button
                      type='button'
                      onClick={() => onSubmitWithoutVerification('pending')}
                      className='inline-flex items-center rounded-md border border-amber-300 bg-white px-3 py-2 font-medium text-amber-700 transition-colors hover:bg-amber-100'
                    >
                      {t('Try_Later') || "I'll Try Later"}
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          sessionStorage.removeItem(INVERITE_INIT_KEY)
                        }
                        hasInitialized.current = false
                        isInitializing.current = false
                        setIframeSrc('')
                        onClearOverride()
                        startInverite()
                      }}
                      className='inline-flex items-center rounded-md border border-transparent px-3 py-2 text-xs font-medium text-amber-600 hover:text-amber-700'
                    >
                      {t('Retry_Now') || 'Retry Now'}
                    </button>
                  </div>
                ) : (
                  submissionOverride && (
                    <button
                      type='button'
                      onClick={onClearOverride}
                      className='inline-flex items-center rounded-md border border-transparent px-3 py-2 text-xs font-medium text-amber-600 hover:text-amber-700'
                    >
                      {t('Undo') || 'Undo'}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
          {showPendingFallback && (
            <div className='rounded-md border border-amber-100 bg-white/80 px-3 py-3 text-xs text-amber-700'>
              {t('Bank_Verification_Fallback_Message')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
