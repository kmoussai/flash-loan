'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/src/navigation'
import { createClient } from '@/src/lib/supabase/client'
import type { LoanApplication, User } from '@/src/lib/supabase/types'

type SectionId = 'overview' | 'applications' | 'documents' | 'support'

interface DashboardShellProps {
  locale: string
  user: User
  loanApplications: LoanApplication[]
}

interface Section {
  id: SectionId
  label: string
}

export default function DashboardShell({
  locale,
  user,
  loanApplications
}: DashboardShellProps) {
  const t = useTranslations('Client_Dashboard')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const searchParams = useSearchParams()

  const sections: Section[] = useMemo(
    () => [
      { id: 'overview', label: t('Overview') },
      { id: 'applications', label: t('Applications') },
      { id: 'documents', label: t('Documents') },
      { id: 'support', label: t('Support') }
    ],
    [t]
  )

  const stats = useMemo(() => {
    const activeStatuses: LoanApplication['application_status'][] = [
      'pending',
      'processing',
      'pre_approved',
      'contract_pending'
    ]

    const active = loanApplications.filter(application =>
      activeStatuses.includes(application.application_status)
    ).length

    const approved = loanApplications.filter(
      application => application.application_status === 'approved'
    ).length

    const latestUpdate =
      loanApplications[0]?.updated_at ?? loanApplications[0]?.created_at ?? null

    return {
      active,
      approved,
      latestUpdate
    }
  }, [loanApplications])

  const handleSectionChange = (sectionId: SectionId) => {
    if (sectionId === activeSection) {
      setDrawerOpen(false)
      return
    }

    setActiveSection(sectionId)
    setDrawerOpen(false)

    if (sectionId === 'overview') {
      router.replace('/client/dashboard')
      return
    }

    router.replace({
      pathname: '/client/dashboard',
      query: { section: sectionId }
    })
  }

  const formatDate = (value: string | null) => {
    if (!value) {
      return t('Not_Available')
    }

    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium'
      }).format(new Date(value))
    } catch (error) {
      console.error('Error formatting date', error)
      return value
    }
  }

  const formatCurrency = (amount: number) => {
    if (!Number.isFinite(amount)) {
      return t('Not_Available')
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'CAD'
      }).format(amount)
    } catch (error) {
      console.error('Error formatting currency', error)
      return `$${amount.toFixed(2)}`
    }
  }

  const getStatusStyles = (status: LoanApplication['application_status']) => {
    const baseClasses =
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium'

    switch (status) {
      case 'approved':
      case 'contract_signed':
        return `${baseClasses} bg-green-100 text-green-700`
      case 'pending':
      case 'processing':
      case 'pre_approved':
      case 'contract_pending':
        return `${baseClasses} bg-blue-100 text-blue-700`
      case 'rejected':
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-600`
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`
    }
  }

  const greetingName =
    user.first_name || user.last_name
      ? [user.first_name, user.last_name]
          .filter(Boolean)
          .join(' ')
          .trim()
      : t('Client')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  useEffect(() => {
    const sectionParam = searchParams.get('section')
    const validSections = new Set(sections.map(section => section.id))

    if (sectionParam && validSections.has(sectionParam as SectionId)) {
      setActiveSection(prev =>
        prev === sectionParam ? prev : (sectionParam as SectionId)
      )
      return
    }

    if (!sectionParam && activeSection !== 'overview') {
      setActiveSection('overview')
    }
  }, [searchParams, sections, activeSection])

  return (
    <div className='min-h-screen bg-background pb-12'>
      <header className='border-b border-gray-200 bg-white/90 backdrop-blur-sm'>
        <div className='mx-auto flex max-w-6xl items-center justify-between px-6 py-6'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 lg:hidden'
              onClick={() => setDrawerOpen(true)}
              aria-label={t('Open_Menu')}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                className='h-5 w-5'
              >
                <path d='M4 7h16M4 12h16M4 17h16' strokeLinecap='round' />
              </svg>
            </button>
            <div>
              <p className='text-sm font-medium text-gray-500'>
                {t('Welcome_Back')}
              </p>
              <h1 className='text-xl font-semibold text-gray-900'>
                {greetingName}
              </h1>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <Link
              href='/quick-apply'
              className='hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 sm:inline-block'
            >
              {t('Start_New_Application')}
            </Link>
            <button
              type='button'
              onClick={handleSignOut}
              className='rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100'
            >
              {t('Sign_Out')}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      {/* Drawer navigation */}
      <div className='relative mx-auto w-full max-w-6xl lg:flex'>
        <aside
          className={`fixed left-0 top-0 z-50 h-full w-72 transform border-r border-gray-200 bg-white px-6 py-10 transition-transform duration-200 ease-out lg:static lg:z-auto lg:flex lg:w-64 lg:translate-x-0 lg:flex-shrink-0 lg:border-r lg:bg-white lg:px-6 lg:py-10 ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className='flex flex-1 flex-col gap-2'>
            <span className='mb-6 text-xs font-semibold uppercase tracking-widest text-gray-400'>
              {t('Menu')}
            </span>
            {sections.map(section => (
              <button
                key={section.id}
                type='button'
                onClick={() => handleSectionChange(section.id)}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  activeSection === section.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-background-secondary text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{section.label}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    activeSection === section.id
                      ? 'bg-white'
                      : 'bg-gray-300'
                  }`}
                />
              </button>
            ))}
          </nav>
        </aside>

        <main className='flex-1 px-6 pb-12 pt-10'>
          <div className='space-y-6'>
            {activeSection === 'overview' && (
              <section className='space-y-6'>
                <div className='grid gap-4 md:grid-cols-3'>
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
                      {t('Approved_Applications')}
                    </p>
                    <p className='mt-2 text-3xl font-semibold text-gray-900'>
                      {stats.approved}
                    </p>
                  </div>
                  <div className='rounded-lg bg-background-secondary p-6'>
                    <p className='text-sm font-medium text-gray-500'>
                      {t('Last_Update')}
                    </p>
                    <p className='mt-2 text-lg font-semibold text-gray-900'>
                      {formatDate(stats.latestUpdate)}
                    </p>
                  </div>
                </div>

                <div className='rounded-lg bg-background-secondary p-8'>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    {t('Next_Steps_Title')}
                  </h2>
                  <p className='mt-2 text-sm text-gray-600'>
                    {t('Next_Steps_Subtitle')}
                  </p>
                  <div className='mt-6 grid gap-4 sm:grid-cols-2'>
                    <div className='rounded-lg border border-dashed border-gray-200 bg-white p-6'>
                      <p className='text-sm font-medium text-gray-500'>
                        {t('Latest_Application')}
                      </p>
                      {loanApplications.length > 0 ? (
                        <div className='mt-3 space-y-1 text-sm text-gray-700'>
                          <p className='font-semibold'>
                            {formatCurrency(loanApplications[0].loan_amount)}
                          </p>
                          <span
                            className={`mt-1 ${getStatusStyles(
                              loanApplications[0].application_status
                            )}`}
                          >
                            {t(
                              `Status_${loanApplications[0].application_status}`,
                              { default: loanApplications[0].application_status }
                            )}
                          </span>
                          <p>
                            {t('Submitted_On', {
                              date: formatDate(
                                loanApplications[0].submitted_at ??
                                  loanApplications[0].created_at
                              )
                            })}
                          </p>
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
            )}

            {activeSection === 'applications' && (
              <section className='space-y-6'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>
                      {t('Applications_Title')}
                    </h2>
                    <p className='text-sm text-gray-600'>
                      {t('Applications_Subtitle')}
                    </p>
                  </div>
                  <Link
                    href='/quick-apply'
                    className='inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90'
                  >
                    {t('Start_New_Application')}
                  </Link>
                </div>

                <div className='space-y-4'>
                  {loanApplications.length === 0 && (
                    <div className='rounded-lg border border-dashed border-gray-200 bg-background-secondary p-8 text-center'>
                      <p className='text-sm text-gray-600'>
                        {t('No_Applications_Long')}
                      </p>
                      <Link
                        href='/quick-apply'
                        className='mt-4 inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80'
                      >
                        {t('Start_Your_First_Application')}
                        <span aria-hidden className='ml-2'>
                          &rarr;
                        </span>
                      </Link>
                    </div>
                  )}

                  {loanApplications.map(application => (
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
                            {formatCurrency(application.loan_amount)}
                          </p>
                          <p className='text-sm text-gray-600'>
                            {t('Submitted_On', {
                              date: formatDate(
                                application.submitted_at ?? application.created_at
                              )
                            })}
                          </p>
                        </div>
                        <div className='flex flex-col items-start gap-3 sm:items-end'>
                          <span className={getStatusStyles(
                            application.application_status
                          )}>
                            {t(
                              `Status_${application.application_status}`,
                              {
                                default: application.application_status.replace(
                                  '_',
                                  ' '
                                )
                              }
                            )}
                          </span>
                          {application.ibv_status && (
                            <span className='text-xs font-medium text-gray-500'>
                              {t('Bank_Verification', {
                                status: t(
                                  `Ibv_Status_${application.ibv_status}`,
                                  {
                                    default: application.ibv_status
                                  }
                                )
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='text-sm text-gray-600'>
                          {application.income_source
                            ? t(
                                `Income_Source_${application.income_source}`,
                                {
                                  default: application.income_source.replace(
                                    '-',
                                    ' '
                                  )
                                }
                              )
                            : t('Income_Source_Unknown')}
                        </div>
                        <div className='flex flex-wrap gap-3'>
                          <Link
                            href={{
                              pathname: '/upload-documents',
                              query: { application: application.id }
                            }}
                            className='inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100'
                          >
                            {t('Manage_Documents')}
                          </Link>
                          <Link
                            href={{
                              pathname: '/quick-apply',
                              query: { draft: application.id }
                            }}
                            className='inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10'
                          >
                            {t('Continue_Application')}
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeSection === 'documents' && (
              <section className='space-y-6'>
                <div className='rounded-lg bg-background-secondary p-8'>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    {t('Documents_Title')}
                  </h2>
                  <p className='mt-2 text-sm text-gray-600'>
                    {t('Documents_Description')}
                  </p>
                  <div className='mt-6 flex flex-wrap gap-3'>
                    <Link
                      href='/upload-documents'
                      className='inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90'
                    >
                      {t('Upload_New_Documents')}
                    </Link>
                    <button
                      type='button'
                      onClick={() => handleSectionChange('applications')}
                      className='inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100'
                    >
                      {t('View_Document_Requests')}
                    </button>
                  </div>
                </div>
                <div className='rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center'>
                  <p className='text-sm text-gray-600'>
                    {t('Documents_Coming_Soon')}
                  </p>
                </div>
              </section>
            )}

            {activeSection === 'support' && (
              <section className='space-y-6'>
                <div className='rounded-lg bg-background-secondary p-8'>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    {t('Support_Title')}
                  </h2>
                  <p className='mt-2 text-sm text-gray-600'>
                    {t('Support_Subtitle')}
                  </p>
                  <div className='mt-6 grid gap-6 sm:grid-cols-2'>
                    <div className='rounded-lg border border-gray-200 bg-white p-6'>
                      <p className='text-sm font-medium text-gray-500'>
                        {t('Support_Email')}
                      </p>
                      <p className='mt-2 text-base font-semibold text-gray-900'>
                        contact@flash-loan.ca
                      </p>
                      <p className='mt-1 text-sm text-gray-600'>
                        {t('Email_Response_Time')}
                      </p>
                    </div>
                    <div className='rounded-lg border border-gray-200 bg-white p-6'>
                      <p className='text-sm font-medium text-gray-500'>
                        {t('Support_Phone')}
                      </p>
                      <p className='mt-2 text-base font-semibold text-gray-900'>
                        +1 (450) 235-8461
                      </p>
                      <p className='mt-1 text-sm text-gray-600'>
                        {t('Phone_Response_Time')}
                      </p>
                    </div>
                  </div>
                  <div className='mt-8 rounded-lg border border-dashed border-gray-200 bg-white p-6'>
                    <h3 className='text-base font-semibold text-gray-900'>
                      {t('Need_To_Update_Profile')}
                    </h3>
                    <p className='mt-2 text-sm text-gray-600'>
                      {t('Update_Profile_Description')}
                    </p>
                    <button
                      type='button'
                      onClick={() => handleSectionChange('overview')}
                      className='mt-4 inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80'
                    >
                      {t('Go_To_Profile')}
                      <span aria-hidden className='ml-2'>
                        &rarr;
                      </span>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

