import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserProfile } from '@/src/lib/supabase/db-helpers'
import { getCurrentAddress } from '@/src/lib/supabase/loan-helpers'
import { getUserType } from '@/src/lib/supabase/db-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/profile
 * Returns the current user's profile data including current address
 * Used for prefilling forms when user is authenticated
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    // Check if user is a client (not staff)
    const userType = await getUserType(user.id, true)
    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only' },
        { status: 403 }
      )
    }

    // Fetch user profile
    const userProfile = await getUserProfile(user.id, true)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Fetch current address if available
    // Try to get current address (checks is_current flag)
    const currentAddress = await getCurrentAddress(user.id, true)

    return NextResponse.json({
      user: userProfile,
      address: currentAddress
    })
  } catch (error: any) {
    console.error('[GET /api/user/profile] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

