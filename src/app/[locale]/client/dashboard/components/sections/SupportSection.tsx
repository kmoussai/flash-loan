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
    <section className='space-y-6'>
      <div className='rounded-lg bg-background-secondary p-4 sm:p-6 lg:p-8'>
        <h2 className='text-lg font-semibold text-gray-900'>
          {t('Support_Title')}
        </h2>
        <p className='mt-2 text-sm text-gray-600'>{t('Support_Subtitle')}</p>
        <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6'>
          <div className='rounded-lg border border-gray-200 bg-white p-4 sm:p-6 min-w-0'>
            <p className='text-sm font-medium text-gray-500'>
              {t('Support_Email')}
            </p>
            <p className='mt-2 text-base font-semibold text-gray-900 break-words'>
              contact@flash-loan.ca
            </p>
            <p className='mt-1 text-sm text-gray-600'>
              {t('Email_Response_Time')}
            </p>
          </div>
          <div className='rounded-lg border border-gray-200 bg-white p-4 sm:p-6 min-w-0'>
            <p className='text-sm font-medium text-gray-500'>
              {t('Support_Phone')}
            </p>
            <p className='mt-2 text-base font-semibold text-gray-900 break-words'>
              +1 (450) 235-8461
            </p>
            <p className='mt-1 text-sm text-gray-600'>
              {t('Phone_Response_Time')}
            </p>
          </div>
        </div>
        <div className='mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6'>
          <div className='rounded-lg border border-dashed border-gray-200 bg-white p-4 sm:p-6 min-w-0'>
            <h3 className='text-base font-semibold text-gray-900'>
              {t('Need_To_Update_Profile')}
            </h3>
            <p className='mt-2 text-sm text-gray-600'>
              {t('Update_Profile_Description')}
            </p>
            <button
              type='button'
              onClick={onNavigateToOverview}
              className='mt-4 inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80'
            >
              {t('Go_To_Profile')}
              <span aria-hidden className='ml-2'>
                &rarr;
              </span>
            </button>
          </div>
          <div className='rounded-lg border border-dashed border-gray-200 bg-white p-4 sm:p-6 min-w-0'>
            <h3 className='text-base font-semibold text-gray-900'>
              {t('Change_Password')}
            </h3>
            <p className='mt-2 text-sm text-gray-600'>
              {t('Change_Password_Description')}
            </p>
            <Link
              href='/client/dashboard/change-password'
              className='mt-4 inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80'
            >
              {t('Change_Password')}
              <span aria-hidden className='ml-2'>
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}


