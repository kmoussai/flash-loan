import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { locales } from './i18n'
import { localePrefix } from './navigation'
import { updateSession } from '@/src/lib/supabase/middleware'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix
})

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Handle admin routes - NO localization
  if (pathname.startsWith('/admin')) {
    const { response, user } = await updateSession(req)

    // Allow access to login page without authentication
    if (pathname === '/admin/login') {
      // If already logged in, redirect to dashboard
      if (user) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }
      return response
    }

    // Protect all other admin routes
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    return response
  }

  // Handle localized routes (existing behavior)
  return intlMiddleware(req)
}

export const config = {
  matcher: ['/', '/(fr|en)/:path*', '/admin/:path*']
}
