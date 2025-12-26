/**
 * Enhanced Transform Zumrails API response to IBVSummary format
 * Improved transaction categorization for Canadian bank accounts
 */

import type { IBVSummary } from '@/src/app/api/inverite/fetch/[guid]/types'
import type { Frequency } from '@/src/lib/supabase/types'

// === TYPE DEFINITIONS ===

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

import type { ZumrailsAggregationResult } from '@/src/lib/ibv/zumrails-server'

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

type ZumrailsDataInput = ZumrailsResponse | ZumrailsAggregationResult

type TransactionCategory =
  | 'salary'
  | 'employment_insurance'
  | 'government_benefit'
  | 'pension'
  | 'loan_payment'
  | 'loan_receipt'
  | 'nsf_fee'
  | 'overdraft_fee'
  | 'bank_fee'
  | 'transfer'
  | 'rent_payment'
  | 'utilities'
  | 'insurance'
  | 'subscription'
  | 'other_income'
  | 'other_expense'
  | 'unknown'

interface CategorizedTransaction extends ZumrailsTransaction {
  detectedCategory: TransactionCategory
  confidence: number
}

// === ENHANCED CATEGORIZATION ===

/**
 * Enhanced categorization with better pattern matching
 */
export function categorizeTransaction(transaction: ZumrailsTransaction): CategorizedTransaction {
  const desc = (transaction.Description || '').toLowerCase().trim()
  const credit = transaction.Credit || 0
  const debit = transaction.Debit || 0
  const amount = credit > 0 ? credit : debit
  const isCredit = credit > 0
  const isDebit = debit > 0

  // === HIGH CONFIDENCE PATTERNS ===

  // NSF Fees (Debits, $25-$50)
  if (isDebit && /\b(nsf|n\.?s\.?f\.?|non[- ]?sufficient|insufficient.*fund)\b/i.test(desc)) {
    return { ...transaction, detectedCategory: 'nsf_fee', confidence: 0.98 }
  }

  // Overdraft Fees (Debits, $25-$50)
  if (isDebit && /\b(overdraft|over[- ]draft|od fee|od charge|o\/d)\b/i.test(desc)) {
    return { ...transaction, detectedCategory: 'overdraft_fee', confidence: 0.98 }
  }

  // Bank Fees (Debits, typically $0-$50)
  if (
    isDebit &&
    amount < 100 &&
    /\b(service charge|monthly fee|account fee|maintenance fee|transaction fee|bank fee|admin fee|atm fee)\b/i.test(desc)
  ) {
    return { ...transaction, detectedCategory: 'bank_fee', confidence: 0.95 }
  }

  // === GOVERNMENT BENEFITS & INCOME ===

  // Employment Insurance (Credits, $500-$2000)
  if (
    isCredit &&
    /\b(employment insurance|e\.?i\.? (benefit|payment)|service canada.*ei|assurance[- ]?emploi)\b/i.test(desc)
  ) {
    return { ...transaction, detectedCategory: 'employment_insurance', confidence: 0.97 }
  }

  // Government Benefits (Credits)
  const govBenefitPatterns = [
    /\bcanada child benefit\b/i,
    /\b(ccb|gst\/hst|gst credit|hst credit)\b/i,
    /\bcanada revenue\b/i,
    /\b(old age security|oas)\b/i,
    /\b(guaranteed income supplement|gis)\b/i,
    /\b(cpp|canada pension plan)\b/i,
    /\b(qpp|quebec pension)\b/i,
    /\brevenu qu[eé]bec\b/i,
    /\bservice canada\b/i,
    /\bcra payment\b/i
  ]
  
  if (isCredit && govBenefitPatterns.some(pattern => pattern.test(desc))) {
    return { ...transaction, detectedCategory: 'government_benefit', confidence: 0.95 }
  }

  // Pension (Credits, typically $1000+)
  if (
    isCredit &&
    /\b(pension|retirement|rrsp|rrif|annuity)\b/i.test(desc) &&
    !/\b(contribution|deposit to|transfer to)\b/i.test(desc)
  ) {
    return { ...transaction, detectedCategory: 'pension', confidence: 0.88 }
  }

  // === SALARY DETECTION ===

  // Strong salary indicators (Credits, $500+)
  const strongSalaryPatterns = [
    /\b(payroll|paycheque|pay cheque|payday)\b/i,
    /\b(salary|salaire)\b/i,
    /\b(direct deposit|dd|depot direct)\b/i,
    /\b(net pay|gross pay)\b/i,
    /\b(wages|earnings)\b/i,
    /\bpay period\b/i,
    /\bemployer (payment|deposit)\b/i
  ]

  if (isCredit && amount >= 500 && strongSalaryPatterns.some(pattern => pattern.test(desc))) {
    return { ...transaction, detectedCategory: 'salary', confidence: 0.92 }
  }

  // Company name patterns for salary
  if (
    isCredit &&
    amount >= 1000 &&
    /\b(inc\.|ltd\.|corp\.|llc|limited|incorporated)\b/i.test(desc)
  ) {
    return { ...transaction, detectedCategory: 'salary', confidence: 0.75 }
  }

  // === LOANS ===

  // Loan Payments (Debits)
  const loanPaymentPatterns = [
    /\b(loan payment|loan pmt|loan repayment)\b/i,
    /\b(mortgage|mtg pmt|mortgage payment)\b/i,
    /\b(auto loan|car loan|vehicle loan)\b/i,
    /\b(personal loan|pl payment)\b/i,
    /\b(student loan|osap|student aid)\b/i,
    /\b(line of credit|loc|heloc)\b/i,
    /\b(credit card payment|cc payment|visa payment|mastercard payment)\b/i,
    /\b(financing payment|installment)\b/i
  ]

  if (isDebit && loanPaymentPatterns.some(pattern => pattern.test(desc))) {
    return { ...transaction, detectedCategory: 'loan_payment', confidence: 0.93 }
  }

  // Loan Receipts (Credits)
  if (
    isCredit &&
    /\b(loan (deposit|disbursement|advance|proceeds)|financing approved)\b/i.test(desc)
  ) {
    return { ...transaction, detectedCategory: 'loan_receipt', confidence: 0.90 }
  }

  // === TRANSFERS ===

  const transferPatterns = [
    /\b(transfer|xfer|trf)\b/i,
    /\b(e-?transfer|interac|etransfer)\b/i,
    /\b(wire|ach|eft)\b/i,
    /\b(from.*account|to.*account)\b/i,
    /\baccount transfer\b/i
  ]

  if (transferPatterns.some(pattern => pattern.test(desc))) {
    return { ...transaction, detectedCategory: 'transfer', confidence: 0.85 }
  }

  // === RECURRING EXPENSES ===

  // Rent (Debits, typically $800+)
  if (
    isDebit &&
    amount >= 500 &&
    /\b(rent|landlord|property management|lease payment)\b/i.test(desc)
  ) {
    return { ...transaction, detectedCategory: 'rent_payment', confidence: 0.90 }
  }

  // Utilities (Debits, typically $50-$500)
  const utilityPatterns = [
    /\b(hydro|electricity|electric|power)\b/i,
    /\b(gas|natural gas|enbridge)\b/i,
    /\b(water|sewer)\b/i,
    /\b(internet|cable|telecom|bell|rogers|telus|shaw)\b/i,
    /\b(phone|mobile|wireless|cell)\b/i,
    /\b(utility|utilities)\b/i
  ]

  if (isDebit && amount >= 20 && amount <= 500 && utilityPatterns.some(p => p.test(desc))) {
    return { ...transaction, detectedCategory: 'utilities', confidence: 0.88 }
  }

  // Insurance (Debits, typically $50-$500)
  if (
    isDebit &&
    amount >= 30 &&
    /\b(insurance|assurance|coverage|premium)\b/i.test(desc)
  ) {
    return { ...transaction, detectedCategory: 'insurance', confidence: 0.87 }
  }

  // Subscriptions (Debits, typically $5-$100)
  const subscriptionPatterns = [
    /\b(subscription|monthly.*fee)\b/i,
    /\b(netflix|spotify|apple|amazon prime|disney)\b/i,
    /\b(gym|fitness|membership)\b/i,
    /\b(streaming|music service)\b/i
  ]

  if (isDebit && amount >= 5 && amount <= 150 && subscriptionPatterns.some(p => p.test(desc))) {
    return { ...transaction, detectedCategory: 'subscription', confidence: 0.82 }
  }

  // === PATTERN-BASED DETECTION FOR AMBIGUOUS TRANSACTIONS ===

  // Large regular credits likely salary (will be refined by pattern analysis)
  if (isCredit && amount >= 1500) {
    return { ...transaction, detectedCategory: 'salary', confidence: 0.55 }
  }

  // Medium regular credits might be salary
  if (isCredit && amount >= 800 && amount < 1500) {
    return { ...transaction, detectedCategory: 'salary', confidence: 0.45 }
  }

  // Regular fixed debits might be loan payments (will be refined)
  if (isDebit && amount >= 100 && amount <= 2000) {
    const roundAmount = Math.round(amount / 50) * 50
    if (Math.abs(amount - roundAmount) < 10) {
      return { ...transaction, detectedCategory: 'loan_payment', confidence: 0.50 }
    }
  }

  // === DEFAULT CATEGORIZATION ===

  if (isCredit) {
    return { ...transaction, detectedCategory: 'other_income', confidence: 0.30 }
  } else if (isDebit) {
    return { ...transaction, detectedCategory: 'other_expense', confidence: 0.30 }
  }

  return { ...transaction, detectedCategory: 'unknown', confidence: 0.10 }
}

