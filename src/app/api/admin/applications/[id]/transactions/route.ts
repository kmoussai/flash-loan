import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { categorizeTransaction, refineCategoriesByPattern } from '@/src/lib/ibv/zumrails-transform'

export const dynamic = 'force-dynamic'

// GET /api/admin/applications/[id]/transactions
// Returns flattened and categorized transactions for the given application id.
// Uses categorization system and supports pagination, filtering, and searching.
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
      return NextResponse.json({ 
        transactions: [], 
        count: 0,
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Get query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10)))
    const accountIndex = url.searchParams.get('account_index') ? parseInt(url.searchParams.get('account_index')!, 10) : null
    const category = url.searchParams.get('category')?.trim() || null
    const search = url.searchParams.get('search')?.trim() || null

    // First, check if ANY categorized transactions exist for this application (without filters)
    // This prevents recategorizing if transactions are already categorized
    const { data: existingCheck, error: existingCheckError } = await (supabase as any)
      .from('categorized_transactions')
      .select('id')
      .eq('application_id', applicationId)
      .limit(1)

    // If no categorized transactions exist, we'll need to categorize them
    // But first check if this is just a count request (limit=1 with category filter)
    // In that case, don't trigger categorization - just return 0
    const isCountOnlyRequest = limit === 1 && category !== null && page === 1 && !search
    
    if (!existingCheck || existingCheck.length === 0) {
      if (isCountOnlyRequest) {
        // This is just a count request, don't trigger categorization
        // Return empty result with 0 count
        return NextResponse.json({
          transactions: [],
          count: 0,
          pagination: {
            page: 1,
            limit: 1,
            total: 0,
            totalPages: 0
          }
        })
      }
      console.log('[Transactions API] No categorized transactions found, will categorize from JSONB data')
    } else {
      console.log('[Transactions API] Categorized transactions already exist, using them')
    }

    // Now query categorized transactions with filters applied
    let query = supabase
      .from('categorized_transactions')
      .select('*', { count: 'exact' })
      .eq('application_id', applicationId)
      .order('transaction_date', { ascending: false })

    // Apply filters
    if (accountIndex !== null) {
      query = query.eq('account_index', accountIndex)
    }
    if (category) {
      query = query.eq('detected_category', category)
    }
    if (search) {
      query = query.ilike('description', `%${search}%`)
    }

    // Get total count for pagination
    const { count: totalCount } = await query

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data: categorizedTransactions, error: dbError } = await query.range(from, to)

    // If we have categorized transactions in DB, use them
    if (categorizedTransactions && categorizedTransactions.length > 0) {
      const transformed = categorizedTransactions.map((tx: any) => ({
        id: tx.id,
        description: tx.description,
        date: tx.transaction_date,
        credit: tx.credit ? Number(tx.credit) : null,
        debit: tx.debit ? Number(tx.debit) : null,
        balance: tx.balance ? Number(tx.balance) : null,
        category: tx.detected_category,
        original_category: tx.original_category,
        confidence: Number(tx.confidence),
        flags: [],
        account_index: tx.account_index,
        account_type: tx.account_type,
        account_description: tx.account_description,
        account_number: tx.account_number,
        institution: tx.institution
      }))

      return NextResponse.json({
        transactions: transformed,
        count: transformed.length,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        }
      })
    }

    // If no categorized transactions exist, fetch from JSONB and categorize
    // Only do this if we confirmed no transactions exist (from check above)
    if (!existingCheck || existingCheck.length === 0) {
      console.log('[Transactions API] No categorized transactions in DB, fetching and categorizing...')
      
      // Call PostgreSQL function to extract transactions directly from JSONB
      const { data: transactions, error: rpcError } = await (supabase as any).rpc('get_ibv_transactions', {
        p_application_id: applicationId,
        p_limit: null // Get all transactions for categorization
      })

      if (rpcError) {
        console.error('[Transactions API] Error calling get_ibv_transactions:', rpcError)
        return NextResponse.json(
          { error: 'Failed to extract transactions from database' },
          { status: 500 }
        )
      }

      const transactionsArray = Array.isArray(transactions) ? transactions : []
      if (transactionsArray.length === 0) {
        return NextResponse.json({
          transactions: [],
          count: 0,
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0
          }
        })
      }

      // Transform to ZumrailsTransaction format for categorization
      const zumrailsTransactions = transactionsArray.map((tx: any) => ({
        Id: `${tx.account_index}-${tx.date}-${tx.description}`,
        Date: tx.date || '',
        Description: tx.description || 'No description',
        Credit: tx.credit !== null && tx.credit !== undefined ? Number(tx.credit) : undefined,
        Debit: tx.debit !== null && tx.debit !== undefined ? Number(tx.debit) : undefined,
        Balance: tx.balance !== null && tx.balance !== undefined ? Number(tx.balance) : 0,
        Category: tx.category ? { Id: '', Name: tx.category, InsightsType: '' } : undefined
      }))

      // Double-check: Another request might have categorized while we were processing
      // This prevents race conditions when multiple requests come in simultaneously
      const { data: doubleCheck, error: doubleCheckError } = await (supabase as any)
        .from('categorized_transactions')
        .select('id')
        .eq('application_id', applicationId)
        .limit(1)

      if (doubleCheck && doubleCheck.length > 0) {
        console.log('[Transactions API] Transactions were categorized by another request, skipping save')
        // Transactions already exist, skip categorization and use existing ones
        // Re-query with filters to return the categorized transactions
        let filteredQuery = supabase
          .from('categorized_transactions')
          .select('*', { count: 'exact' })
          .eq('application_id', applicationId)
          .order('transaction_date', { ascending: false })

        if (accountIndex !== null) {
          filteredQuery = filteredQuery.eq('account_index', accountIndex)
        }
        if (category) {
          filteredQuery = filteredQuery.eq('detected_category', category)
        }
        if (search) {
          filteredQuery = filteredQuery.ilike('description', `%${search}%`)
        }

        const { count: filteredTotalCount } = await filteredQuery
        const { data: filteredCategorizedTransactions } = await filteredQuery.range(from, to)

        if (filteredCategorizedTransactions && filteredCategorizedTransactions.length > 0) {
          const transformed = filteredCategorizedTransactions.map((tx: any) => ({
            id: tx.id,
            description: tx.description,
            date: tx.transaction_date,
            credit: tx.credit ? Number(tx.credit) : null,
            debit: tx.debit ? Number(tx.debit) : null,
            balance: tx.balance ? Number(tx.balance) : null,
            category: tx.detected_category,
            original_category: tx.original_category,
            confidence: Number(tx.confidence),
            flags: [],
            account_index: tx.account_index,
            account_type: tx.account_type,
            account_description: tx.account_description,
            account_number: tx.account_number,
            institution: tx.institution
          }))

          return NextResponse.json({
            transactions: transformed,
            count: transformed.length,
            pagination: {
              page,
              limit,
              total: filteredTotalCount || 0,
              totalPages: Math.ceil((filteredTotalCount || 0) / limit)
            }
          })
        }
      }

      // Categorize transactions
      const categorized = zumrailsTransactions.map(categorizeTransaction)
      const refined = refineCategoriesByPattern(categorized)

      // Save categorized transactions to database
      // Use insert with error handling for duplicates (shouldn't happen, but just in case)
      const transactionsToSave = refined.map((tx, idx) => {
        const originalTx = transactionsArray[idx]
        return {
          application_id: applicationId,
          account_index: originalTx.account_index || 0,
          description: tx.Description,
          transaction_date: originalTx.date || new Date().toISOString().split('T')[0],
          credit: tx.Credit || null,
          debit: tx.Debit || null,
          balance: tx.Balance || null,
          detected_category: tx.detectedCategory,
          confidence: tx.confidence,
          account_type: originalTx.account_type || null,
          account_description: originalTx.account_description || null,
          account_number: originalTx.account_number || null,
          institution: originalTx.institution || null,
          original_category: originalTx.category || null
        }
      })

      // Save in batches
      const batchSize = 100
      let savedCount = 0
      for (let i = 0; i < transactionsToSave.length; i += batchSize) {
        const batch = transactionsToSave.slice(i, i + batchSize)
        const { error: insertError } = await (supabase as any)
          .from('categorized_transactions')
          .insert(batch)

        if (insertError) {
          // If it's a unique constraint violation, that's okay - transaction already exists
          if (insertError.code === '23505') {
            console.log(
              `[Transactions API] Some transactions in batch ${i / batchSize + 1} already exist (another request saved them)`
            )
          } else {
            console.error('[Transactions API] Error saving categorized transactions batch:', insertError)
          }
        } else {
          savedCount += batch.length
        }
      }

      if (savedCount > 0) {
        console.log(
          `[Transactions API] Successfully categorized and saved ${savedCount} transactions`
        )
      } else {
        console.log(
          `[Transactions API] All transactions were already saved by another request`
        )
      }

      // Now re-query with filters to return the categorized transactions
      // Rebuild the query with filters
      let filteredQuery = supabase
        .from('categorized_transactions')
        .select('*', { count: 'exact' })
        .eq('application_id', applicationId)
        .order('transaction_date', { ascending: false })

      if (accountIndex !== null) {
        filteredQuery = filteredQuery.eq('account_index', accountIndex)
      }
      if (category) {
        filteredQuery = filteredQuery.eq('detected_category', category)
      }
      if (search) {
        filteredQuery = filteredQuery.ilike('description', `%${search}%`)
      }

      const { count: filteredTotalCount } = await filteredQuery
      const { data: filteredCategorizedTransactions } = await filteredQuery.range(from, to)

      if (filteredCategorizedTransactions && filteredCategorizedTransactions.length > 0) {
        const transformed = filteredCategorizedTransactions.map((tx: any) => ({
          id: tx.id,
          description: tx.description,
          date: tx.transaction_date,
          credit: tx.credit ? Number(tx.credit) : null,
          debit: tx.debit ? Number(tx.debit) : null,
          balance: tx.balance ? Number(tx.balance) : null,
          category: tx.detected_category,
          original_category: tx.original_category,
          confidence: Number(tx.confidence),
          flags: [],
          account_index: tx.account_index,
          account_type: tx.account_type,
          account_description: tx.account_description,
          account_number: tx.account_number,
          institution: tx.institution
        }))

        return NextResponse.json({
          transactions: transformed,
          count: transformed.length,
          pagination: {
            page,
            limit,
            total: filteredTotalCount || 0,
            totalPages: Math.ceil((filteredTotalCount || 0) / limit)
          }
        })
      }
    }

    // If we reach here and no categorized transactions were found after categorization,
    // or if filters resulted in no matches, return empty result
    return NextResponse.json({
      transactions: [],
      count: 0,
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    })
  } catch (error: any) {
    console.error('[Transactions API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


