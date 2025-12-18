import { NextRequest, NextResponse } from 'next/server'
import { getZumRailsConfig } from '@/src/lib/supabase/config-helpers'
import { isAdmin } from '@/src/lib/supabase/admin-helpers'

/**
 * GET /api/admin/configurations/test
 * Test the ZumRails configuration by calling getZumRailsConfig()
 * Returns the configuration with sensitive fields masked
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin permission
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    // Get the configuration
    const config = await getZumRailsConfig()

    // Mask sensitive fields for display
    const maskedConfig = {
      ...config,
      password: config.password ? '***' + config.password.slice(-2) : undefined,
      apiKey: config.apiKey ? '***' + config.apiKey.slice(-2) : undefined
    }

    return NextResponse.json({
      success: true,
      config: maskedConfig,
      source: config.username || config.password 
        ? 'database' 
        : 'environment_variables',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Config Test] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve configuration',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

