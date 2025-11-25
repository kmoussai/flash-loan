import { NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/rejection-reasons
 * Returns the standardized list of active rejection reasons for loan applications.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseAdminClient()

    const { data, error } = await supabase
      .from('rejection_reasons')
      .select('id, code, label, description, category, is_active')
      .eq('is_active', true)
      .order('label', { ascending: true })

    if (error) {
      console.error('[GET /api/admin/rejection-reasons] Error fetching reasons:', error)
      return NextResponse.json(
        { error: 'Failed to fetch rejection reasons' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      reasons: data ?? []
    })
  } catch (error: any) {
    console.error('[GET /api/admin/rejection-reasons] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


