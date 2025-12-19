import { IBVSummary } from '../../../api/inverite/fetch/[guid]/types'

export interface IbvRequestHistory {
  id: string
  loan_application_id: string
  client_id: string
  provider: string
  status: string
  request_guid: string | null
  request_url: string | null
  provider_data: Record<string, any> | null
  results: Record<string, any> | null
  error_details: Record<string, any> | null
  note: string | null
  requested_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ZumrailsHolder {
  FirstName: string
  LastName: string
  FullName: string
  Email: string
  PhoneNumber: string
  AddressCivic: string
  AddressCity: string
  AddressProvince: string
  AddressCountry: string
  AddressPostalCode: string
}

export interface UserInfo {
  first_name: string | null
  last_name: string | null
}

export interface IbvApiResponse {
  application_id: string
  ibv_provider: string | null
  ibv_status: string | null
  ibv_verified_at: string | null
  request_guid: string | null
  ibv_results: IBVSummary
  holder_info?: ZumrailsHolder | null
  user_info?: UserInfo | null
}

export const getStatusColor = (status: string | null) => {
  if (!status) return 'bg-gray-100 text-gray-700'
  const s = status.toLowerCase()
  if (s.includes('verified') || s.includes('approved'))
    return 'bg-emerald-100 text-emerald-700'
  if (s.includes('pending') || s.includes('processing'))
    return 'bg-amber-100 text-amber-700'
  if (s.includes('failed') || s.includes('rejected'))
    return 'bg-red-100 text-red-700'
  return 'bg-blue-100 text-blue-700'
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return null
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}
