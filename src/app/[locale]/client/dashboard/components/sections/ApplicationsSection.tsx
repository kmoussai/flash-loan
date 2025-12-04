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
    <section className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900'>
            {t('Applications_Title')}
          </h2>
          <p className='text-sm text-gray-600'>{t('Applications_Subtitle')}</p>
        </div>
      </div>

      <div className='space-y-4'>
        {!hasApplications && (
          <div className='rounded-lg border border-dashed border-gray-200 bg-background-secondary p-8 text-center'>
            <p className='text-sm text-gray-600'>{t('No_Applications_Long')}</p>
            <Link
              href='/quick-apply'
              className='hover:text-primary/80 mt-4 inline-flex items-center text-sm font-semibold text-primary'
            >
              {t('Start_Your_First_Application')}
              <span aria-hidden className='ml-2'>
                &rarr;
              </span>
            </Link>
          </div>
        )}

        {formattedApplications.map(application => (
          <article
            key={application.id}
            className='rounded-lg bg-background-secondary p-6 shadow-sm'
          >
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='space-y-1'>
                <p className='text-sm font-medium text-gray-500'>
                  {t('Application_Number', {
                    id: application.id.slice(0, 8).toUpperCase()
                  })}
                </p>
                <p className='text-2xl font-semibold text-gray-900'>
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
              </div>
              <div className='flex flex-col items-start gap-3 sm:items-end'>
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
            <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='text-sm text-gray-600'>
                {application.incomeSourceLabel}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
