import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { 
  getAllUsersWithPagination,
  createClientUser,
  isAdmin
} from '@/src/lib/supabase'

/**
 * GET /api/clients
 * Get all client users
 * Permissions: All staff can view (Admin, Support, Intern)
 */
export async function GET(request: Request) {
  try {
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    
    // Use RLS-aware client (respects permissions)
    const result = await getAllUsersWithPagination(page, limit, true)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      users: result.users,
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients
 * Create a new client user
 * Permissions: Admin only
 * Uses proper permission checks before accessing service role
 */
export async function POST(request: Request) {
  try {
    // Verify the current user is authenticated and is an admin
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }
    
    // Check if user is admin using RLS-aware check
    const userIsAdmin = await isAdmin(true)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required to create users' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { 
          error: 'Email and password are required',
          details: { email: !!body.email, password: !!body.password }
        },
        { status: 400 }
      )
    }
    
    // Use the permission-aware helper function
    const result = await createClientUser({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      nationalId: body.nationalId,
      preferredLanguage: body.preferredLanguage || 'en',
      autoConfirmEmail: true
    }, true)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'Client user created successfully'
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('[POST /api/clients] Error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

