import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/admin/applications/[id]/transactions
// Returns flattened Inverite transactions for the given application id.
// Uses PostgreSQL function to extract transactions directly from JSONB without loading entire object.
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

    // Check if application exists and has IBV provider
    const supabase = createServerSupabaseAdminClient()
    const { data: appCheck, error: checkError } = await supabase
      .from('loan_applications')
      .select('ibv_provider')
      .eq('id', applicationId)
      .single()

    if (checkError || !appCheck) {
      console.error('[Transactions API] Error checking application:', checkError)
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const appCheckData = appCheck as any
    // Support both Inverite and Zumrails providers
    if (!['inverite', 'zumrails'].includes(appCheckData?.ibv_provider)) {
      return NextResponse.json({ transactions: [], count: 0 })
    }

    // Get limit from query params if provided
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.max(0, parseInt(limitParam, 10)) : null

    // Call PostgreSQL function to extract transactions directly from JSONB
    // This avoids loading the entire ibv_provider_data object into memory
    const { data: transactions, error: rpcError } = await (supabase as any).rpc('get_ibv_transactions', {
      p_application_id: applicationId,
      p_limit: limit
    })

    if (rpcError) {
      console.error('[Transactions API] Error calling get_ibv_transactions:', rpcError)
      return NextResponse.json(
        { error: 'Failed to extract transactions from database' },
        { status: 500 }
      )
    }

    // Transform the results to match expected format
    // The function returns some fields as JSONB that need to be parsed
    const transactionsArray = Array.isArray(transactions) ? transactions : []
    console.log('[Transactions API] Transactions:', transactionsArray.length)

    const transformedTransactions = transactionsArray.map((tx: any) => ({
      description: tx.description || 'No description',
      date: tx.date || '',
      credit: tx.credit !== null && tx.credit !== undefined ? Number(tx.credit) : null,
      debit: tx.debit !== null && tx.debit !== undefined ? Number(tx.debit) : null,
      balance: tx.balance !== null && tx.balance !== undefined ? Number(tx.balance) : null,
      category: tx.category || null,
      flags: Array.isArray(tx.flags) ? tx.flags : (tx.flags ? [tx.flags] : []),
      account_index: tx.account_index || 0,
      account_type: tx.account_type || null,
      account_description: tx.account_description || null,
      account_number: tx.account_number || null,
      institution: tx.institution || null
    }))

    // Sort by date (newest first) - PostgreSQL function doesn't sort
    const sorted = transformedTransactions.sort((a: any, b: any) => {
      try {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        if (isNaN(dateA) || isNaN(dateB)) return 0
        return dateB - dateA
      } catch {
        return 0
      }
    })

    // Apply limit if provided (as backup, though PostgreSQL function could do this too)
    const result = typeof limit === 'number' && limit > 0 ? sorted.slice(0, limit) : sorted

    return NextResponse.json({
      transactions: result,
      count: result.length
    })
  } catch (error: any) {
    console.error('[Transactions API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


