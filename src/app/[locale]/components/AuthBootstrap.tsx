'use client'

import { useEffect } from 'react'
import { createClient } from '@/src/lib/supabase/client'

/**
 * Runs early to restore a Supabase session from URL hash (magic link) and
 * notifies the app via a custom event when done. Render this in the locale layout.
 */
export default function AuthBootstrap() {
  useEffect(() => {
    const supabase = createClient()

    const restore = async () => {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        if (hash) {
          const params = new URLSearchParams(hash.replace('#', '?'))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')

          if (access_token || refresh_token) {
            await supabase.auth.setSession({
              access_token: access_token || undefined,
              refresh_token: refresh_token || undefined
            } as any)
            // Clean the URL (remove tokens)
            const cleanUrl = window.location.pathname + window.location.search
            window.history.replaceState({}, document.title, cleanUrl)
          }
        }
      } finally {
        try {
          window.dispatchEvent(new CustomEvent('supabase:session-restored'))
        } catch {}
      }
    }

    restore()
  }, [])

  return null
}


