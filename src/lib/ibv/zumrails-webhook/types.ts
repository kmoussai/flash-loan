/**
 * Zumrails webhook shared types
 */

export interface ZumrailsWebhookBase {
  Type: string
  Event: string
  EventGeneratedAt?: string
  Data: Record<string, any>
}

export interface ZumrailsUser {
  Id: string
  CreatedAt: string
  AccountType: 'Personal' | 'Business'
  Name: string
  FirstName: string
  LastName: string
  CompanyName: string | null
  PhoneNumber: string
  Currency: string
  ShippingSameAsBilling: boolean
  Email: string
  BankAccountInformation: any
  Customer: any
  Addresses: []
  TransactionMethodsAvailable: any
  TransactionMethodsAvailableDescription: null
  CreditCardInformation: null
  InteracCustomerId: null
  InteracAliasId: null
  ClientUserId: string
  ExtraField1: string
  ExtraField2: string | null
  AggregationRequestId: string
  FiservDdpRecipientUserId: string | null
  IdType: null
  IdNumber: null
  IdState: null
  BusinessTaxId: null
}
export interface ZumrailsUserWebhook extends ZumrailsWebhookBase {
  Type: 'User' | 'Customer'
  Event: 'Created' | 'Updated' | 'StatusChange' | 'Connected'
  Data: ZumrailsUser
}

export interface ZumrailsInsightsWebhook extends ZumrailsWebhookBase {
  Type: 'Insights'
  Event: 'Completed' | 'Failed'
  Data: {
    CustomerId: string
    RequestId?: string
    CreatedAt?: string
    UserId?: string
    ClientUserId?: string | null
    [key: string]: any
  }
}

export interface ZumrailsTransactionWebhook extends ZumrailsWebhookBase {
  Type: 'Transaction'
  Event: 'Created' | 'Updated' | 'StatusChange'
  Data: {
    UserId?: string
    CustomerId?: string
    TransactionId?: string
    Status?: string
    [key: string]: any
  }
}

export type ZumrailsWebhook =
  | ZumrailsUserWebhook
  | ZumrailsInsightsWebhook
  | ZumrailsTransactionWebhook
  | ZumrailsWebhookBase

export interface ProcessWebhookResult {
  processed: boolean
  applicationId: string | null
  updated: boolean
  message?: string
  shouldRetry?: boolean // Indicates if webhook should be retried (for timing issues)
}
