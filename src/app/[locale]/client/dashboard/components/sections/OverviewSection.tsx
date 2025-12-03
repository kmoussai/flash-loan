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
    <section className='space-y-6'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-lg bg-background-secondary p-6'>
          <p className='text-sm font-medium text-gray-500'>
            {t('Active_Applications')}
          </p>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>
            {stats.active}
          </p>
        </div>
        <div className='rounded-lg bg-background-secondary p-6'>
          <p className='text-sm font-medium text-gray-500'>
            {t('Total_Applications')}
          </p>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>
            {statsLoading ? '...' : clientStats?.applicationCount ?? 0}
          </p>
        </div>
        <div className='rounded-lg bg-background-secondary p-6'>
          <p className='text-sm font-medium text-gray-500'>
            {t('Total_Loans')}
          </p>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>
            {statsLoading ? '...' : clientStats?.loanCount ?? 0}
          </p>
        </div>
        <div className='rounded-lg bg-background-secondary p-6'>
          <p className='text-sm font-medium text-gray-500'>
            {t('Next_Payment')}
          </p>
          <p className='mt-2 text-lg font-semibold text-gray-900'>
            {statsLoading ? (
              '...'
            ) : clientStats?.nextPaymentDate ? (
              formatDate(locale, clientStats.nextPaymentDate, t('Not_Available'))
            ) : (
              t('No_Upcoming_Payments') || 'No upcoming payments'
            )}
          </p>
        </div>
      </div>

      <div className='rounded-lg bg-background-secondary p-8'>
        <h2 className='text-lg font-semibold text-gray-900'>
          {t('Next_Steps_Title')}
        </h2>
        <p className='mt-2 text-sm text-gray-600'>{t('Next_Steps_Subtitle')}</p>
        <div className='mt-6 grid gap-4 sm:grid-cols-2'>
          <div className='rounded-lg border border-dashed border-gray-200 bg-white p-6'>
            <p className='text-sm font-medium text-gray-500'>
              {t('Latest_Application')}
            </p>
            {latestApplication ? (
              <div className='mt-3 space-y-2 text-sm text-gray-700'>
                <p className='font-semibold'>
                      {formatCurrency(
                        locale,
                        latestApplication.loan_amount,
                        t('Not_Available')
                      )}
                </p>
                {latestApplicationStatus && (
                  <span className={latestApplicationStatus.className}>
                    {latestApplicationStatus.label}
                  </span>
                )}
                <p>
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
                  className='inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80'
                >
                  {t('View_Document_Requests')}
                  <span aria-hidden className='ml-2'>
                    &rarr;
                  </span>
                </button>
              </div>
            ) : (
              <p className='mt-3 text-sm text-gray-600'>
                {t('No_Applications')}
              </p>
            )}
          </div>
          <div className='rounded-lg border border-dashed border-gray-200 bg-white p-6'>
            <p className='text-sm font-medium text-gray-500'>
              {t('Need_Help')}
            </p>
            <p className='mt-3 text-sm text-gray-600'>
              {t('Need_Help_Description')}
            </p>
            <Link
              href='/contact'
              className='mt-4 inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80'
            >
              {t('Contact_Support')}
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