/**
 * Group transactions by similar amounts
 */
function groupBySimilarAmount(
  transactions: CategorizedTransaction[],
  tolerance: number
): CategorizedTransaction[][] {
  const groups: CategorizedTransaction[][] = []
  const used = new Set<string>()

  transactions.forEach(tx1 => {
    if (used.has(tx1.Id)) return

    const amount1 = tx1.Credit || tx1.Debit || 0
    const group: CategorizedTransaction[] = [tx1]
    used.add(tx1.Id)

    transactions.forEach(tx2 => {
      if (used.has(tx2.Id) || tx1.Id === tx2.Id) return

      const amount2 = tx2.Credit || tx2.Debit || 0
      const avgAmount = (amount1 + amount2) / 2
      const diff = Math.abs(amount1 - amount2)

      if (diff / avgAmount <= tolerance) {
        group.push(tx2)
        used.add(tx2.Id)
      }
    })

    if (group.length >= 2) {
      groups.push(group)
    }
  })

  return groups
}

/**
 * Analyze frequency of transactions
 */
function analyzeFrequency(transactions: CategorizedTransaction[]): string | null {
  if (transactions.length < 2) return null

  const dates = transactions
    .map(tx => new Date(tx.Date))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  if (dates.length < 2) return null

  const intervals: number[] = []
  for (let i = 1; i < dates.length; i++) {
    const days = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    intervals.push(days)
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  
  // Check consistency (all intervals within 3 days of average)
  const isConsistent = intervals.every(interval => Math.abs(interval - avgInterval) <= 3)
  
  if (!isConsistent) return null

  if (avgInterval >= 6 && avgInterval <= 8) return 'weekly'
  if (avgInterval >= 12 && avgInterval <= 16) return 'bi-weekly'
  if (avgInterval >= 14 && avgInterval <= 17) return 'twice-monthly'
  if (avgInterval >= 28 && avgInterval <= 32) return 'monthly'

  return null
}

/**
 * Refine categories using pattern analysis across all transactions
 */
export function refineCategoriesByPattern(
  categorizedTransactions: CategorizedTransaction[]
): CategorizedTransaction[] {
  const refined = [...categorizedTransactions]

  // === SALARY REFINEMENT ===
  const salaryCandidates = refined.filter(
    tx =>
      (tx.detectedCategory === 'salary' || 
       (tx.detectedCategory === 'other_income' && tx.Credit && tx.Credit >= 500)) &&
      tx.confidence < 0.93
  )

  if (salaryCandidates.length >= 3) {
    const amountGroups = groupBySimilarAmount(salaryCandidates, 0.15)

    amountGroups.forEach(group => {
      if (group.length >= 3) {
        const frequency = analyzeFrequency(group)
        
        if (frequency && ['bi-weekly', 'twice-monthly', 'monthly'].includes(frequency)) {
          group.forEach(tx => {
            const index = refined.findIndex(t => t.Id === tx.Id)
            if (index >= 0) {
              refined[index].detectedCategory = 'salary'
              refined[index].confidence = 0.93
            }
          })
        }
      }
    })
  }

  // === LOAN PAYMENT REFINEMENT ===
  const loanCandidates = refined.filter(
    tx =>
      (tx.detectedCategory === 'loan_payment' ||
       (tx.detectedCategory === 'other_expense' && tx.Debit && tx.Debit >= 50)) &&
      tx.confidence < 0.93
  )

  if (loanCandidates.length >= 3) {
    const amountGroups = groupBySimilarAmount(loanCandidates, 0.05)

    amountGroups.forEach(group => {
      if (group.length >= 3) {
        const frequency = analyzeFrequency(group)
        
        if (frequency && ['weekly', 'bi-weekly', 'monthly'].includes(frequency)) {
          group.forEach(tx => {
            const index = refined.findIndex(t => t.Id === tx.Id)
            if (index >= 0) {
              refined[index].detectedCategory = 'loan_payment'
              refined[index].confidence = 0.92
            }
          })
        }
      }
    })
  }

  return refined
}

/**
 * Detect payment frequency from transaction dates
 */
function detectFrequency(
  transactions: CategorizedTransaction[]
): Frequency | null {
  if (transactions.length < 2) return null

  const dates = transactions
    .map(tx => new Date(tx.Date))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  if (dates.length < 2) return null

  const intervals: number[] = []
  for (let i = 1; i < dates.length; i++) {
    const daysDiff =
      (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    intervals.push(daysDiff)
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

  if (avgInterval >= 6 && avgInterval <= 8) return 'weekly'
  if (avgInterval >= 12 && avgInterval <= 16) return 'bi-weekly'
  if (avgInterval >= 14 && avgInterval <= 16) {
    const dayOfMonthPattern = dates.map(d => d.getDate())
    const has15th = dayOfMonthPattern.some(d => d === 15)
    const hasLastDay = dayOfMonthPattern.some(d => d >= 28)
    if (has15th && hasLastDay) return 'twice-monthly'
    return 'bi-weekly'
  }
  if (avgInterval >= 28 && avgInterval <= 31) return 'monthly'

  return null
}

/**
 * Predict future payment dates based on transaction history
 */
function predictFuturePayments(
  transactions: CategorizedTransaction[],
  frequency: Frequency | null
): Date[] {
  if (!frequency || transactions.length === 0) return []

  const dates = transactions
    .map(tx => new Date(tx.Date))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())

  if (dates.length === 0) return []

  const mostRecent = dates[0]
  const futurePayments: Date[] = []

  if (frequency === 'twice-monthly') {
    const currentMonth = mostRecent.getMonth()
    const currentYear = mostRecent.getFullYear()
    
    for (let monthOffset = 1; monthOffset <= 3; monthOffset++) {
      const targetMonth = currentMonth + monthOffset
      const targetYear = currentYear + Math.floor(targetMonth / 12)
      const actualMonth = targetMonth % 12
      
      const fifteenth = new Date(targetYear, actualMonth, 15)
      if (fifteenth > new Date()) {
        futurePayments.push(fifteenth)
      }
      
      const lastDay = new Date(targetYear, actualMonth + 1, 0)
      if (lastDay > new Date()) {
        futurePayments.push(lastDay)
      }
    }
  } else {
    for (let i = 1; i <= 3; i++) {
      const nextDate = new Date(mostRecent)

      switch (frequency) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7 * i)
          break
        case 'bi-weekly':
          nextDate.setDate(nextDate.getDate() + 14 * i)
          break
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + i)
          break
      }

      if (nextDate > new Date()) {
        futurePayments.push(nextDate)
      }
    }
  }

  return futurePayments
    .filter(d => d > new Date())
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, 6)
}

