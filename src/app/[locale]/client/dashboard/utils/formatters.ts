import type {
  ApplicationStatus,
  ContractStatus,
  DocumentRequestStatus
} from '@/src/lib/supabase/types'
import { parseLocalDate } from '@/src/lib/utils/date'

const applicationStatusClasses: Record<ApplicationStatus, string> = {
  pending: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  pre_approved: 'bg-blue-100 text-blue-700',
  contract_pending: 'bg-blue-100 text-blue-700',
  contract_signed: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-red-100 text-red-600'
}

const documentStatusClasses: Record<DocumentRequestStatus, string> = {
  requested: 'bg-amber-100 text-amber-700',
  uploaded: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  expired: 'bg-gray-200 text-gray-700'
}

const contractStatusClasses: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  generated: 'bg-blue-100 text-blue-700',
  sent: 'bg-amber-100 text-amber-700',
  pending_signature: 'bg-purple-100 text-purple-700',
  signed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  expired: 'bg-gray-200 text-gray-700'
}

export function formatCurrency(
  locale: string,
  amount?: number | null,
  fallback = '—'
): string {
  if (!Number.isFinite(amount ?? NaN)) {
    return fallback
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'CAD'
    }).format(amount ?? 0)
  } catch (error) {
    console.error('Error formatting currency', error)
    return fallback
  }
}

export function formatDate(
  locale: string,
  value?: string | null,
  fallback = '—'
): string {
  if (!value) {
    return fallback
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium'
    }).format(parseLocalDate(value))
  } catch (error) {
    console.error('Error formatting date', error)
    return fallback
  }
}

export function getApplicationStatusBadgeClass(status: ApplicationStatus): string {
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
    applicationStatusClasses[status] ?? 'bg-gray-100 text-gray-700'
  }`
}

export function getDocumentStatusBadgeClass(
  status: DocumentRequestStatus
): string {
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
    documentStatusClasses[status] ?? 'bg-gray-100 text-gray-700'
  }`
}

export function getContractStatusBadgeClass(status: ContractStatus): string {
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
    contractStatusClasses[status] ?? 'bg-gray-100 text-gray-700'
  }`
}


