import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { sendTempPasswordToClient } from '@/src/lib/utils/temp-password'
import { isAdmin } from '@/src/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/clients/[id]/send-temp-password
 * 
 * Generate a new temporary password for a client and send it via email
 * Requires: Admin authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const userIsAdmin = await isAdmin(true)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const clientId = params.id
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Fetch client information
    const supabase = createServerSupabaseAdminClient()
    const { data: client, error: clientError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, preferred_language')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('Failed to fetch client:', clientError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Type assertion to help TypeScript understand the client type
    const clientData = client as {
      id: string
      email: string | null
      first_name: string | null
      last_name: string | null
      preferred_language: string | null
    }

    // Validate client has required information
    if (!clientData.email) {
      return NextResponse.json(
        { error: 'Client email is required' },
        { status: 400 }
      )
    }

    if (!clientData.first_name || !clientData.last_name) {
      return NextResponse.json(
        { error: 'Client name is incomplete' },
        { status: 400 }
      )
    }

    // Send temporary password
    const result = await sendTempPasswordToClient({
      clientId: clientData.id,
      email: clientData.email,
      firstName: clientData.first_name,
      lastName: clientData.last_name,
      preferredLanguage: (clientData.preferred_language as 'en' | 'fr') || 'en'
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send temporary password' },
        { status: 500 }
      )
    }

    // Return success (don't include password in response for security)
    return NextResponse.json({
      success: true,
      message: 'Temporary password sent successfully',
      // Include password only if email failed (for manual delivery)
      ...(result.error && { warning: result.error })
    })
  } catch (error: any) {
    console.error('Error sending temp password:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

