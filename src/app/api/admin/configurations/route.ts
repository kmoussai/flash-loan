import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import type { AppConfiguration, AppConfigurationUpdate } from '@/src/lib/supabase/types'

/**
 * GET /api/admin/configurations
 * Get all configurations or filter by category/key
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const configKey = searchParams.get('key')

    let query = supabase
      .from('app_configurations')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('config_key', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    if (configKey) {
      query = query.eq('config_key', configKey)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Config API] Error fetching configurations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch configurations', details: error.message },
        { status: 500 }
      )
    }

    // Decrypt sensitive fields before returning
    const decryptedData = await Promise.all(
      (data || []).map(async (config: AppConfiguration) => {
        const decrypted: any = { ...config }
        
        // Decrypt sensitive fields if they exist
        if (config.encrypted_username) {
          try {
            const { data: usernameData, error } = await supabase.rpc(
              'decrypt_config_value',
              { encrypted_value: config.encrypted_username } as any
            )
            if (!error && usernameData) {
              decrypted.username = usernameData
            }
          } catch (e) {
            console.warn('[Config API] Failed to decrypt username:', e)
          }
        }
        
        if (config.encrypted_password) {
          // Don't return password, just indicate it's set
          decrypted.has_password = true
        }
        
        if (config.encrypted_api_key) {
          try {
            const { data: apiKeyData, error } = await supabase.rpc(
              'decrypt_config_value',
              { encrypted_value: config.encrypted_api_key } as any
            )
            if (!error && apiKeyData) {
              decrypted.api_key = apiKeyData
            }
          } catch (e) {
            console.warn('[Config API] Failed to decrypt API key:', e)
          }
        }

        // Remove encrypted fields from response
        delete decrypted.encrypted_username
        delete decrypted.encrypted_password
        delete decrypted.encrypted_api_key

        return decrypted
      })
    )

    return NextResponse.json({ data: decryptedData })
  } catch (error: any) {
    console.error('[Config API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/configurations
 * Create a new configuration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await request.json()

    const {
      category,
      config_key,
      config_data,
      username,
      password,
      api_key,
      description,
      is_active = true
    } = body

    // Validate required fields
    if (!category || !config_key) {
      return NextResponse.json(
        { error: 'category and config_key are required' },
        { status: 400 }
      )
    }

    // Check if configuration already exists
    const { data: existing } = await supabase
      .from('app_configurations')
      .select('id')
      .eq('category', category)
      .eq('config_key', config_key)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Configuration already exists. Use PUT to update.' },
        { status: 409 }
      )
    }

    // Prepare encrypted fields
    const encryptedData: any = {
      category,
      config_key,
      config_data: config_data || {},
      description,
      is_active
    }

    // Encrypt sensitive fields if provided
    if (username) {
      const { data: encryptedUsername } = await supabase.rpc(
        'encrypt_config_value',
        { value: username } as any
      )
      if (encryptedUsername) {
        encryptedData.encrypted_username = encryptedUsername
      }
    }

    if (password) {
      const { data: encryptedPassword } = await supabase.rpc(
        'encrypt_config_value',
        { value: password } as any
      )
      if (encryptedPassword) {
        encryptedData.encrypted_password = encryptedPassword
      }
    }

    if (api_key) {
      const { data: encryptedApiKey } = await supabase.rpc(
        'encrypt_config_value',
        { value: api_key } as any
      )
      if (encryptedApiKey) {
        encryptedData.encrypted_api_key = encryptedApiKey
      }
    }

    const { data, error } = await supabase
      .from('app_configurations')
      .insert(encryptedData)
      .select()
      .single()

    if (error) {
      console.error('[Config API] Error creating configuration:', error)
      return NextResponse.json(
        { error: 'Failed to create configuration', details: error.message },
        { status: 500 }
      )
    }

    // Return without sensitive data
    if (data) {
      const response: any = { ...(data as AppConfiguration) }
      delete response.encrypted_username
      delete response.encrypted_password
      delete response.encrypted_api_key
      if (password) {
        response.has_password = true
      }
      return NextResponse.json({ data: response }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('[Config API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/configurations
 * Update an existing configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()
    const body = await request.json()

    const {
      id,
      category,
      config_key,
      config_data,
      username,
      password,
      api_key,
      description,
      is_active
    } = body

    // Validate required fields
    if (!id && (!category || !config_key)) {
      return NextResponse.json(
        { error: 'Either id or both category and config_key are required' },
        { status: 400 }
      )
    }

    // Find the configuration
    let query = supabase.from('app_configurations').select('id')

    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('category', category).eq('config_key', config_key)
    }

    const { data: existing, error: findError } = await query.maybeSingle()

    if (findError || !existing) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    const existingConfig = existing as Pick<AppConfiguration, 'id'>

    // Prepare update data
    const updateData: AppConfigurationUpdate = {}

    if (config_data !== undefined) {
      updateData.config_data = config_data
    }
    if (description !== undefined) {
      updateData.description = description
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    // Encrypt and update sensitive fields if provided
    if (username !== undefined) {
      if (username === null || username === '') {
        updateData.encrypted_username = null
      } else {
        const { data: encryptedUsername } = await supabase.rpc(
          'encrypt_config_value',
          { value: username } as any
        )
        if (encryptedUsername) {
          updateData.encrypted_username = encryptedUsername
        }
      }
    }

    if (password !== undefined) {
      if (password === null || password === '') {
        updateData.encrypted_password = null
      } else {
        const { data: encryptedPassword } = await supabase.rpc(
          'encrypt_config_value',
          { value: password } as any
        )
        if (encryptedPassword) {
          updateData.encrypted_password = encryptedPassword
        }
      }
    }

    if (api_key !== undefined) {
      if (api_key === null || api_key === '') {
        updateData.encrypted_api_key = null
      } else {
        const { data: encryptedApiKey } = await supabase.rpc(
          'encrypt_config_value',
          { value: api_key } as any
        )
        if (encryptedApiKey) {
          updateData.encrypted_api_key = encryptedApiKey
        }
      }
    }

    // Type assertion needed due to Supabase type inference limitations
    const { data, error } = await (supabase
      .from('app_configurations') as any)
      .update(updateData)
      .eq('id', existingConfig.id)
      .select()
      .single()

    if (error) {
      console.error('[Config API] Error updating configuration:', error)
      return NextResponse.json(
        { error: 'Failed to update configuration', details: error.message },
        { status: 500 }
      )
    }

    // Return without sensitive data
    if (data) {
      const response: any = { ...(data as AppConfiguration) }
      delete response.encrypted_username
      delete response.encrypted_password
      delete response.encrypted_api_key
      if (password !== undefined && password !== null && password !== '') {
        response.has_password = true
      }
      return NextResponse.json({ data: response })
    }

    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('[Config API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

