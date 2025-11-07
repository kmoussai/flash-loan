'use client'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

export default function InveriteCallbackPage() {
  const t = useTranslations('')
  const [messageSent, setMessageSent] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Automatically send success message immediately
    const sendMessage = () => {
      const message = {
        success: true,
        data: {
          task_status: 'success',
          status: 'success'
        }
      }

      const origin = window.location.origin

      // Try to send to parent window
      if (window.opener) {
        window.opener.postMessage(message, origin)
        console.log('[Inverite Callback] Sent message to opener')
        setMessageSent(true)
        setTimeout(() => {
          try {
            window.close()
          } catch (e) {
            console.warn('[Inverite Callback] Could not close window')
          }
        }, 1000)
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, origin)
        console.log('[Inverite Callback] Sent message to parent')
        setMessageSent(true)
      } else {
        window.postMessage(message, origin)
        console.log('[Inverite Callback] Sent broadcast message', message)
        setMessageSent(true)
      }
    }

    // Small delay to ensure page is loaded
    setTimeout(sendMessage, 100)
  }, [])

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-6'>
      <div className='w-full max-w-md rounded-lg bg-background-secondary p-8 shadow-lg'>
        <div className='text-center'>
          {messageSent ? (
            <>
              <div className='mb-4 flex justify-center'>
                <svg
                  className='h-12 w-12 text-green-600'
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
              <h1 className='mb-4 text-2xl font-bold text-green-600'>
                {t('Bank_Verification_Complete') || 'Bank Verification Complete'}
              </h1>
              <p className='text-sm text-green-800'>
                {t('Message_Sent') ||
                  'Success message sent. This window will close automatically.'}
              </p>
            </>
          ) : (
            <>
              <div className='mb-4 flex justify-center'>
                <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent'></div>
              </div>
              <h1 className='mb-4 text-2xl font-bold text-primary'>
                {t('Processing_Verification') || 'Processing Verification...'}
              </h1>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

