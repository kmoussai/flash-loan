import { redirect } from '@/src/navigation-server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserProfile, getUserType } from '@/src/lib/supabase/db-helpers'
import { getClientLoanApplications } from '@/src/lib/supabase/loan-helpers'
import type { LoanApplication, User } from '@/src/lib/supabase/types'
import DashboardShell from './components/DashboardShell'
import { SectionId } from './types'

interface ClientDashboardPageProps {
  params: {
    locale: string
  }
  searchParams: {
    section?: SectionId
  }
}

async function fetchDashboardData(
  userId: string
): Promise<{ user: User | null; applications: LoanApplication[] }> {
  const [user, applications = []] = await Promise.all([
    getUserProfile(userId, true),
    getClientLoanApplications(userId, true)
  ])

  return {
    user,
    applications: applications ?? []
  }
}

export default async function ClientDashboardPage({
  params: { locale },
  searchParams: { section: sectionId }
}: ClientDashboardPageProps) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
    return // TypeScript helper - redirect throws but this helps with type narrowing
  }

  const userType = await getUserType(user.id, true)

  if (userType !== 'client') {
    redirect('/')
    return // TypeScript helper
  }

  const { user: profile, applications } = await fetchDashboardData(user.id)

  if (!profile) {
    redirect('/auth/signin')
    return // TypeScript helper
  }

  return (
    <DashboardShell
      locale={locale}
      user={profile}
      sectionId={sectionId}
      loanApplications={applications}
    />
  )
}
