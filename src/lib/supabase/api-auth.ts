/**
 * API Route Authentication Helpers
 * 
 * Reusable functions for protecting API routes with authentication and authorization
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServerSupabaseClient } from './server'
import { isAdmin, isStaff, getStaffRole } from './admin-helpers'
import type { StaffRole } from './types'

export interface AuthResult {
  authorized: boolean
  user?: { id: string; email?: string } | null
  staffRole?: StaffRole | null
  error?: string
  statusCode?: number
}

/**
 * Check if the request is authenticated (any user)
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        authorized: false,
        error: 'Unauthorized: Please sign in',
        statusCode: 401
      }
    }

    return {
      authorized: true,
      user: { id: user.id, email: user.email }
    }
  } catch (error: any) {
    return {
      authorized: false,
      error: 'Authentication error',
      statusCode: 500
    }
  }
}

/**
 * Check if the request is from an authenticated staff member (any role)
 */
export async function requireStaff(): Promise<AuthResult> {
  const authResult = await requireAuth()
  
  if (!authResult.authorized) {
    return authResult
  }

  const isUserStaff = await isStaff(true)
  if (!isUserStaff) {
    return {
      authorized: false,
      error: 'Forbidden: Staff access required',
      statusCode: 403
    }
  }

  const staffRole = await getStaffRole(true)

  return {
    authorized: true,
    user: authResult.user,
    staffRole
  }
}

/**
 * Check if the request is from an authenticated admin
 */
export async function requireAdmin(): Promise<AuthResult> {
  const authResult = await requireAuth()
  
  if (!authResult.authorized) {
    return authResult
  }

  const isUserAdmin = await isAdmin(true)
  if (!isUserAdmin) {
    return {
      authorized: false,
      error: 'Forbidden: Admin access required',
      statusCode: 403
    }
  }

  return {
    authorized: true,
    user: authResult.user,
    staffRole: 'admin' as StaffRole
  }
}

/**
 * Helper to create an error response from AuthResult
 */
export function createAuthErrorResponse(authResult: AuthResult): NextResponse {
  return NextResponse.json(
    { error: authResult.error || 'Unauthorized' },
    { status: authResult.statusCode || 401 }
  )
}

/**
 * Create a Supabase client from middleware request (for use in middleware context)
 */
function createMiddlewareSupabaseClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string) {
          // In middleware, we don't modify cookies directly
          // The response will be handled by the middleware
        },
        remove(name: string) {
          // In middleware, we don't modify cookies directly
        }
      }
    }
  )
}

/**
 * Check if user is admin in middleware context
 */
async function checkAdminInMiddleware(request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = createMiddlewareSupabaseClient(request)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        authorized: false,
        error: 'Unauthorized: Please sign in',
        statusCode: 401
      }
    }

    // Check if user is admin by querying staff table
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', user.id)
      .single()

    if (staffError || !staffData || (staffData as any).role !== 'admin') {
      return {
        authorized: false,
        error: 'Forbidden: Admin access required',
        statusCode: 403
      }
    }

    return {
      authorized: true,
      user: { id: user.id, email: user.email },
      staffRole: 'admin' as StaffRole
    }
  } catch (error: any) {
    return {
      authorized: false,
      error: 'Authentication error',
      statusCode: 500
    }
  }
}

/**
 * Middleware helper to check admin access for API routes
 * Returns null if authorized, or a NextResponse error if not
 * 
 * NOTE: This function is designed for use in Next.js middleware only.
 * For API route handlers, use requireAdmin() instead.
 */
export async function checkAdminAccess(request: NextRequest): Promise<NextResponse | null> {
  const authResult = await checkAdminInMiddleware(request)
  
  if (!authResult.authorized) {
    return createAuthErrorResponse(authResult)
  }

  return null
}

/**
 * Middleware helper to check staff access for API routes
 * Returns null if authorized, or a NextResponse error if not
 * 
 * NOTE: This function is designed for use in Next.js middleware only.
 * For API route handlers, use requireStaff() instead.
 */
export async function checkStaffAccess(request: NextRequest): Promise<NextResponse | null> {
  try {
    const supabase = createMiddlewareSupabaseClient(request)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return createAuthErrorResponse({
        authorized: false,
        error: 'Unauthorized: Please sign in',
        statusCode: 401
      })
    }

    // const isStaff = user.user

    // Check if user is staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', user.id)
      .single()

    if (staffError || !staffData) {
      return createAuthErrorResponse({
        authorized: false,
        error: 'Forbidden: Staff access required',
        statusCode: 403
      })
    }

    return null
  } catch (error: any) {
    return createAuthErrorResponse({
      authorized: false,
      error: 'Authentication error',
      statusCode: 500
    })
  }
}

