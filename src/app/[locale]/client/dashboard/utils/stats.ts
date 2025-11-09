import type { LoanApplication, ApplicationStatus } from '@/src/lib/supabase/types'
import type { DashboardStats } from '../types'

const ACTIVE_STATUSES: ApplicationStatus[] = [
  'pending',
  'processing',
  'pre_approved',
  'contract_pending'
]

export function buildDashboardStats(loanApplications: LoanApplication[]): DashboardStats {
  const active = loanApplications.reduce((count, application) => {
    return ACTIVE_STATUSES.includes(application.application_status) ? count + 1 : count
  }, 0)

  const approved = loanApplications.reduce((count, application) => {
    return application.application_status === 'approved' ? count + 1 : count
  }, 0)

  const latestUpdate =
    loanApplications[0]?.updated_at ?? loanApplications[0]?.created_at ?? null

  return {
    active,
    approved,
    latestUpdate
  }
}


