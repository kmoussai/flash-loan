import type { Frequency } from '@/src/lib/supabase/types'

export interface IBVSummary {
  accounts: {
    bank_name: string
    type: string
    number: string
    transit: string
    institution: string
    routing_code: string
    income: Array<{
      frequency: Frequency | null
      raw_frequency: string | null
      details: string
      monthly_income: number
      future_payments: Date[]
    }>
    statistics: {
      income_net: number
      nsf: {
        all_time: number
        quarter_3_months: number
        quarter_6_months: number
        quarter_9_months: number
        quarter_12_months: number
      }
    }
    bank_pdf_statements: string[]
    total_transactions: number
  }[]
  request_guid: string
}
/**
Done: 
Number of NSF:


Stop Payment: Yes / No
Payment Blocked: Yes / No
Name of job Company: 
Payment Frequency:
Next Pay Date:
Number of Months Account Has Existed: 
Contact Information:
Name:
Address:
Email:
Phone Number:
Loan Company:

institution Number - Transit Number- Account Number Account Name
 Account Balance Available:
 Current:
 Account Holder

 */
