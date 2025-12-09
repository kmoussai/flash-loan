'use client'

import { IbvProvider } from '@/src/lib/supabase/types'
import { useEffect } from 'react'
import {
  addInveriteListener,
  persistInveriteConnection,
  type InveriteConnection
} from '@/src/lib/ibv/inverite'
import {
  addZumrailsListener,
  persistZumrailsConnection,
  type ZumrailsConnection
} from '@/src/lib/ibv/zumrails'

interface Step5BankVerificationProps {
  iframeUrl: string
  ibvProvider?: IbvProvider
  applicationId?: string | null
  onVerificationSuccess?: (data: {
    provider: IbvProvider
    connection: InveriteConnection | ZumrailsConnection
  }) => void
  onVerificationError?: (error?: unknown) => void
  onVerificationCancel?: () => void
}

export default function Step5BankVerification({
  iframeUrl,
  ibvProvider = 'zumrails',
  applicationId,
  onVerificationSuccess,
  onVerificationError,
  onVerificationCancel
}: Step5BankVerificationProps) {
  // Set up event listeners based on provider
  useEffect(() => {
    if (!iframeUrl) return

    let cleanup: (() => void) | undefined

    if (ibvProvider === 'zumrails') {
      cleanup = addZumrailsListener(true, {
        onSuccess: (connection: ZumrailsConnection) => {
          persistZumrailsConnection(connection)
          onVerificationSuccess?.({
            provider: 'zumrails',
            connection
          })
        },
        onError: (error?: unknown) => {
          onVerificationError?.(error)
        },
        onCancel: () => {
          onVerificationCancel?.()
        }
      })
    }

    return () => {
      if (cleanup) cleanup()
    }
  }, [
    iframeUrl,
    ibvProvider,
    onVerificationSuccess,
    onVerificationError,
    onVerificationCancel
  ])

  return (
    <div className='space-y-6'>
      <div className='sm:mb-8'>
        <div className='overflow-hidden border border-gray-200 shadow-lg sm:rounded-xl'>
          <iframe
            className='h-[600px] w-full border-0'
            src={iframeUrl}
            title='Bank Verification'
            allow='payment; encrypted-media; autoplay; camera; microphone; geolocation'
          />
        </div>
      </div>
    </div>
  )
}
