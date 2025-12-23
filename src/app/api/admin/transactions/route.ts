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
    const search = searchParams.get('search')?.trim() // Search in user name only

    // If search is provided, find matching user IDs first
    let matchingLoanIds: string[] | null = null
    if (search) {
      // Search for users by first_name or last_name (case-insensitive)
      const searchPattern = `%${search}%`
      const { data: matchingUsers, error: userSearchError } = await supabase
        .from('users')
        .select('id')
        .or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`)

      if (userSearchError) {
        console.error('Error searching users:', userSearchError)
        return NextResponse.json(
          {
            error: 'Failed to search users',
            details: userSearchError.message
          },
          { status: 500 }
        )
      }

      if (matchingUsers && matchingUsers.length > 0) {
        const userIds = matchingUsers.map((u: any) => u.id)
        
        // Get loan IDs for these users
        const { data: matchingLoans, error: loanSearchError } = await supabase
          .from('loans')
          .select('id')
          .in('user_id', userIds)

        if (loanSearchError) {
          console.error('Error searching loans:', loanSearchError)
          return NextResponse.json(
            {
              error: 'Failed to search loans',
              details: loanSearchError.message
            },
            { status: 500 }
          )
        }

        if (matchingLoans && matchingLoans.length > 0) {
          matchingLoanIds = matchingLoans.map((l: any) => l.id)
        } else {
          // No matching loans found, return empty result
          matchingLoanIds = []
        }
      } else {
        // No matching users found, return empty result
        matchingLoanIds = []
      }
    }

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

    // Apply search filter at database level
    if (matchingLoanIds !== null) {
      if (matchingLoanIds.length === 0) {
        // No matching loans, return empty result early
        return NextResponse.json({
          success: true,
          transactions: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          },
          counts: {
            status: {
              initiated: 0,
              pending: 0,
              processing: 0,
              completed: 0,
              failed: 0,
              cancelled: 0,
              reversed: 0
            },
            provider: {},
            type: {
              disbursement: 0,
              collection: 0
            }
          }
        })
      }
      query = query.in('loan_id', matchingLoanIds)
    }

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

    // Order by created_at descending (newest first) for initial query
    // We'll re-sort by payment_date after processing
    query = query.order('created_at', { ascending: false })

    // Fetch all matching transactions (we'll sort and paginate after)
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

      // Extract ZumRails transaction ID from provider_data
      const providerData = tx.provider_data || {}
      const zumrailsTransactionId = providerData.transaction_id || null

      // Format borrower info
      const borrower = tx.loans?.users
      const borrowerName = borrower
        ? `${borrower.first_name || ''} ${borrower.last_name || ''}`.trim() ||
          'N/A'
        : 'N/A'

      return {
        // Core transaction fields
        amount: tx.amount,
        status: tx.status,
        transaction_type: tx.transaction_type,
        created_at: tx.created_at,
        updated_at: tx.updated_at,
        // Provider info
        zumrails_transaction_id: zumrailsTransactionId,
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

    // Sort by payment_date ascending (upcoming dates first)
    // Transactions without payment_date go to the end
    processedTransactions.sort((a: any, b: any) => {
      const dateA = a.payment_date ? new Date(a.payment_date).getTime() : Number.MAX_SAFE_INTEGER
      const dateB = b.payment_date ? new Date(b.payment_date).getTime() : Number.MAX_SAFE_INTEGER
      return dateA - dateB
    })

    // Apply pagination after sorting
    const from = (page - 1) * limit
    const to = from + limit
    const paginatedTransactions = processedTransactions.slice(from, to)

    return NextResponse.json({
      success: true,
      transactions: paginatedTransactions,
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
