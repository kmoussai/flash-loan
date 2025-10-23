import { NextRequest, NextResponse } from 'next/server'
import { 
  createClientUser, 
  createStaffMember,
  isAdmin,
  type CreateUserParams,
  type CreateStaffParams 
} from '@/src/lib/supabase/admin-helpers'

/**
 * POST /api/admin/create-user
 * Creates a new client user or staff member
 * Requires admin authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin permission
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { userType, ...params } = body

    // Validate userType
    if (!userType || !['client', 'staff'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid userType. Must be "client" or "staff"' },
        { status: 400 }
      )
    }

    // Create client user
    if (userType === 'client') {
      const createParams: CreateUserParams = {
        email: params.email,
        password: params.password,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        nationalId: params.nationalId,
        preferredLanguage: params.preferredLanguage || 'en',
        autoConfirmEmail: params.autoConfirmEmail ?? true
      }

      const result = await createClientUser(createParams, true)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Client user created successfully',
        user: result.user,
        authUser: {
          id: result.authUser?.id,
          email: result.authUser?.email
        }
      })
    }

    // Create staff member
    if (userType === 'staff') {
      // Validate role
      if (!params.role || !['admin', 'support', 'intern'].includes(params.role)) {
        return NextResponse.json(
          { error: 'Invalid staff role. Must be "admin", "support", or "intern"' },
          { status: 400 }
        )
      }

      const createParams: CreateStaffParams = {
        email: params.email,
        password: params.password,
        role: params.role,
        department: params.department,
        autoConfirmEmail: params.autoConfirmEmail ?? true
      }

      const result = await createStaffMember(createParams, true)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Staff member created successfully',
        staff: result.staff,
        authUser: {
          id: result.authUser?.id,
          email: result.authUser?.email
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

