'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'

interface SupportSectionProps {
  onNavigateToOverview: () => void
}

export default function SupportSection({
  onNavigateToOverview
}: SupportSectionProps) {
  const t = useTranslations('Client_Dashboard')

  return (
    <section className='space-y-6 sm:space-y-8'>
      <div className='rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80 sm:p-8'>
        <div className='mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 sm:text-xl'>
            {t('Support_Title')}
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            {t('Support_Subtitle')}
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6'>
          <div className='group rounded-xl border border-gray-200/80 bg-gray-50/50 p-6 transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'>
            <p className='text-sm font-semibold text-gray-600'>
              {t('Support_Email')}
            </p>
            <p className='mt-3 text-lg font-bold text-gray-900 break-words'>
              contact@flash-loan.ca
            </p>
            <p className='mt-2 text-sm text-gray-600'>
              {t('Email_Response_Time')}
            </p>
          </div>
          <div className='group rounded-xl border border-gray-200/80 bg-gray-50/50 p-6 transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'>
            <p className='text-sm font-semibold text-gray-600'>
              {t('Support_Phone')}
            </p>
            <p className='mt-3 text-lg font-bold text-gray-900 break-words'>
              +1 (450) 235-8461
            </p>
            <p className='mt-2 text-sm text-gray-600'>
              {t('Phone_Response_Time')}
            </p>
          </div>
        </div>
        <div className='mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6'>
          <div className='group rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 transition-all hover:border-gray-300 hover:bg-gray-50'>
            <h3 className='text-base font-semibold text-gray-900'>
              {t('Need_To_Update_Profile')}
            </h3>
            <p className='mt-3 text-sm text-gray-600'>
              {t('Update_Profile_Description')}
            </p>
            <button
              type='button'
              onClick={onNavigateToOverview}
              className='mt-4 inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/20 active:scale-95'
            >
              {t('Go_To_Profile')}
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 20 20'
                fill='currentColor'
                className='ml-2 h-4 w-4'
              >
                <path
                  fillRule='evenodd'
                  d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
                  clipRule='evenodd'
                />
              </svg>
            </button>
          </div>
          <div className='group rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 transition-all hover:border-gray-300 hover:bg-gray-50'>
            <h3 className='text-base font-semibold text-gray-900'>
              {t('Change_Password')}
            </h3>
            <p className='mt-3 text-sm text-gray-600'>
              {t('Change_Password_Description')}
            </p>
            <Link
              href='/client/dashboard/change-password'
              className='mt-4 inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/20 active:scale-95'
            >
              {t('Change_Password')}
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 20 20'
                fill='currentColor'
                className='ml-2 h-4 w-4'
              >
                <path
                  fillRule='evenodd'
                  d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
                  clipRule='evenodd'
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}


