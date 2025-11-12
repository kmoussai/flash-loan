export type BankAccount = {
  bank_name: string
  account_number: string
  transit_number: string
  institution_number: string
  account_name: string
}

export type Frequency = 'weekly' | 'bi-weekly' | 'twice-monthly' | 'monthly'
export type PaymentFrequency = Frequency