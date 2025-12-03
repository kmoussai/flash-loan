import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserType } from '@/src/lib/supabase/db-helpers'
import { getClientDocumentRequests } from '@/src/lib/supabase/loan-helpers'
import type { DocumentRequestStatus } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/client/document-requests
 * Fetch document requests for the authenticated client
 * Security: Only returns requests for the authenticated client's applications
 * Query params:
 *   - status: Optional filter by status (e.g., 'requested' for pending)
 */
export async function GET(request: NextRequest) {
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

    // Get all document requests for this client (already filtered by client_id in helper)
    const allRequests = await getClientDocumentRequests(user.id, true)

    // Optional status filter from query params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') as DocumentRequestStatus | null

    // Filter by status if provided, otherwise return all
    const documentRequests = statusFilter
      ? allRequests.filter(req => req.status === statusFilter)
      : allRequests

    // Calculate pending count (status === 'requested')
    const pendingCount = allRequests.filter(req => req.status === 'requested').length

    return NextResponse.json({ 
      documentRequests,
      pendingCount,
      totalCount: allRequests.length
    })
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

