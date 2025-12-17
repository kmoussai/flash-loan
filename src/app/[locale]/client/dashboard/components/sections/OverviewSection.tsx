'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import useSWR from 'swr'
import { fetcher } from '@/lib/utils'
import type { LoanApplication } from '@/src/lib/supabase/types'
import type { DashboardStats, ClientStats } from '../../types'
import {
  formatCurrency,
  formatDate,
  getApplicationStatusBadgeClass
} from '../../utils/formatters'

interface OverviewSectionProps {
  locale: string
  stats: DashboardStats
  latestApplication: LoanApplication | null
  onNavigateToApplications: () => void
}

export default function OverviewSection({
  locale,
  stats,
  latestApplication,
  onNavigateToApplications
}: OverviewSectionProps) {
  const t = useTranslations('Client_Dashboard')
  
  // Fetch client stats from API
  const { data: clientStats, isLoading: statsLoading } = useSWR<ClientStats>(
    '/api/client/stats',
    fetcher,
    {
      revalidateOnFocus: false
    }
  )

  const latestApplicationStatus = useMemo(() => {
    if (!latestApplication) {
      return null
    }

    const label =
      t(`Status_${latestApplication.application_status}`, {
        default: latestApplication.application_status
      }) || latestApplication.application_status

    return {
      label,
      className: getApplicationStatusBadgeClass(
        latestApplication.application_status
      )
    }
  }, [latestApplication, t])

  return (
    <section className='space-y-6 sm:space-y-8'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80 transition-all hover:shadow-md hover:ring-gray-300/80'>
          <p className='text-xs font-medium text-gray-500 sm:text-sm'>
            {t('Active_Applications')}
          </p>
          <p className='mt-3 text-2xl font-bold text-gray-900 sm:text-3xl'>
            {stats.active}
          </p>
        </div>
        <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80 transition-all hover:shadow-md hover:ring-gray-300/80'>
          <p className='text-xs font-medium text-gray-500 sm:text-sm'>
            {t('Total_Applications')}
          </p>
          <p className='mt-3 text-2xl font-bold text-gray-900 sm:text-3xl'>
            {statsLoading ? (
              <span className='inline-block h-8 w-12 animate-pulse rounded bg-gray-200' />
            ) : (
              clientStats?.applicationCount ?? 0
            )}
          </p>
        </div>
        <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80 transition-all hover:shadow-md hover:ring-gray-300/80'>
          <p className='text-xs font-medium text-gray-500 sm:text-sm'>
            {t('Total_Loans')}
          </p>
          <p className='mt-3 text-2xl font-bold text-gray-900 sm:text-3xl'>
            {statsLoading ? (
              <span className='inline-block h-8 w-12 animate-pulse rounded bg-gray-200' />
            ) : (
              clientStats?.loanCount ?? 0
            )}
          </p>
        </div>
        <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80 transition-all hover:shadow-md hover:ring-gray-300/80'>
          <p className='text-xs font-medium text-gray-500 sm:text-sm'>
            {t('Next_Payment')}
          </p>
          <p className='mt-3 text-lg font-semibold text-gray-900 sm:text-xl'>
            {statsLoading ? (
              <span className='inline-block h-6 w-24 animate-pulse rounded bg-gray-200' />
            ) : clientStats?.nextPaymentDate ? (
              formatDate(locale, clientStats.nextPaymentDate, t('Not_Available'))
            ) : (
              <span className='text-gray-500'>
                {t('No_Upcoming_Payments') || 'No upcoming payments'}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className='rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80 sm:p-8'>
        <div className='mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 sm:text-xl'>
            {t('Next_Steps_Title')}
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            {t('Next_Steps_Subtitle')}
          </p>
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='group rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 transition-all hover:border-gray-300 hover:bg-gray-50'>
            <p className='text-sm font-semibold text-gray-700'>
              {t('Latest_Application')}
            </p>
            {latestApplication ? (
              <div className='mt-4 space-y-3'>
                <p className='text-xl font-bold text-gray-900'>
                  {formatCurrency(
                    locale,
                    latestApplication.loan_amount,
                    t('Not_Available')
                  )}
                </p>
                {latestApplicationStatus && (
                  <div>
                    <span className={latestApplicationStatus.className}>
                      {latestApplicationStatus.label}
                    </span>
                  </div>
                )}
                <p className='text-sm text-gray-600'>
                  {t('Submitted_On', {
                    date: formatDate(
                      locale,
                      latestApplication.submitted_at ??
                        latestApplication.created_at,
                      t('Not_Available')
                    )
                  })}
                </p>
                <button
                  type='button'
                  onClick={onNavigateToApplications}
                  className='mt-4 inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/20 active:scale-95'
                >
                  {t('View_Document_Requests')}
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
            ) : (
              <p className='mt-4 text-sm text-gray-600'>{t('No_Applications')}</p>
            )}
          </div>
          <div className='group rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 transition-all hover:border-gray-300 hover:bg-gray-50'>
            <p className='text-sm font-semibold text-gray-700'>
              {t('Need_Help')}
            </p>
            <p className='mt-4 text-sm text-gray-600'>
              {t('Need_Help_Description')}
            </p>
            <Link
              href='/contact'
              className='mt-4 inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/20 active:scale-95'
            >
              {t('Contact_Support')}
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


