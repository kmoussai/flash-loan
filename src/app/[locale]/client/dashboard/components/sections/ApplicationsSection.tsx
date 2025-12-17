'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import type { LoanApplication } from '@/src/lib/supabase/types'
import {
  formatCurrency,
  formatDate,
  getApplicationStatusBadgeClass
} from '../../utils/formatters'

interface ApplicationsSectionProps {
  locale: string
  loanApplications: LoanApplication[]
}

const incomeSourceKeys: Record<string, string> = {
  employed: 'Income_Source_employed',
  'employment-insurance': 'Income_Source_employment-insurance',
  'self-employed': 'Income_Source_self-employed',
  'csst-saaq': 'Income_Source_csst-saaq',
  'parental-insurance': 'Income_Source_parental-insurance',
  'retirement-plan': 'Income_Source_retirement-plan'
}

export default function ApplicationsSection({
  locale,
  loanApplications
}: ApplicationsSectionProps) {
  const t = useTranslations('Client_Dashboard')

  const hasApplications = loanApplications.length > 0

  const formattedApplications = useMemo(
    () =>
      loanApplications.map(application => ({
        ...application,
        statusLabel:
          t(`Status_${application.application_status}`, {
            default: application.application_status.replace('_', ' ')
          }) || application.application_status,
        statusClass: getApplicationStatusBadgeClass(
          application.application_status
        ),
        incomeSourceLabel:
          application.income_source &&
          incomeSourceKeys[application.income_source]
            ? t(incomeSourceKeys[application.income_source])
            : t('Income_Source_Unknown')
      })),
    [loanApplications, t]
  )

  return (
    <section className='space-y-6 sm:space-y-8'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900 sm:text-xl'>
            {t('Applications_Title')}
          </h2>
          <p className='mt-1 text-sm text-gray-600'>
            {t('Applications_Subtitle')}
          </p>
        </div>
      </div>

      <div className='space-y-4'>
        {!hasApplications && (
          <div className='rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center sm:p-12'>
            <p className='text-sm text-gray-600 sm:text-base'>
              {t('No_Applications_Long')}
            </p>
            <Link
              href='/quick-apply'
              className='mt-6 inline-flex items-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95'
            >
              {t('Start_Your_First_Application')}
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
        )}

        {formattedApplications.map(application => (
          <article
            key={application.id}
            className='group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80 transition-all hover:shadow-md hover:ring-gray-300/80 sm:p-8'
          >
            <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
              <div className='flex-1 space-y-2'>
                <p className='text-xs font-medium text-gray-500 sm:text-sm'>
                  {t('Application_Number', {
                    id: application.id.slice(0, 8).toUpperCase()
                  })}
                </p>
                <p className='text-2xl font-bold text-gray-900 sm:text-3xl'>
                  {formatCurrency(
                    locale,
                    application.loan_amount,
                    t('Not_Available')
                  )}
                </p>
                <p className='text-sm text-gray-600'>
                  {t('Submitted_On', {
                    date: formatDate(
                      locale,
                      application.submitted_at ?? application.created_at,
                      t('Not_Available')
                    )
                  })}
                </p>
                <div className='pt-2'>
                  <p className='text-sm text-gray-600'>
                    {application.incomeSourceLabel}
                  </p>
                </div>
              </div>
              <div className='flex flex-row items-start gap-3 sm:flex-col sm:items-end'>
                <span className={application.statusClass}>
                  {application.statusLabel}
                </span>
                {application.ibv_status && (
                  <span className='text-xs font-medium text-gray-500'>
                    {t('Bank_Verification', {
                      status:
                        t(`Ibv_Status_${application.ibv_status}`, {
                          default: application.ibv_status
                        }) || application.ibv_status
                    })}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
