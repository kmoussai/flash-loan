/**
 * Zumrails webhook shared types
 */

export interface ZumrailsWebhookBase {
  Type: string
  Event: string
  EventGeneratedAt?: string
  Data: Record<string, any>
}

export interface ZumrailsUserWebhook extends ZumrailsWebhookBase {
  Type: 'User' | 'Customer'
  Event: 'Created' | 'Updated' | 'StatusChange'
  Data: {
    UserId?: string
    CustomerId?: string
    Id?: string
    Status?: string
    status?: string
    VerificationStatus?: string
    verificationStatus?: string
    ConnectionStatus?: string
    connectionStatus?: string
    PaymentProfiles?: any[]
    paymentProfiles?: any[]
    ConnectedAccount?: boolean
    connectedAccount?: boolean
    HasConnectedAccount?: boolean
    IsVerified?: boolean
    isVerified?: boolean
    [key: string]: any
  }
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
