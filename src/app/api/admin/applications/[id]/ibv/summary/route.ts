import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

// Force dynamic rendering - prevent caching of IBV results
export const dynamic = 'force-dynamic'

// GET /api/admin/applications/[id]/ibv/summary
// Returns IBV summary (ibv_results) directly from the database
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // Fetch ibv_results and provider_data (for holder info) directly from database
    const { data: app, error } = await (supabase as any)
      .from('loan_applications')
      .select('id, ibv_provider, ibv_status, ibv_verified_at, ibv_results, ibv_provider_data, client_id')
      .eq('id', applicationId)
      .single()

    if (error || !app) {
      return NextResponse.json(
        { error: 'APPLICATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    const a = app as any

    // Extract holder information from ZumRails provider_data
    let holderInfo = null
    if (a.ibv_provider === 'zumrails' && a.ibv_provider_data) {
      const providerData = a.ibv_provider_data as any
      // Holder is in account_info.Card.Holder
      const card = providerData?.account_info?.Card || providerData?.account_info?.result?.Card
      if (card?.Holder) {
        holderInfo = card.Holder
      }
    }

    // Fetch user information for name comparison
    let userInfo = null
    if (a.client_id) {
      const { data: user } = await (supabase as any)
        .from('users')
        .select('first_name, last_name')
        .eq('id', a.client_id)
        .single()
      
      if (user) {
        userInfo = {
          first_name: user.first_name,
          last_name: user.last_name
        }
      }
    }

    return NextResponse.json(
      {
        application_id: a.id,
        ibv_provider: a.ibv_provider || null,
        ibv_status: a.ibv_status || null,
        ibv_verified_at: a.ibv_verified_at || null,
        ibv_results: a.ibv_results || null,
        holder_info: holderInfo,
        user_info: userInfo
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
