'use client'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'

interface SuccessScreenProps {
  referenceNumber: string | null
}

export default function SuccessScreen({ referenceNumber }: SuccessScreenProps) {
  const t = useTranslations('')

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 px-4 py-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='rounded-2xl border border-white/20 bg-white/80 p-6 text-center shadow-xl shadow-[#097fa5]/10 backdrop-blur-xl sm:p-8'>
          <div className='mb-8 flex justify-center'>
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl shadow-green-500/30'>
              <span className='text-4xl text-white'>✓</span>
            </div>
          </div>
          <h2 className='mb-4 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-3xl font-bold text-transparent'>
            {t('Application_Submitted')}
          </h2>
          <p className='mb-6 text-lg text-gray-600'>
            {t('Application_Success_Message')}
          </p>
          <div className='mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6'>
            <p className='mb-2 text-sm text-green-700'>
              {t('Application_Reference')}
            </p>
            <p className='text-2xl font-bold text-green-800'>
              {referenceNumber || '—'}
            </p>
          </div>
          <div className='space-y-4'>
            <p className='text-sm text-gray-600'>
              {t('Application_Next_Steps')}
            </p>
            <div className='grid gap-3 text-sm text-gray-600'>
              <div className='flex items-center justify-center space-x-2'>
                <svg
                  className='h-4 w-4 text-green-500'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>{t('Bank_Verification_Complete')}</span>
              </div>
              <div className='flex items-center justify-center space-x-2'>
                <svg
                  className='h-4 w-4 text-green-500'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>{t('Application_Under_Review')}</span>
              </div>
              <div className='flex items-center justify-center space-x-2'>
                <svg
                  className='h-4 w-4 text-blue-500'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>{t('Approval_Notification')}</span>
              </div>
            </div>
          </div>
          <div className='mt-8'>
            <Link
              href='/'
              className='inline-flex items-center rounded-lg bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] px-6 py-3 font-medium text-white shadow-lg shadow-[#097fa5]/30 transition-all duration-300 hover:scale-105 hover:shadow-xl'
            >
              <svg
                className='mr-2 h-5 w-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
                />
              </svg>
              {t('Back_To_Home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

