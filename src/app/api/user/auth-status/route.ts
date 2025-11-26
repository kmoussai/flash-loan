import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/auth-status
 * Returns the authentication status and user type (client/staff) for the current user
 * This endpoint is used by client components to check auth without making direct DB queries
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        isClient: false,
        userId: null
      })
    }

    // Check if user is staff first
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (staffData) {
      // User is staff, not a client
      return NextResponse.json({
        authenticated: true,
        isClient: false,
        userId: user.id,
        userType: 'staff'
      })
    }

    // Check if user exists in users table (client)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({
      authenticated: true,
      isClient: !!userData,
      userId: user.id,
      userType: userData ? 'client' : null
    })
  } catch (error: any) {
    console.error('[GET /api/user/auth-status] Error:', error)
    return NextResponse.json(
      {
        authenticated: false,
        isClient: false,
        userId: null,
        error: 'Failed to check authentication status'
      },
      { status: 500 }
    )
  }
}
