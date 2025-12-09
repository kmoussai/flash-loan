/**
 * Transform Zumrails API response to IBVSummary format
 * Converts Zumrails GetInformationByRequestId response to match Inverite IBVSummary structure
 */

import type { IBVSummary } from '@/src/app/api/inverite/fetch/[guid]/types'
import type { Frequency } from '@/src/lib/supabase/types'
import { normalizeFrequency } from '@/src/lib/utils/frequency'

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
 * NSF is typically indicated by negative balances, overdraft fees, or specific transaction types
 */
function calculateNSFCounts(
  transactions: ZumrailsTransaction[],
  accountCreatedDate?: string
): {
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

  const accountStartDate = accountCreatedDate
    ? new Date(accountCreatedDate)
    : transactions.length > 0
      ? new Date(transactions[transactions.length - 1].Date)
      : twelveMonthsAgo

  // Common NSF indicators
  const nsfKeywords = [
    'nsf',
    'non-sufficient',
    'insufficient funds',
    'overdraft',
    'od fee',
    'returned',
    'bounce',
    'unpaid',
    'declined'
  ]

  const isNSF = (transaction: ZumrailsTransaction): boolean => {
    const desc = transaction.Description?.toLowerCase() || ''
    const categoryName = transaction.Category?.Name?.toLowerCase() || ''

    // Check if transaction description contains NSF keywords
    if (nsfKeywords.some(keyword => desc.includes(keyword))) {
      return true
    }

    // Check if category indicates NSF
    if (
      categoryName.includes('nsf') ||
      categoryName.includes('overdraft') ||
      categoryName.includes('insufficient')
    ) {
      return true
    }

    // Negative balance with debit transaction might indicate NSF
    if (transaction.Balance < 0 && transaction.Debit) {
      return true
    }

    return false
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
 * Extract income patterns from transactions
 * Looks for recurring income transactions (e.g., Employment Paycheck, Government Income)
 */
function extractIncomePatterns(transactions: ZumrailsTransaction[]): Array<{
  frequency: Frequency | null
  raw_frequency: string | null
  details: string
  monthly_income: number
  future_payments: Date[]
}> {
  const incomeCategories = [
    'Employment Paycheck',
    'Employment Income',
    'Salary',
    'Payroll',
    'Child Support Income',
    'Other Government Income',
    'Social Assistance Income',
    'Tax Refund',
    'Tax Rebate'
  ]

  // Filter income transactions
  const incomeTransactions = transactions.filter(t => {
    if (t.Credit && t.Credit > 0) {
      const categoryName = t.Category?.Name || ''
      return incomeCategories.some(cat => categoryName.includes(cat))
    }
    return false
  })

  if (incomeTransactions.length === 0) {
    return []
  }

  // Group by category
  const byCategory = new Map<string, ZumrailsTransaction[]>()
  incomeTransactions.forEach(t => {
    const category = t.Category?.Name || 'Other Income'
    if (!byCategory.has(category)) {
      byCategory.set(category, [])
    }
    byCategory.get(category)!.push(t)
  })

  const patterns: Array<{
    frequency: Frequency | null
    raw_frequency: string | null
    details: string
    monthly_income: number
    future_payments: Date[]
  }> = []

  byCategory.forEach((transactions, categoryName) => {
    // Sort by date descending
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()
    )

    // Calculate frequency based on intervals
    const dates = sorted.map(t => new Date(t.Date)).filter(d => !isNaN(d.getTime()))
    if (dates.length < 2) {
      // Not enough data to determine frequency
      const avgAmount = transactions.reduce((sum, t) => sum + (t.Credit || 0), 0) / transactions.length
      patterns.push({
        frequency: null,
        raw_frequency: null,
        details: `${categoryName}: ${transactions.length} transaction(s)`,
        monthly_income: avgAmount * 4, // Rough estimate
        future_payments: []
      })
      return
    }

    // Calculate average interval between payments
    const intervals: number[] = []
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = dates[i].getTime() - dates[i + 1].getTime()
      intervals.push(diff)
    }
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    const avgDays = avgInterval / (1000 * 60 * 60 * 24)

    // Determine frequency
    let frequency: Frequency | null = null
    let rawFrequency: string | null = null

    if (avgDays >= 6 && avgDays <= 8 || avgDays >= 3 && avgDays <= 4) {
      frequency = 'weekly'
      rawFrequency = 'weekly'
    } else if (avgDays >= 13 && avgDays <= 16) {
      frequency = 'bi-weekly'
      rawFrequency = 'bi-weekly'
    } else if (avgDays >= 28 && avgDays <= 31) {
      frequency = 'monthly'
      rawFrequency = 'monthly'
    }
    // Note: 'twice-monthly' would typically be around 14-15 days, which overlaps with bi-weekly
    // We prioritize bi-weekly for that range

    // Calculate monthly income
    const avgAmount = transactions.reduce((sum, t) => sum + (t.Credit || 0), 0) / transactions.length
    let monthlyIncome = 0

    if (frequency === 'weekly') {
      monthlyIncome = avgAmount * 4
    } else if (frequency === 'bi-weekly') {
      monthlyIncome = avgAmount * 2
    } else if (frequency === 'monthly') {
      monthlyIncome = avgAmount
    } else {
      // Estimate based on transactions per month (for null frequency or other cases)
      const transactionsPerMonth = (30 / avgDays) * transactions.length
      monthlyIncome = avgAmount * transactionsPerMonth
    }

    // Predict future payments (next 3 payments)
    const futurePayments: Date[] = []
    if (dates.length > 0 && frequency) {
      const lastPaymentDate = dates[0]
      let daysBetween = 30 // Default to monthly

      if (frequency === 'weekly') {
        daysBetween = 7
      } else if (frequency === 'bi-weekly') {
        daysBetween = 14
      } else if (frequency === 'monthly') {
        daysBetween = 30
      }

      for (let i = 1; i <= 3; i++) {
        const nextDate = new Date(lastPaymentDate)
        nextDate.setDate(nextDate.getDate() + daysBetween * i)
        futurePayments.push(nextDate)
      }
    }

    patterns.push({
      frequency,
      raw_frequency: rawFrequency,
      details: `${categoryName}: ${transactions.length} transaction(s), avg ${avgDays.toFixed(1)} days apart`,
      monthly_income: Math.round(monthlyIncome * 100) / 100,
      future_payments: futurePayments
    })
  })

  return patterns
}

/**
 * Transform Zumrails response to IBVSummary format
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
    const routingCode = `${institutionNumber}-${transitNumber}` // Combine for routing code

    // Get transactions
    const transactions = account.Transactions || []

    // Calculate NSF counts
    const nsfCounts = calculateNSFCounts(transactions)

    // Extract income patterns
    const incomePatterns = extractIncomePatterns(transactions)

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
      income: incomePatterns,
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

