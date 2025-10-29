import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserProfile, getUserType } from '@/src/lib/supabase/db-helpers'
import { getClientLoanApplications } from '@/src/lib/supabase/loan-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/client/dashboard
 * Fetch client dashboard data: user profile and loan applications
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

    // Fetch loan applications for this client
    const loanApplications = await getClientLoanApplications(user.id, true)

    return NextResponse.json({
      user: userProfile,
      loanApplications
    })
  } catch (error: any) {
    console.error('Error fetching client dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/client/dashboard
 * Update client profile
 */
export async function PUT(request: NextRequest) {
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

    // Check if user is a client
    const userType = await getUserType(user.id, true)
    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { updateUserProfile } = await import('@/src/lib/supabase/db-helpers')
    
    // Update user profile
    const result = await updateUserProfile(user.id, body, true)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update profile' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.data
    })
  } catch (error: any) {
    console.error('Error updating client profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

