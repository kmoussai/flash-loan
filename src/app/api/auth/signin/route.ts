import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create server Supabase client
    const supabase = await createServerSupabaseClient()

    // Sign in with password
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      return NextResponse.json(
        { error: signInError.message },
        { status: 401 }
      )
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // Check if user is staff/admin
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('id', data.user.id)
      .single()

    if (staffData) {
      // Staff/admin users should use admin login
      // Sign them out
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'This account is for staff/admin use. Please use the admin login.' },
        { status: 403 }
      )
    }

    // Check if they're a client
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single()

    if (!userData) {
      // Sign them out if not a client
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'This account is not registered as a client.' },
        { status: 403 }
      )
    }

    // Check if password change is required
    const requiresPasswordChange = data.user.user_metadata?.requires_password_change === true

    // Success - session is automatically set via cookies
    return NextResponse.json({
      success: true,
      requiresPasswordChange,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    })

  } catch (error: any) {
    console.error('[POST /api/auth/signin] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Check if user is already authenticated
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // Check if user is a client (not staff)
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('id', user.id)
      .single()

    if (staffData) {
      return NextResponse.json(
        { authenticated: false, reason: 'staff_account' },
        { status: 200 }
      )
    }

    // Check if they're a client
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userData) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email
        }
      })
    }

    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('[GET /api/auth/signin] Error:', error.message)
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    )
  }
}

