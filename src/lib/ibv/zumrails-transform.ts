/**
 * Transform Zumrails API response to IBVSummary format
 * Converts Zumrails GetInformationByRequestId response to match Inverite IBVSummary structure
 * Simplified to use transaction categories directly from ZumRails
 */

import type { IBVSummary } from '@/src/app/api/inverite/fetch/[guid]/types'
import type { Frequency } from '@/src/lib/supabase/types'

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

interface ZumrailsAccount {
  Id: string
  InstitutionNumber: string
  TransitNumber: string
  AccountNumber: string
  Title: string
  Balance: number
  Currency: string
  AccountCategory: string
  AccountSubCategory: string
  Transactions: ZumrailsTransaction[]
}

interface ZumrailsCard {
  Id: string
  Accounts: ZumrailsAccount[]
  InstitutionName?: string
  InstitutionId?: string
  HolderId?: string
  Holder?: {
    FirstName?: string
    LastName?: string
    FullName?: string
    Email?: string
    PhoneNumber?: string
    DateOfBirth?: string
  }
}

interface ZumrailsResponse {
  RequestId?: string
  CustomerId?: string
  Card?: ZumrailsCard
  result?: {
    RequestId?: string
    CustomerId?: string
    Card?: ZumrailsCard
  }
}

/**
 * Calculate NSF (Non-Sufficient Funds) counts from transactions
 * Uses ZumRails category data to identify NSF transactions
 */
function calculateNSFCounts(transactions: ZumrailsTransaction[]): {
  all_time: number
  quarter_3_months: number
  quarter_6_months: number
  quarter_9_months: number
  quarter_12_months: number
} {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const nineMonthsAgo = new Date(now.getTime() - 270 * 24 * 60 * 60 * 1000)
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  // Use ZumRails category to identify NSF transactions
  const isNSF = (transaction: ZumrailsTransaction): boolean => {
    const categoryName = transaction.Category?.Name?.toLowerCase() || ''
    const insightsType = transaction.Category?.InsightsType?.toLowerCase() || ''
    const desc = transaction.Description?.toLowerCase() || ''

    // Check category name or insights type for NSF indicators
    return (
      categoryName.includes('nsf') ||
      categoryName.includes('overdraft') ||
      categoryName.includes('insufficient') ||
      insightsType.includes('nsf') ||
      insightsType.includes('overdraft') ||
      desc.includes('nsf') ||
      desc.includes('insufficient funds')
    )
  }

  const nsfTransactions = transactions.filter(isNSF)

  return {
    all_time: nsfTransactions.length,
    quarter_3_months: nsfTransactions.filter(t => new Date(t.Date) >= threeMonthsAgo).length,
    quarter_6_months: nsfTransactions.filter(t => new Date(t.Date) >= sixMonthsAgo).length,
    quarter_9_months: nsfTransactions.filter(t => new Date(t.Date) >= nineMonthsAgo).length,
    quarter_12_months: nsfTransactions.filter(t => new Date(t.Date) >= twelveMonthsAgo).length
  }
}

/**
 * Calculate income per account based on ZumRails transaction categories
 * Groups transactions by category and sums credits for income-related categories
 */
function calculateIncomeByCategory(transactions: ZumrailsTransaction[]): Array<{
  frequency: Frequency | null
  raw_frequency: string | null
  details: string
  monthly_income: number
  future_payments: Date[]
}> {
  // Filter for credit transactions (income)
  const incomeTransactions = transactions.filter(t => t.Credit && t.Credit > 0)

  if (incomeTransactions.length === 0) {
    return []
  }

  // Group by category name from ZumRails
  const byCategory = new Map<string, { transactions: ZumrailsTransaction[], totalAmount: number }>()
  
  incomeTransactions.forEach(t => {
    const categoryName = t.Category?.Name || 'Other Income'
    const creditAmount = t.Credit || 0

    if (!byCategory.has(categoryName)) {
      byCategory.set(categoryName, { transactions: [], totalAmount: 0 })
    }

    const categoryData = byCategory.get(categoryName)!
    categoryData.transactions.push(t)
    categoryData.totalAmount += creditAmount
  })

  // Convert to income patterns format
  const incomePatterns: Array<{
    frequency: Frequency | null
    raw_frequency: string | null
    details: string
    monthly_income: number
    future_payments: Date[]
  }> = []

  byCategory.forEach((categoryData, categoryName) => {
    const transactionCount = categoryData.transactions.length
    const totalAmount = categoryData.totalAmount

    // Calculate average monthly income based on transaction history
    // This is a simple calculation - total amount divided by number of months in the data
    const dates = categoryData.transactions
      .map(t => new Date(t.Date))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    let monthlyIncome = 0
    if (dates.length > 0) {
      const oldestDate = dates[0]
      const newestDate = dates[dates.length - 1]
      const daysDiff = Math.max(1, (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
      const monthsDiff = daysDiff / 30
      monthlyIncome = monthsDiff > 0 ? totalAmount / monthsDiff : totalAmount
    } else {
      monthlyIncome = totalAmount
    }

    incomePatterns.push({
      frequency: null, // ZumRails categories don't provide frequency directly
      raw_frequency: null,
      details: `${categoryName}: ${transactionCount} transaction(s), total $${totalAmount.toFixed(2)}`,
      monthly_income: Math.round(monthlyIncome * 100) / 100,
      future_payments: [] // No future payment prediction without frequency data
    })
  })

  return incomePatterns
}

/**
 * Transform Zumrails response to IBVSummary format
 * Simplified to use ZumRails transaction categories directly
 */
export function transformZumrailsToIBVSummary(
  zumrailsData: ZumrailsResponse,
  requestId: string
): IBVSummary {
  const card = zumrailsData.Card || zumrailsData.result?.Card
  if (!card || !card.Accounts || !Array.isArray(card.Accounts)) {
    return {
      request_guid: requestId,
      accounts: []
    }
  }

  const accounts = card.Accounts.map((account: ZumrailsAccount) => {
    // Extract account information
    const bankName = card.InstitutionName || 'Unknown Bank'
    const accountType = account.AccountCategory || account.AccountSubCategory || account.Title || 'Unknown'
    const accountNumber = account.AccountNumber || ''
    const transitNumber = account.TransitNumber || ''
    const institutionNumber = account.InstitutionNumber || ''
    const routingCode = `${institutionNumber}-${transitNumber}`

    // Get transactions
    const transactions = account.Transactions || []

    // Calculate NSF counts using ZumRails categories
    const nsfCounts = calculateNSFCounts(transactions)

    // Calculate income by category using ZumRails transaction categories
    const incomeByCategory = calculateIncomeByCategory(transactions)

    // Calculate net income (sum of all credits minus debits)
    const totalCredits = transactions.reduce((sum, t) => sum + (t.Credit || 0), 0)
    const totalDebits = transactions.reduce((sum, t) => sum + (t.Debit || 0), 0)
    const incomeNet = totalCredits - totalDebits

    return {
      bank_name: bankName,
      type: accountType,
      number: accountNumber,
      transit: transitNumber,
      institution: institutionNumber,
      routing_code: routingCode,
      income: incomeByCategory,
      statistics: {
        income_net: Math.round(incomeNet * 100) / 100,
        nsf: nsfCounts
      },
      bank_pdf_statements: [], // Zumrails doesn't provide PDF statements in this format
      total_transactions: transactions.length
    }
  })

  return {
    request_guid: requestId,
    accounts
  }
}

