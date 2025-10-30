import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

// GET /api/admin/applications/[id]/ibv
// Returns lightweight IBV data for the IBV card: ibv_results, provider info, and request_guid
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id
    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseAdminClient()

    // Select minimal fields used by the IBV card
    const { data, error } = await supabase
      .from('loan_applications')
      .select('id, ibv_provider, ibv_status, ibv_results, ibv_verified_at')
      .eq('id', applicationId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Failed to fetch IBV data for application' },
        { status: 500 }
      )
    }

    // Derive request_guid from ibv_results if present (populated by fetch endpoint)
    const requestGuid = (data as any).ibv_results?.request_guid || null

    return NextResponse.json({
      application_id: (data as any).id,
      ibv_provider: (data as any).ibv_provider,
      ibv_status: (data as any).ibv_status,
      ibv_verified_at: (data as any).ibv_verified_at,
      request_guid: requestGuid,
      ibv_results: (data as any).ibv_results || null
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal error' },
      { status: 500 }
    )
  }
}


