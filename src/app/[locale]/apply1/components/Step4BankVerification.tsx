'use client'
import { useTranslations } from 'next-intl'
import { INVERITE_IFRAME_CONFIG } from '@/src/lib/ibv/inverite'

interface Step4BankVerificationProps {
  ibvVerified: boolean
}

export default function Step4BankVerification({
  ibvVerified
}: Step4BankVerificationProps) {
  const t = useTranslations('')

  return (
    <div className='space-y-6'>
      {/* Inverite Verification */}
      <div className='mb-6 sm:mb-8'>
        <div className='overflow-hidden rounded-xl border border-gray-200 shadow-lg'>
          {/* Inverite iframe */}
          <iframe
            className={INVERITE_IFRAME_CONFIG.className}
            src={INVERITE_IFRAME_CONFIG.src}
            title={INVERITE_IFRAME_CONFIG.title}
            allow={INVERITE_IFRAME_CONFIG.allow}
          ></iframe>
        </div>
      </div>
      {/* Verification Status */}
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

