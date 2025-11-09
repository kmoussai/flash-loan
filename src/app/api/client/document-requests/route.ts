import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserType } from '@/src/lib/supabase/db-helpers'
import { getClientDocumentRequests } from '@/src/lib/supabase/loan-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    const userType = await getUserType(user.id, true)

    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only' },
        { status: 403 }
      )
    }

    const documentRequests = await getClientDocumentRequests(user.id, true)

    return NextResponse.json({ documentRequests })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error occurred'
    console.error('Error fetching client document requests:', message)
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    )
  }
}

