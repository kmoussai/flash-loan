/**
 * Zum Rails API Configuration
 * Gets configuration from database with fallback to environment variables
 */

import { getZumRailsConfig } from '@/src/lib/supabase/config-helpers'

let cachedConfig: { apiBaseUrl: string } | null = null
let configCacheExpiry = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get ZumRails API base URL from configuration
 */
export async function getZumRailsApiBaseUrl(): Promise<string> {
  // Use cached config if available and not expired
  if (cachedConfig && Date.now() < configCacheExpiry) {
    return cachedConfig.apiBaseUrl
  }

  try {
    const config = await getZumRailsConfig()
    cachedConfig = { apiBaseUrl: config.apiBaseUrl }
    configCacheExpiry = Date.now() + CACHE_DURATION
    return config.apiBaseUrl
  } catch (error) {
    console.warn('[ZumRails Config] Error fetching config, using env var:', error)
    return process.env.ZUMRAILS_API_BASE_URL || 'https://api-sandbox.zumrails.com'
  }
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getZumRailsApiBaseUrl() instead
 */
export const ZUMRAILS_API_BASE_URL =
  process.env.ZUMRAILS_API_BASE_URL || 'https://api-sandbox.zumrails.com'
