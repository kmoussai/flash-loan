'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter, usePathname } from '@/src/navigation'
import { createClient } from '@/src/lib/supabase/client'
import type { LoanApplication, User } from '@/src/lib/supabase/types'
import type { DashboardStats, SectionId, Section } from '../types'
import { buildDashboardStats } from '../utils/stats'
import OverviewSection from './sections/OverviewSection'
import ApplicationsSection from './sections/ApplicationsSection'
import DocumentsSection from './sections/DocumentsSection'
import ContractsSection from './sections/ContractsSection'
import SupportSection from './sections/SupportSection'
import { AdminNotificationCenter } from '@/src/app/admin/components/AdminNotificationCenter'
import LangSwitcher from '@/src/app/[locale]/components/LangSwitcher'
import { clearApplicationStorage } from '@/src/lib/utils/storage'

const sections: Section[] = [
  { id: 'overview', labelKey: 'Overview' },
  { id: 'applications', labelKey: 'Applications' },
  { id: 'documents', labelKey: 'Documents' },
  { id: 'contracts', labelKey: 'Contracts' },
  { id: 'support', labelKey: 'Support' }
]
interface DashboardShellProps {
  locale: string
  user: User
  loanApplications: LoanApplication[]
  sectionId?: SectionId
}

export default function DashboardShell({
  locale,
  user,
  loanApplications,
  sectionId
}: DashboardShellProps) {
  const t = useTranslations('Client_Dashboard')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    const validSections = new Set(sections.map(section => section.id))
    if (sectionId && validSections.has(sectionId)) {
      return sectionId
    }
    return 'overview'
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const searchParams = useSearchParams()

  const stats: DashboardStats = useMemo(
    () => buildDashboardStats(loanApplications),
    [loanApplications]
  )

  const latestApplication = loanApplications[0] ?? null

  const handleSectionChange = (sectionId: SectionId) => {
    if (sectionId === activeSection) {
      setDrawerOpen(false)
      return
    }

    setActiveSection(sectionId)
    setDrawerOpen(false)

    // Update only search params without changing the pathname
    if (sectionId === 'overview') {
      router.replace({
        pathname,
        query: { section: 'overview' }
      })
      return
    }
    setActiveSection(sectionId)
    router.replace({
      pathname,
      query: { section: sectionId }
    })
  }

  const greetingName =
    user.first_name || user.last_name
      ? [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
      : t('Client')

  const handleSignOut = async () => {
    // Clear all application storage (localStorage and sessionStorage)
    clearApplicationStorage()
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  useEffect(() => {
    if (sectionId !== activeSection) {
      router.replace({
        pathname: '/client/dashboard',
        query: { section: 'overview' }
      })
    }
  }, [])

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
  }, [searchParams])

  const goToApplications = () => handleSectionChange('applications')
  const goToOverview = () => handleSectionChange('overview')

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/50'>
      <header className='sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur-md shadow-sm'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between sm:h-20'>
            <div className='flex items-center gap-3 sm:gap-4'>
              <button
                type='button'
                className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-95 lg:hidden'
                onClick={() => setDrawerOpen(true)}
                aria-label={t('Open_Menu')}
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  className='h-5 w-5'
                >
                  <path d='M4 7h16M4 12h16M4 17h16' strokeLinecap='round' />
                </svg>
              </button>
              <div>
                <p className='text-xs font-medium text-gray-500 sm:text-sm'>
                  {t('Welcome_Back')}
                </p>
                <h1 className='text-lg font-semibold text-gray-900 sm:text-xl'>
                  {greetingName}
                </h1>
              </div>
            </div>

            <div className='flex items-center gap-2 sm:gap-3'>
              <Link
                href='/quick-apply'
                className='hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95 sm:inline-block'
              >
                {t('Start_New_Application')}
              </Link>
              <AdminNotificationCenter />
              <LangSwitcher />
              <button
                type='button'
                onClick={handleSignOut}
                className='hidden rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-95 sm:inline-flex'
                aria-label={t('Sign_Out')}
              >
                {t('Sign_Out')}
              </button>
              <button
                type='button'
                onClick={handleSignOut}
                className='inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-95 sm:hidden'
                aria-label={t('Sign_Out')}
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  className='h-5 w-5'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75'
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      <div className='relative mx-auto w-full max-w-7xl lg:flex'>
        <aside
          className={`fixed left-0 top-0 z-50 h-full w-72 transform border-r border-gray-200/80 bg-white/95 backdrop-blur-md px-6 py-8 shadow-xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:flex lg:w-64 lg:flex-shrink-0 lg:translate-x-0 lg:border-r lg:bg-transparent lg:shadow-none lg:px-6 lg:py-10 ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className='flex flex-1 flex-col gap-2'>
            <span className='mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 lg:mb-6'>
              {t('Menu')}
            </span>
            {sections.map(section => (
              <button
                key={section.id}
                type='button'
                onClick={() => handleSectionChange(section.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  activeSection === section.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                }`}
              >
                <span className='transition-transform group-active:scale-95'>
                  {t(section.labelKey)}
                </span>
                <span
                  className={`h-2 w-2 rounded-full transition-all ${
                    activeSection === section.id
                      ? 'bg-white shadow-sm'
                      : 'bg-gray-300 group-hover:bg-gray-400'
                  }`}
                />
              </button>
            ))}
          </nav>
        </aside>

        <main className='flex-1 px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8'>
          <div className='space-y-6 sm:space-y-8'>
            {activeSection === 'overview' && (
              <OverviewSection
                locale={locale}
                stats={stats}
                latestApplication={latestApplication}
                onNavigateToApplications={goToApplications}
              />
            )}

            {activeSection === 'applications' && (
              <ApplicationsSection
                locale={locale}
                loanApplications={loanApplications}
              />
            )}

            {activeSection === 'documents' && (
              <DocumentsSection locale={locale} />
            )}

            {activeSection === 'contracts' && (
              <ContractsSection locale={locale} />
            )}

            {activeSection === 'support' && (
              <SupportSection onNavigateToOverview={goToOverview} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
