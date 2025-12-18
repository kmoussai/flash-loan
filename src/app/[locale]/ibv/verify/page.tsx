'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Step5BankVerification from '@/src/app/[locale]/quick-apply/components/Step5BankVerification'

interface InitializeResponse {
  success: boolean
  connectToken?: string
  applicationId?: string
  ibvRequestId?: string
  error?: string
  message?: string
}

export default function IbvVerifyPage() {
  const t = useTranslations('')
  const searchParams = useSearchParams()

  const [connectToken, setConnectToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasInitializedRef = useRef(false)
  const initializedRequestIdRef = useRef<string | null>(null)

  useEffect(() => {
    const requestId = searchParams.get('request_id')

    if (!requestId) {
      setError('Missing or invalid verification link.')
      setLoading(false)
      return
    }

    // Prevent re-initialization with the same request_id
    if (
      hasInitializedRef.current &&
      initializedRequestIdRef.current === requestId
    ) {
      console.log('[IBV Verify] Already initialized with this request_id, skipping')
      return
    }

    // Prevent initialization if we've already initialized with a different request_id
    if (
      hasInitializedRef.current &&
      initializedRequestIdRef.current !== requestId
    ) {
      console.warn(
        '[IBV Verify] Already initialized with different request_id, cannot reinitialize'
      )
      setError('Verification session already started.')
      setLoading(false)
      return
    }

    const initialize = async () => {
      try {
        setLoading(true)
        setError(null)

        // Mark as initialized before calling API (prevent duplicate calls)
        hasInitializedRef.current = true
        initializedRequestIdRef.current = requestId

        const res = await fetch('/api/ibv/initialize-from-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId })
        })

        const json = (await res.json().catch(() => ({}))) as InitializeResponse

        if (!res.ok || !json.success || !json.connectToken) {
          // Reset initialization flags on error so user can retry
          hasInitializedRef.current = false
          initializedRequestIdRef.current = null
          setError(
            json.error ||
              json.message ||
              t('Failed_To_Initialize_Verification') ||
              'Failed to initialize bank verification.'
          )
          setLoading(false)
          return
        }

        setConnectToken(json.connectToken)
        setLoading(false)
      } catch (e: any) {
        console.error('[IBV Verify] Failed to initialize ZumRails session:', e)
        // Reset initialization flags on error so user can retry
        hasInitializedRef.current = false
        initializedRequestIdRef.current = null
        setError(
          e?.message ||
            t('Failed_To_Initialize_Verification') ||
            'Failed to initialize bank verification.'
        )
        setLoading(false)
      }
    }

    void initialize()
  }, [searchParams, t])

  if (loading) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] flex-col items-center justify-center'>
        <div className='mx-auto max-w-2xl px-4 py-16'>
          <p className='text-center text-sm text-gray-700'>
            {t('Initializing_Bank_Verification')}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] flex-col items-center justify-center'>
        <div className='mx-auto max-w-2xl px-4 py-16'>
          <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
            <p className='text-sm text-red-800'>
              {t('Error')}: {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!connectToken) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] flex-col items-center justify-center'>
        <div className='mx-auto max-w-2xl px-4 py-16'>
          <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-4'>
            <p className='text-sm text-yellow-800'>
              {t('Invalid_Verification_Token') ||
                'This verification link is no longer valid.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-[calc(100vh-200px)] flex-col'>
      <div className='mx-auto max-w-2xl flex-1 px-4 py-16'>
        <Step5BankVerification
          connectToken={connectToken}
          onVerificationSuccess={() => {
            // Nothing special to do here for now - ZumRails webhooks will update the application
          }}
          onVerificationError={err => {
            console.error('[IBV Verify] Verification error:', err)
          }}
          onVerificationCancel={() => {
            // Optional: could show a message if needed
          }}
        />
      </div>
    </div>
  )
}


