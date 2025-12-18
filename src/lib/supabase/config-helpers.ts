/**
 * Configuration Helpers
 * 
 * Functions to read application configurations from the database
 * with fallback to environment variables for backward compatibility.
 */

import { createServerSupabaseAdminClient } from './server'
import type { AppConfiguration } from './types'

export interface ZumRailsConfig {
  apiBaseUrl: string
  customerId?: string
  walletId?: string
  fundingSourceId?: string
  username?: string
  password?: string
  apiKey?: string
}

interface ZumRailsConfigData {
  apiBaseUrl?: string
  customerId?: string
  walletId?: string
  fundingSourceId?: string
}

/**
 * Get ZumRails configuration from database or environment variables
 * Database configuration takes precedence over environment variables
 */
export async function getZumRailsConfig(): Promise<ZumRailsConfig> {
  const supabase = createServerSupabaseAdminClient()

  try {
    // Try to get configuration from database
    const { data, error } = await supabase
      .from('app_configurations')
      .select('*')
      .eq('category', 'payment_provider')
      .eq('config_key', 'zumrails')
      .eq('is_active', true)
      .maybeSingle()

    if (!error && data) {
      const configRow = data as AppConfiguration
      const configData = configRow.config_data as ZumRailsConfigData | null
      
      const config: ZumRailsConfig = {
        apiBaseUrl:
          configData?.apiBaseUrl ||
          process.env.ZUMRAILS_API_BASE_URL ||
          'https://api-sandbox.zumrails.com',
        customerId: configData?.customerId,
        walletId: configData?.walletId || process.env.ZUMRAILS_WALLET_ID,
        fundingSourceId:
          configData?.fundingSourceId || process.env.ZUMRAILS_FUNDING_SRC
      }

      // Decrypt sensitive fields if they exist
      // Note: encrypted fields are stored as bytea, but Supabase returns them as base64 strings
      if (configRow.encrypted_username) {
        try {
          const { data: usernameData, error: decryptError } = await supabase.rpc(
            'decrypt_config_value',
            { encrypted_value: configRow.encrypted_username } as any
          )
          if (!decryptError && usernameData) {
            config.username = usernameData
          }
        } catch (e) {
          console.warn('[Config] Failed to decrypt username:', e)
        }
      }

      if (configRow.encrypted_password) {
        try {
          const { data: passwordData, error: decryptError } = await supabase.rpc(
            'decrypt_config_value',
            { encrypted_value: configRow.encrypted_password } as any
          )
          if (!decryptError && passwordData) {
            config.password = passwordData
          }
        } catch (e) {
          console.warn('[Config] Failed to decrypt password:', e)
        }
      }

      if (configRow.encrypted_api_key) {
        try {
          const { data: apiKeyData, error: decryptError } = await supabase.rpc(
            'decrypt_config_value',
            { encrypted_value: configRow.encrypted_api_key } as any
          )
          if (!decryptError && apiKeyData) {
            config.apiKey = apiKeyData
          }
        } catch (e) {
          console.warn('[Config] Failed to decrypt API key:', e)
        }
      }

      // Fallback to environment variables if database values are missing
      if (!config.username && process.env.ZUMRAILS_USERNAME) {
        config.username = process.env.ZUMRAILS_USERNAME
      }
      if (!config.password && process.env.ZUMRAILS_PASSWORD) {
        config.password = process.env.ZUMRAILS_PASSWORD
      }

      return config
    }
  } catch (error) {
    console.warn('[Config] Error fetching ZumRails config from database:', error)
  }

  // Fallback to environment variables
  return {
    apiBaseUrl:
      process.env.ZUMRAILS_API_BASE_URL || 'https://api-sandbox.zumrails.com',
    customerId: undefined,
    walletId: process.env.ZUMRAILS_WALLET_ID,
    fundingSourceId: process.env.ZUMRAILS_FUNDING_SRC,
    username: process.env.ZUMRAILS_USERNAME,
    password: process.env.ZUMRAILS_PASSWORD,
    apiKey: undefined
  }
}

/**
 * Get a specific configuration value by category and key
 */
export async function getConfigValue(
  category: string,
  configKey: string,
  defaultValue?: any
): Promise<any> {
  const supabase = createServerSupabaseAdminClient()

  try {
    const { data, error } = await supabase
      .from('app_configurations')
      .select('config_data')
      .eq('category', category)
      .eq('config_key', configKey)
      .eq('is_active', true)
      .maybeSingle()

    if (!error && data) {
      const configRow = data as Pick<AppConfiguration, 'config_data'>
      return (configRow.config_data as Record<string, any>) || defaultValue
    }
  } catch (error) {
    console.warn(`[Config] Error fetching config ${category}/${configKey}:`, error)
  }

  return defaultValue
}

