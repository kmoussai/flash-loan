'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import { useParams } from 'next/navigation'

/**
 * Global auth callback handler component
 * Handles Supabase magic link redirects that include hash fragments
 * Should be included in the root layout to catch auth callbacks on any page
 */
export default function AuthCallbackHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const supabase = createClient()

  useEffect(() => {
    // Only process if we're not already on the callback page
    if (pathname?.includes('/auth/callback')) {
      return
    }

    // Check for hash fragment with auth tokens
    const hash = window.location.hash.substring(1)
    if (!hash) {
      return
    }

    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')
    async function handleAuthHash(accessToken: string, refreshToken: string) {
      try {
        // Set the session using the tokens from hash
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (sessionError) {
          console.error('Auth callback session error:', sessionError)
          // Redirect to sign in on error
          window.location.href = `/${locale}/auth/signin?error=${encodeURIComponent(sessionError.message)}`
          return
        }

        if (data.session && data.user) {
          // Check if password change is required (user came from magic link with requires_password_change)
          const requiresPasswordChange = data.user.user_metadata?.requires_password_change === true
          
          // Clean up the hash from URL
          const newUrl = window.location.pathname + window.location.search
          window.history.replaceState(null, '', newUrl)

          // Check if there's a redirect_to in the URL or default to dashboard documents
          const urlParams = new URLSearchParams(window.location.search)
          let redirectTo =
            urlParams.get('redirect_to') ||
            `/${locale}/client/dashboard?section=documents`

          // If password change is required, redirect to change-password page with magic link flag
          if (requiresPasswordChange) {
            redirectTo = `/${locale}/client/dashboard/change-password?from_magic_link=true`
          }

          // Redirect to the intended destination
          router.push(redirectTo)
          router.refresh()
        }
      } catch (err: any) {
        console.error('Auth callback handler error:', err)
        window.location.href = `/${locale}/auth/signin?error=${encodeURIComponent(err.message || 'Authentication failed')}`
      }
    }

    // Only process magiclink type (ignore other hash params)
    if (type === 'magiclink' && accessToken && refreshToken) {
      handleAuthHash(accessToken, refreshToken)
    }
  }, [pathname, router, locale, supabase])

  // This component doesn't render anything
  return null
}
