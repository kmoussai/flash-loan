import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserType } from '@/src/lib/supabase/db-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/client/stats
 * Fetch client statistics: loan count, application count, and next payment date
 * Security: Only returns stats for the authenticated client (enforced by RLS)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
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

    // Check if user is a client
    const userType = await getUserType(user.id, true)
    if (userType !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden: Client access only' },
        { status: 403 }
      )
    }

    // Fetch stats in parallel for better performance
    const [loansResult, applicationsResult, nextPaymentResult] = await Promise.all([
      // Count loans (RLS ensures only client's loans are returned)
      supabase
        .from('loans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Count loan applications (RLS ensures only client's applications are returned)
      supabase
        .from('loan_applications')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', user.id),

      // Get next payment date from payment schedule
      // RLS policy ensures only client's payment schedules are returned
      supabase
        .from('loan_payment_schedule')
        .select('scheduled_date')
        .in('status', ['pending', 'scheduled', 'authorized'])
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle()
    ])

    // Extract counts
    const loanCount = loansResult.count ?? 0
    const applicationCount = applicationsResult.count ?? 0

    // Extract next payment date (if available)
    let nextPaymentDate: string | null = null
    if (nextPaymentResult.data && !nextPaymentResult.error) {
      nextPaymentDate = (nextPaymentResult.data as any).scheduled_date ?? null
    }

    return NextResponse.json({
      loanCount,
      applicationCount,
      nextPaymentDate
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error occurred'
    console.error('Error fetching client stats:', message)
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    )
  }
}

