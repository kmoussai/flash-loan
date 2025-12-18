import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { verifyAuthToken } from '@/src/lib/security/token'

/**
 * Server-side authentication route for reusable links
 * Validates signed token and creates a session for the client
 * This allows links to be reused until they expire
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const token = requestUrl.searchParams.get('token')
    const redirectTo = requestUrl.searchParams.get('redirect_to') || '/en/client/dashboard?section=documents'
    
    // Extract locale from redirect_to or default to 'en'
    const localeMatch = redirectTo.match(/\/(en|fr)\//)
    const locale = localeMatch ? localeMatch[1] : 'en'

    if (!token) {
      return NextResponse.redirect(
        new URL(`/${locale}/auth/signin?error=${encodeURIComponent('Missing authentication token')}`, requestUrl.origin)
      )
    }

    // Verify the token
    const tokenData = verifyAuthToken(token)
    if (!tokenData.valid || !tokenData.clientId) {
      return NextResponse.redirect(
        new URL(`/${locale}/auth/signin?error=${encodeURIComponent('Invalid or expired authentication token')}`, requestUrl.origin)
      )
    }

    const clientId = tokenData.clientId

    // Get client email from auth API (more reliable than querying users table)
    const adminClient = createServerSupabaseAdminClient()
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(clientId)

    if (authError || !authUser?.user?.email) {
      console.error('[Auth Authenticate] User not found:', authError)
      return NextResponse.redirect(
        new URL(`/${locale}/auth/signin?error=${encodeURIComponent('User not found')}`, requestUrl.origin)
      )
    }

    const userEmail = authUser.user.email

    // Generate a magic link for the user (reusable - generates new link each time)
    // This allows the link to be reused until the token expires
    const magicLinkUrl = `${requestUrl.origin}/${locale}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`
    
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: magicLinkUrl
      }
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Auth Authenticate] Failed to generate magic link:', linkError)
      return NextResponse.redirect(
        new URL(`/${locale}/auth/signin?error=${encodeURIComponent('Failed to generate authentication link')}`, requestUrl.origin)
      )
    }

    // Extract the token from the magic link URL
    const magicLink = linkData.properties.action_link
    const magicLinkUrlObj = new URL(magicLink)
    const magicLinkToken = magicLinkUrlObj.searchParams.get('token')
    
    if (!magicLinkToken) {
      console.error('[Auth Authenticate] No token in magic link')
      return NextResponse.redirect(
        new URL(`/${locale}/auth/signin?error=${encodeURIComponent('Invalid magic link')}`, requestUrl.origin)
      )
    }

    // Redirect to Supabase's verify endpoint which will handle the authentication
    // and redirect back to our callback with the session tokens
    const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(magicLinkToken)}&type=magiclink&redirect_to=${encodeURIComponent(magicLinkUrl)}`
    
    return NextResponse.redirect(verifyUrl)
  } catch (error: any) {
    console.error('[Auth Authenticate] Exception:', error)
    const requestUrl = new URL(request.url)
    const locale = 'en' // fallback
    return NextResponse.redirect(
      new URL(`/${locale}/auth/signin?error=${encodeURIComponent(error.message || 'Authentication failed')}`, requestUrl.origin)
    )
  }
}

