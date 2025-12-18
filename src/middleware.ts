import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { locales } from './i18n'
import { localePrefix } from './navigation-config'
import { updateSession } from '@/src/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { checkAdminAccess, checkStaffAccess } from '@/src/lib/supabase/api-auth'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix
})

async function checkUserType(req: NextRequest, userId: string): Promise<'client' | 'staff' | null> {
  // Create a Supabase client using the same approach as updateSession
  let response = NextResponse.next({
    request: {
      headers: req.headers
    }
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string) {
          req.cookies.set({
            name,
            value
          })
        },
        remove(name: string) {
          req.cookies.set({
            name,
            value: ''
          })
        }
      }
    }
  )

  // Check if user exists in staff table
  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('id', userId)
    .single()

  if (staffData) return 'staff'

  // Check if user exists in users table
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (userData) return 'client'

  return null
}

const publicApiRoutes = [
  '/api/loan-application',
  '/api/public',
  '/api/auth',
  '/api/webhook'
]

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Handle admin API routes - require admin authentication
  if (pathname.startsWith('/api/admin')) {
    // Check admin access
    const authError = await checkAdminAccess(req)
    if (authError) {
      return authError
    }
    // Allow the request to proceed
    return NextResponse.next()
  }

  // Handle all other API routes - require authentication
  // Exceptions: /api/loan-application, /api/public routes, /api/auth routes, and webhook routes
  if (pathname.startsWith('/api/')) {
    // Allow loan application route without auth (public submission)
    if (pathname === '/api/loan-application') {
      return NextResponse.next()
    }
    
    // Allow public routes without auth
    if (pathname.startsWith('/api/public/')) {
      return NextResponse.next()
    }

    // Allow auth routes without auth (signin, signup, authenticate, etc.)
    if (pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    // Allow inverite routes without auth (bank verification callbacks and webhooks)
    if (pathname.startsWith('/api/inverite/')) {
      return NextResponse.next()
    }

    // Allow zumrails routes without auth (bank verification callbacks, webhooks, and updates)
    if (pathname.startsWith('/api/zumrails/')) {
      return NextResponse.next()
    }

    // Allow ibv routes without auth (bank verification initialization from email links)
    if (pathname.startsWith('/api/ibv/')) {
      return NextResponse.next()
    }

    // Allow webhook routes without auth (called by external services)
    if (pathname.includes('/webhook')) {
      return NextResponse.next()
    }

    // Require authentication for all other API routes
    const { response, user } = await updateSession(req)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    return response
  }

  // Handle admin page routes - NO localization
  if (pathname.startsWith('/admin')) {
    const { response, user } = await updateSession(req)

    // Allow access to login page without authentication
    if (pathname === '/admin/login') {
      // If already logged in, check if they're staff
      if (user) {
        const userType = await checkUserType(req, user.id)
        if (userType === 'staff') {
          return NextResponse.redirect(new URL('/admin/dashboard', req.url))
        } else if (userType === 'client') {
          // Clients should be redirected to their dashboard
          // Try to get locale from cookie or default to 'en'
          const locale = req.cookies.get('NEXT_LOCALE')?.value || 'en'
          return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url))
        }
      }
      return response
    }

    // Protect all other admin routes
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    // Check if user is staff - only staff can access admin routes
    const userType = await checkUserType(req, user.id)
    if (userType !== 'staff') {
      // Client or unknown user type - redirect to appropriate location
      if (userType === 'client') {
        // Get locale from cookies or default
        const locale = req.cookies.get('NEXT_LOCALE')?.value || 'en'
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url))
      }
      // Unknown user type or not found - redirect to login
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    return response
  }

  // Handle localized routes (existing behavior)
  return intlMiddleware(req)
}

export const config = {
  matcher: [
    '/',
    '/(fr|en)/:path*',
    '/admin/:path*',
    '/api/:path*'
  ]
}
