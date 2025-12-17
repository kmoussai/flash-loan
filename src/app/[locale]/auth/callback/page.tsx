'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'

/**
 * Client-side auth callback handler for Supabase magic links
 * Handles hash fragments (#access_token=...) and shows loading state during processing
 */
export default function AuthCallbackPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        // Extract hash fragment from URL (Supabase puts tokens here)
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const errorParam = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        // Check for errors first
        if (errorParam) {
          setError(errorDescription || errorParam)
          setLoading(false)
          return
        }

        // If we have tokens in the hash, set the session
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            setError(sessionError.message)
            setLoading(false)
            return
          }

          if (data.session && data.user) {
            // Check if password change is required (user came from magic link with requires_password_change)
            const requiresPasswordChange = data.user.user_metadata?.requires_password_change === true
            
            // Get the redirect_to from search params (should be full URL now)
            let redirectTo = searchParams.get('redirect_to') || `${window.location.origin}/${locale}/client/dashboard?section=documents`
            
            // If redirect_to is a relative path, convert it to full URL
            if (redirectTo.startsWith('/')) {
              redirectTo = `${window.location.origin}${redirectTo}`
            }
            
            // If password change is required, redirect to change-password page with magic link flag
            if (requiresPasswordChange) {
              redirectTo = `${window.location.origin}/${locale}/client/dashboard/change-password?from_magic_link=true`
            }
            
            console.log('[Auth Callback] Redirecting user after token verification:', {
              userId: data.user.id,
              requiresPasswordChange,
              redirectTo,
              currentOrigin: window.location.origin,
              redirectToIsFullUrl: redirectTo.startsWith('http')
            })
            
            // Clean up the hash from URL before redirecting
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            
            // If redirectTo is a full URL, use window.location, otherwise use router.push
            if (redirectTo.startsWith('http')) {
              window.location.href = redirectTo
            } else {
              router.push(redirectTo)
              router.refresh()
            }
            return
          }
        }

        // If no tokens in hash, check if user is already authenticated
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Already authenticated, redirect to dashboard
          const redirectTo = searchParams.get('redirect_to') || `/${locale}/client/dashboard?section=documents`
          router.push(redirectTo)
          return
        }

        // No tokens and not authenticated - redirect to sign in
        setError('Authentication failed. Please try signing in again.')
        setTimeout(() => {
          router.push(`/${locale}/auth/signin`)
        }, 2000)
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message || 'An error occurred during authentication')
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, locale, supabase, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-text-secondary">Completing sign in...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-primary mb-2">Authentication Error</h1>
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={() => router.push(`/${locale}/auth/signin`)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return null
}

