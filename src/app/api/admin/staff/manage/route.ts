import { NextRequest, NextResponse } from 'next/server'
import { 
  updateStaffMemberRole, 
  deleteStaffMember,
  promoteUserToStaff,
  getAllStaffMembers,
  isAdmin,
  type StaffRole
} from '@/src/lib/supabase'

/**
 * GET /api/admin/staff/manage
 * Get all staff members
 */
export async function GET(req: NextRequest) {
  try {
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const result = await getAllStaffMembers(true)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: result.staff
    })

  } catch (error: any) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/staff/manage
 * Update staff member role
 */
export async function PATCH(req: NextRequest) {
  try {
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { staffId, role } = body

    if (!staffId || !role) {
      return NextResponse.json(
        { error: 'staffId and role are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'support', 'intern'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const result = await updateStaffMemberRole(staffId, role as StaffRole, true)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Staff role updated successfully',
      staff: result.data
    })

  } catch (error: any) {
    console.error('Error updating staff role:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/staff/manage
 * Delete staff member
 */
export async function DELETE(req: NextRequest) {
  try {
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const staffId = searchParams.get('staffId')

    if (!staffId) {
      return NextResponse.json(
        { error: 'staffId is required' },
        { status: 400 }
      )
    }

    const result = await deleteStaffMember(staffId, true)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/staff/manage
 * Promote existing user to staff
 */
export async function POST(req: NextRequest) {
  try {
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { userId, role, department } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'support', 'intern'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const result = await promoteUserToStaff(
      userId, 
      role as StaffRole, 
      department,
      true
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User promoted to staff successfully',
      staff: result.data
    })

  } catch (error: any) {
    console.error('Error promoting user to staff:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

