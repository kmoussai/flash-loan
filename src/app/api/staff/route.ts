import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { 
  getAllStaffMembers, 
  createStaffMember,
  isAdmin,
  type StaffRole 
} from '@/src/lib/supabase'

/**
 * GET /api/staff
 * Get all staff members
 * Permissions: Admin can see all, Support can see all, Intern can see own
 */
export async function GET() {
  try {
    // Use RLS-aware client (respects permissions)
    const result = await getAllStaffMembers(true)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    return NextResponse.json(result.staff)
  } catch (error: any) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff
 * Create a new staff member
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
        { error: 'Forbidden: Admin access required' },
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
    
    // Validate role
    if (body.role && !['admin', 'support', 'intern'].includes(body.role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, support, or intern' },
        { status: 400 }
      )
    }
    
    // Use the permission-aware helper function
    const result = await createStaffMember({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      role: (body.role || 'intern') as StaffRole,
      department: body.department,
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
      staff: result.staff,
      message: 'Staff member created successfully'
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('[POST /api/staff] Error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

