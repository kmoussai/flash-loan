export interface IBVSummary {
  accounts: {
    bank_name: string
    type: string
    number: string
    transit: string
    institution: string
    routing_code: string
    statistics: {
      income_net: number
      nsf: {
        all_time: number;
        quarter_3_months: number;
        quarter_6_months: number;
        quarter_9_months: number;
        quarter_12_months: number
      }
    }
    bank_pdf_statements: string[]
    total_transactions: number
  }[]
  request_guid: string
}
