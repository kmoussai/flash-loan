/**
 * Helper function to categorize and save transactions when ZumRails data is refetched
 * Clears old categorized transactions and re-categorizes with the new transform logic
 */

import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { categorizeTransaction, refineCategoriesByPattern } from './zumrails-transform'

interface ZumrailsTransaction {
  Id: string
  Date: string
  Description: string
  Credit?: number
  Debit?: number
  Balance: number
  Category?: {
    Id: string
    Name: string
    InsightsType: string
  }
}

/**
 * Clear old categorized transactions for an application and re-categorize with new data
 * Only recategorizes if transactions are not already categorized
 */
export async function recategorizeTransactionsForApplication(
  applicationId: string,
  zumrailsData: any
): Promise<void> {
  const supabase = createServerSupabaseAdminClient()

  try {
    // Check if transactions are already categorized
    const { data: existingTransactions, error: checkError } = await (supabase as any)
      .from('categorized_transactions')
      .select('id')
      .eq('application_id', applicationId)
      .limit(1)

    if (checkError) {
      console.error(
        '[Recategorize Transactions] Error checking existing transactions:',
        checkError
      )
      // Continue anyway - might be first time
    } else if (existingTransactions && existingTransactions.length > 0) {
      console.log(
        '[Recategorize Transactions] Transactions already categorized for application:',
        applicationId,
        '- Skipping recategorization'
      )
      return // Already categorized, don't redo
    }

    console.log(
      '[Recategorize Transactions] No existing categorized transactions found, proceeding with categorization for application:',
      applicationId
    )

    // Extract transactions from ZumRails data
    // Handle both ZumrailsResponse (with optional Card/result) and ZumrailsAggregationResult (with required Card)
    const card =
      'Card' in zumrailsData && zumrailsData.Card
        ? zumrailsData.Card
        : 'result' in zumrailsData && zumrailsData.result?.Card
          ? zumrailsData.result.Card
          : null

    if (!card || !card.Accounts || !Array.isArray(card.Accounts)) {
      console.log(
        '[Recategorize Transactions] No accounts found in ZumRails data'
      )
      return
    }

    // Extract all transactions from all accounts
    const allTransactions: Array<{
      transaction: ZumrailsTransaction
      accountIndex: number
      accountType: string | null
      accountDescription: string | null
      accountNumber: string | null
      institution: string | null
    }> = []

    card.Accounts.forEach((account: any, accountIndex: number) => {
      const transactions = account.Transactions || []
      transactions.forEach((tx: any) => {
        allTransactions.push({
          transaction: {
            Id: tx.Id || `${accountIndex}-${tx.Date}-${tx.Description}`,
            Date: tx.Date || '',
            Description: tx.Description || 'No description',
            Credit: tx.Credit !== null && tx.Credit !== undefined ? Number(tx.Credit) : undefined,
            Debit: tx.Debit !== null && tx.Debit !== undefined ? Number(tx.Debit) : undefined,
            Balance: tx.Balance !== null && tx.Balance !== undefined ? Number(tx.Balance) : 0,
            Category: tx.Category
              ? {
                  Id: tx.Category.Id || '',
                  Name: tx.Category.Name || '',
                  InsightsType: tx.Category.InsightsType || ''
                }
              : undefined
          },
          accountIndex,
          accountType: account.AccountCategory || account.AccountSubCategory || null,
          accountDescription: account.Title || null,
          accountNumber: account.AccountNumber || null,
          institution: card.InstitutionName || null
        })
      })
    })

    if (allTransactions.length === 0) {
      console.log('[Recategorize Transactions] No transactions found')
      return
    }

    // Categorize all transactions
    const categorized = allTransactions.map(({ transaction }) =>
      categorizeTransaction(transaction)
    )
    const refined = refineCategoriesByPattern(categorized)

    // Prepare transactions for database
    const transactionsToSave = refined.map((tx, idx) => {
      const { accountIndex, accountType, accountDescription, accountNumber, institution } =
        allTransactions[idx]
      const originalTx = allTransactions[idx].transaction

      return {
        application_id: applicationId,
        account_index: accountIndex,
        description: tx.Description,
        transaction_date: tx.Date || new Date().toISOString().split('T')[0],
        credit: tx.Credit || null,
        debit: tx.Debit || null,
        balance: tx.Balance || null,
        detected_category: tx.detectedCategory,
        confidence: tx.confidence,
        account_type: accountType,
        account_description: accountDescription,
        account_number: accountNumber,
        institution: institution,
        original_category: originalTx.Category?.Name || null
      }
    })

    // Save in batches to avoid overwhelming the database
    // Use insert with ignoreDuplicates to prevent duplicates
    const batchSize = 100
    for (let i = 0; i < transactionsToSave.length; i += batchSize) {
      const batch = transactionsToSave.slice(i, i + batchSize)
      
      // Insert with ignoreDuplicates to prevent duplicate key errors
      const { error: insertError } = await (supabase as any)
        .from('categorized_transactions')
        .insert(batch)

      if (insertError) {
        // If it's a unique constraint violation, that's okay - transaction already exists
        // Otherwise log the error
        if (insertError.code === '23505') {
          // Unique constraint violation - transaction already exists, skip silently
          console.log(
            `[Recategorize Transactions] Some transactions in batch ${i / batchSize + 1} already exist (expected)`
          )
        } else {
          console.error(
            '[Recategorize Transactions] Error saving categorized transactions batch:',
            insertError
          )
        }
      }
    }

    console.log(
      `[Recategorize Transactions] Successfully categorized and saved ${transactionsToSave.length} transactions for application:`,
      applicationId
    )
  } catch (error: any) {
    console.error(
      '[Recategorize Transactions] Error recategorizing transactions:',
      error
    )
    // Don't throw - this is a background operation
  }
}

