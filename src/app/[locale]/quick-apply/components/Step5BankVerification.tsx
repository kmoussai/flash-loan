'use client'

import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  persistZumrailsConnection,
  initializeZumrailsSdk,
  type ZumrailsConnection
} from '@/src/lib/ibv/zumrails'

interface Step5BankVerificationProps {
  connectToken: string | null
  applicationId?: string | null
  onVerificationSuccess?: (connection: ZumrailsConnection) => void
  onVerificationError?: (error?: unknown) => void
  onVerificationCancel?: () => void
}

export default function Step5BankVerification({
  connectToken,
  applicationId,
  onVerificationSuccess,
  onVerificationError,
  onVerificationCancel
}: Step5BankVerificationProps) {
  const t = useTranslations('')
  const [isInitializing, setIsInitializing] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const hasInitializedRef = useRef(false)
  const initializedTokenRef = useRef<string | null>(null)

  // Initialize Zumrails SDK with modal when connectToken is available
  useEffect(() => {
    if (!connectToken || isInitializing) {
      if (!connectToken) {
        console.warn('[Step5] connectToken is missing, cannot initialize SDK')
      }
      return
    }

    // Validate token format (should be a non-empty string)
    if (typeof connectToken !== 'string' || connectToken.trim().length === 0) {
      console.error(
        '[Step5] Invalid connectToken format:',
        typeof connectToken,
        connectToken
      )
      setInitError(t('Invalid_Verification_Token'))
      return
    }

    const trimmedToken = connectToken.trim()

    // Prevent re-initialization with the same token (tokens can only be used once)
    if (
      hasInitializedRef.current &&
      initializedTokenRef.current === trimmedToken
    ) {
      console.log('[Step5] SDK already initialized with this token, skipping')
      return
    }

    // Prevent initialization if we've already initialized with a different token
    if (
      hasInitializedRef.current &&
      initializedTokenRef.current !== trimmedToken
    ) {
      console.warn(
        '[Step5] SDK already initialized with different token, cannot reinitialize'
      )
      setInitError(t('Verification_Session_Already_Started'))
      return
    }

    const initializeSdk = async () => {
      setIsInitializing(true)
      setInitError(null)

      try {
        console.log(
          '[Step5] Initializing Zumrails SDK with token (length:',
          trimmedToken.length,
          ')'
        )
        // Mark as initialized before calling SDK (tokens are single-use)
        hasInitializedRef.current = true
        initializedTokenRef.current = trimmedToken

        // Initialize SDK without containerId to render as modal
        // Handle all events through SDK callbacks only (no message listeners)
        await initializeZumrailsSdk(trimmedToken, undefined, {
          onLoad: () => {
            console.log('[Step5] Zumrails SDK modal loaded')
          },
          onError: (error: string) => {
            console.error('[Step5] Zumrails SDK error:', error)
            setInitError(error)
            onVerificationError?.(error)
          },
          onConnectorClosed: () => {
            console.log('[Step5] Zumrails connector closed')
            onVerificationCancel?.()
          },
          onSuccess: (connection: ZumrailsConnection) => {
            console.log('[Step5] Zumrails SDK success:', {
              connection
            })

            // Persist connection and call success handler
            persistZumrailsConnection(connection)
            onVerificationSuccess?.(connection)
          }
        })
      } catch (error) {
        console.error('[Step5] Failed to initialize Zumrails SDK:', error)
        // Reset initialization flags on error so user can retry
        hasInitializedRef.current = false
        initializedTokenRef.current = null
        setInitError(
          error instanceof Error
            ? error.message
            : t('Failed_To_Initialize_Verification')
        )
        onVerificationError?.(error)
      } finally {
        setIsInitializing(false)
      }
    }

    void initializeSdk()
  }, [
    connectToken,
    isInitializing,
    onVerificationError,
    onVerificationCancel,
    onVerificationSuccess
  ])

  // The SDK handles the modal display, we just show loading/error states
  return (
    <div className='space-y-6'>
      {isInitializing && (
        <div className='flex flex-col items-center justify-center py-12'>
          <div className='mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#097fa5]'></div>
          <p className='text-sm font-medium text-gray-700'>
            {t('Initializing_Bank_Verification')}
          </p>
        </div>
      )}
      {initError && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
          <p className='text-sm text-red-800'>
            {t('Error')}: {initError}
          </p>
        </div>
      )}
      {!isInitializing && !initError && (
        <div className='py-8 text-center'>
          <p className='mb-4 text-gray-600'>
            {t('Bank_Verification_Modal_Message')}
          </p>
        </div>
      )}
    </div>
  )
}
