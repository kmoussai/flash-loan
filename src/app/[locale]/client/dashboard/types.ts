import type { LoanApplication } from '@/src/lib/supabase/types'

export type SectionId = 'overview' | 'applications' | 'documents' | 'support'

export interface DashboardStats {
  active: number
  approved: number
  latestUpdate: string | null
}

export type { LoanApplication }


