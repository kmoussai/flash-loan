import type { LoanApplication } from '@/src/lib/supabase/types'

export interface Section {
  id: SectionId
  labelKey: string
  isActive?: boolean;
}

export type SectionId =
  | 'overview'
  | 'applications'
  | 'documents'
  | 'contracts'
  | 'support'

export interface DashboardStats {
  active: number
  approved: number
  latestUpdate: string | null
}

export interface ClientStats {
  loanCount: number
  applicationCount: number
  nextPaymentDate: string | null
}

export type { LoanApplication }


