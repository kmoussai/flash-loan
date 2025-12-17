import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { newPassword, fromMagicLink } = body

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    // Use admin client to update password and metadata
    const adminClient = createServerSupabaseAdminClient()

    // Update password and clear password change requirement
    // When fromMagicLink is true, we're setting a password (not changing), so no need to verify current password
    // Email is already confirmed when account was created, so no need to confirm again
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
        user_metadata: {
          ...user.user_metadata,
          requires_password_change: false // Clear the flag
        }
      }
    )

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: fromMagicLink ? 'Password set successfully' : 'Password changed successfully'
    })

  } catch (error: any) {
    console.error('[POST /api/auth/change-password] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

