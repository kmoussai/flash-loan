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
    <div className='min-h-screen bg-background pb-12'>
      <header className='relative z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm'>
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
              className='hover:bg-primary/90 hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition sm:inline-block'
            >
              {t('Start_New_Application')}
            </Link>
            <AdminNotificationCenter />
            <LangSwitcher />
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

      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      <div className='relative mx-auto w-full max-w-6xl lg:flex'>
        <aside
          className={`fixed left-0 top-0 z-50 h-full w-72 transform border-r border-gray-200 bg-white px-6 py-10 transition-transform duration-200 ease-out lg:static lg:z-auto lg:flex lg:w-64 lg:flex-shrink-0 lg:translate-x-0 lg:border-r lg:bg-white lg:px-6 lg:py-10 ${
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
                className={`focus-visible:ring-primary/30 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 ${
                  activeSection === section.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-background-secondary text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{t(section.labelKey)}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    activeSection === section.id ? 'bg-white' : 'bg-gray-300'
                  }`}
                />
              </button>
            ))}
          </nav>
        </aside>

        <main className='flex-1 px-6 pb-12 pt-10'>
          <div className='space-y-6'>
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
              <DocumentsSection
                locale={locale}
                onNavigateToApplications={goToApplications}
              />
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