/**
 * Calculate NSF counts from transactions
 */
function calculateNSFCounts(
  categorizedTransactions: CategorizedTransaction[]
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

  const nsfTransactions = categorizedTransactions.filter(
    tx =>
      tx.detectedCategory === 'nsf_fee' || tx.detectedCategory === 'overdraft_fee'
  )

  return {
    all_time: nsfTransactions.length,
    quarter_3_months: nsfTransactions.filter(
      t => new Date(t.Date) >= threeMonthsAgo
    ).length,
    quarter_6_months: nsfTransactions.filter(
      t => new Date(t.Date) >= sixMonthsAgo
    ).length,
    quarter_9_months: nsfTransactions.filter(
      t => new Date(t.Date) >= nineMonthsAgo
    ).length,
    quarter_12_months: nsfTransactions.filter(
      t => new Date(t.Date) >= twelveMonthsAgo
    ).length
  }
}

/**
 * Calculate income by category
 */
function calculateIncomeByCategory(
  categorizedTransactions: CategorizedTransaction[]
): Array<{
  frequency: Frequency | null
  raw_frequency: string | null
  details: string
  monthly_income: number
  future_payments: Date[]
}> {
  const incomeCategories: TransactionCategory[] = [
    'salary',
    'employment_insurance',
    'government_benefit',
    'pension',
    'loan_receipt',
    'other_income'
  ]

  const incomeTransactions = categorizedTransactions.filter(
    t => t.Credit && t.Credit > 0 && incomeCategories.includes(t.detectedCategory)
  )

  if (incomeTransactions.length === 0) return []

  const byCategory = new Map<
    TransactionCategory,
    { transactions: CategorizedTransaction[]; totalAmount: number }
  >()

  incomeTransactions.forEach(t => {
    const category = t.detectedCategory
    const creditAmount = t.Credit || 0

    if (!byCategory.has(category)) {
      byCategory.set(category, { transactions: [], totalAmount: 0 })
    }

    const categoryData = byCategory.get(category)!
    categoryData.transactions.push(t)
    categoryData.totalAmount += creditAmount
  })

  const incomePatterns: Array<{
    frequency: Frequency | null
    raw_frequency: string | null
    details: string
    monthly_income: number
    future_payments: Date[]
  }> = []

  byCategory.forEach((categoryData, category) => {
    const transactionCount = categoryData.transactions.length
    const totalAmount = categoryData.totalAmount

    const frequency = detectFrequency(categoryData.transactions)

    let monthlyIncome = 0
    const dates = categoryData.transactions
      .map(t => new Date(t.Date))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    if (dates.length > 0 && frequency) {
      const avgAmountPerTransaction = totalAmount / transactionCount
      
      switch (frequency) {
        case 'weekly':
          monthlyIncome = avgAmountPerTransaction * 4.33
          break
        case 'bi-weekly':
          monthlyIncome = avgAmountPerTransaction * 2.17
          break
        case 'twice-monthly':
          monthlyIncome = avgAmountPerTransaction * 2
          break
        case 'monthly':
          monthlyIncome = avgAmountPerTransaction
          break
      }
    } else if (dates.length > 0) {
      const oldestDate = dates[0]
      const newestDate = dates[dates.length - 1]
      const daysDiff = Math.max(
        1,
        (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const monthsDiff = daysDiff / 30
      monthlyIncome = monthsDiff > 0 ? totalAmount / monthsDiff : totalAmount
    } else {
      monthlyIncome = totalAmount
    }

    const futurePayments = predictFuturePayments(
      categoryData.transactions,
      frequency
    )

    const categoryName = category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    incomePatterns.push({
      frequency,
      raw_frequency: frequency || null,
      details: `${categoryName}: ${transactionCount} transaction(s), total $${totalAmount.toFixed(2)}${frequency ? `, ${frequency}` : ''}`,
      monthly_income: Math.round(monthlyIncome * 100) / 100,
      future_payments: futurePayments
    })
  })

  return incomePatterns
}

/**
 * Transform Zumrails response to IBVSummary format
 */
export function transformZumrailsToIBVSummary(
  zumrailsData: ZumrailsDataInput,
  requestId: string
): IBVSummary {
  const card = 
    'Card' in zumrailsData && zumrailsData.Card 
      ? zumrailsData.Card 
      : 'result' in zumrailsData && zumrailsData.result?.Card 
        ? zumrailsData.result.Card 
        : null

  if (!card || !card.Accounts || !Array.isArray(card.Accounts)) {
    return {
      request_guid: requestId,
      accounts: []
    }
  }

  const accounts = card.Accounts.map((account: ZumrailsAccount) => {
    const bankName = card.InstitutionName || 'Unknown Bank'
    const accountType = account.AccountCategory || account.AccountSubCategory || account.Title || 'Unknown'
    const accountNumber = account.AccountNumber || ''
    const transitNumber = account.TransitNumber || ''
    const institutionNumber = account.InstitutionNumber || ''
    const routingCode = `${institutionNumber}-${transitNumber}`

    const transactions = account.Transactions || []

    const categorizedTransactions = transactions.map(categorizeTransaction)
    const refinedTransactions = refineCategoriesByPattern(categorizedTransactions)

    const nsfCounts = calculateNSFCounts(refinedTransactions)
    const incomeByCategory = calculateIncomeByCategory(refinedTransactions)

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
      bank_pdf_statements: [],
      total_transactions: transactions.length
    }
  })

  return {
    request_guid: requestId,
    accounts
  }
}