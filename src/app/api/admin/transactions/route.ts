import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { isAdmin } from '@/src/lib/supabase/admin-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/transactions
 * Get all payment transactions with filtering and pagination
 * Admin/Staff only
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseAdminClient()
    const { searchParams } = new URL(request.url)

    // Query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const provider = searchParams.get('provider') // 'zumrails', 'accept_pay', etc.
    const transactionType = searchParams.get('transaction_type') // 'disbursement', 'collection'
    const status = searchParams.get('status') // Normalized status
    const search = searchParams.get('search') // Search in transaction IDs, loan numbers, etc.

    // Build query
    let query = supabase.from('payment_transactions').select(
      `
        *,
        loans:loan_id (
          id,
          loan_number,
          principal_amount,
          status,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        ),
        loan_payments:loan_payment_id (
          id,
          payment_number,
          amount,
          payment_date,
          status
        )
      `,
      { count: 'exact' }
    )

    // Apply filters
    if (provider) {
      query = query.eq('provider', provider)
    }
    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }
    if (status) {
      query = query.eq('status', status)
    } else {
      // By default, exclude cancelled transactions unless explicitly requested
      query = query.neq('status', 'cancelled')
    }

    // Search filter (searches in provider_data JSONB and loan numbers)
    if (search) {
      // Note: JSONB text search requires different syntax
      // We'll filter after fetching or use a more complex query
      // For now, we'll do client-side filtering for search
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false })

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('Error fetching payment transactions:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch payment transactions',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Calculate status counts
    const statusCounts = {
      initiated: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      reversed: 0
    }

    // Count by provider
    const providerCounts: Record<string, number> = {}

    // Count by transaction type
    const typeCounts = {
      disbursement: 0,
      collection: 0
    }

    // Process transactions and calculate counts
    let processedTransactions = (transactions || []).map((tx: any) => {
      // Status counts
      const txStatus = tx.status || 'pending'
      if (txStatus in statusCounts) {
        statusCounts[txStatus as keyof typeof statusCounts]++
      }

      // Provider counts
      const txProvider = tx.provider || 'unknown'
      providerCounts[txProvider] = (providerCounts[txProvider] || 0) + 1

      // Type counts
      if (tx.transaction_type === 'disbursement') {
        typeCounts.disbursement++
      } else if (tx.transaction_type === 'collection') {
        typeCounts.collection++
      }

      // Extract provider-specific data from JSONB
      const providerData = tx.provider_data || {}
      const zumRailsStatus =
        providerData.transaction_status || providerData.provider_status
      const transactionId =
        providerData.transaction_id || providerData.provider_transaction_id
      const clientTransactionId = providerData.client_transaction_id

      // Format borrower info
      const borrower = tx.loans?.users
      const borrowerName = borrower
        ? `${borrower.first_name || ''} ${borrower.last_name || ''}`.trim() ||
          'N/A'
        : 'N/A'

      return {
        ...tx,
        // Provider-specific extracted fields
        provider_transaction_id: transactionId,
        provider_client_transaction_id: clientTransactionId,
        provider_status: zumRailsStatus || tx.status,
        // Borrower info
        borrower_name: borrowerName,
        borrower_email: borrower?.email || null,
        borrower_phone: borrower?.phone || null,
        // Loan info
        loan_number: tx.loans?.loan_number || null,
        loan_status: tx.loans?.status || null,
        // Payment info
        payment_number: tx.loan_payments?.payment_number || null,
        payment_date: tx.loan_payments?.payment_date || null,
        payment_status: tx.loan_payments?.status || null
      }
    })

    // Apply search filter if provided (client-side filtering)
    if (search) {
      const searchLower = search.toLowerCase()
      processedTransactions = processedTransactions.filter((tx: any) => {
        return (
          tx.provider_transaction_id?.toLowerCase().includes(searchLower) ||
          tx.provider_client_transaction_id
            ?.toLowerCase()
            .includes(searchLower) ||
          tx.loan_number?.toString().includes(searchLower) ||
          tx.borrower_name?.toLowerCase().includes(searchLower) ||
          tx.borrower_email?.toLowerCase().includes(searchLower) ||
          tx.id?.toLowerCase().includes(searchLower)
        )
      })
    }

    return NextResponse.json({
      success: true,
      transactions: processedTransactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      counts: {
        status: statusCounts,
        provider: providerCounts,
        type: typeCounts
      }
    })
  } catch (error: any) {
    console.error('Error in transactions API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
