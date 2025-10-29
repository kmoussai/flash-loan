import type { IbvProvider, IbvStatus, IbvProviderData, OtherIbvData } from './types'

/**
 * Transform provider-specific connection data into normalized IBV provider data
 */
export function createIbvProviderData(
  provider: IbvProvider,
  data: Record<string, any>
): IbvProviderData | null {
  if (!data) return null

  switch (provider) {
    case 'flinks':
      return {
        flinks_login_id: data.loginId || data.flinks_login_id,
        flinks_request_id: data.requestId || data.flinks_request_id,
        flinks_institution: data.institution || data.flinks_institution,
        flinks_connected_at: data.connectedAt || new Date().toISOString()
      }

    case 'inverite':
      // For now, only store request_guid and verified_at (connected time)
      // Account information will be added later when we call the Inverite API
      return {
        request_guid: data.requestGuid || data.request_guid || data.request_GUID || data.guid,
        verified_at: data.verifiedAt || data.verified_at || new Date().toISOString()
      }

    case 'plaid':
      return {
        item_id: data.itemId || data.item_id,
        request_id: data.requestId || data.request_id,
        institution: data.institution,
        access_token: data.accessToken || data.access_token
      }

    case 'other':
    default:
      // Store as-is for other providers
      return data as OtherIbvData
  }
}

/**
 * Get provider-specific data from IBV provider data
 */
export function getProviderSpecificData<T = any>(
  provider: IbvProvider,
  providerData: IbvProviderData | null
): T | null {
  if (!providerData) return null

  switch (provider) {
    case 'flinks':
      return providerData as T
    case 'inverite':
      return providerData as T
    case 'plaid':
      return providerData as T
    case 'other':
    default:
      return providerData as T
  }
}

/**
 * Determine IBV status from provider-specific data
 */
export function determineIbvStatus(
  provider: IbvProvider,
  verificationStatus?: string
): IbvStatus {
  if (!verificationStatus) return 'pending'

  const statusMap: Record<string, IbvStatus> = {
    verified: 'verified',
    success: 'verified',
    failed: 'failed',
    error: 'failed',
    cancelled: 'cancelled',
    pending: 'pending',
    processing: 'processing',
    expired: 'expired'
  }

  return statusMap[verificationStatus.toLowerCase()] || 'pending'
}

/**
 * Check if IBV data is complete for a provider
 */
export function isIbvDataComplete(
  provider: IbvProvider,
  providerData: IbvProviderData | null
): boolean {
  if (!providerData) return false

  switch (provider) {
    case 'flinks':
      const flinksData = providerData as any
      return !!flinksData.flinks_login_id && !!flinksData.flinks_request_id

    case 'inverite':
      const inveriteData = providerData as any
      // For now, only require request_guid
      // Account information will be added later
      return !!inveriteData.request_guid

    case 'plaid':
      const plaidData = providerData as any
      return !!plaidData.item_id

    default:
      return true // Assume complete for other providers
  }
}

