/**
 * Zum Rails Transaction Types
 * Based on Zum Rails Transactions API: https://docs.zumrails.com/api-reference/transactions
 */

// Zum Rails Transaction Types
export type ZumRailsType = 
  | 'AccountsReceivable'  // Collection from user
  | 'AccountsPayable'      // Disbursement to user
  | 'FundZumWallet'        // Fund wallet from funding source
  | 'WithdrawZumWallet'    // Withdraw from wallet to funding source
  | 'UserTransfer'         // Transfer between users (API only)
  | 'UnloadPrepaidCard'    // Debit from prepaid card
  | 'LoadPrepaidCard'      // Credit to prepaid card
  | 'Refund'               // Refund transaction

// Transaction Methods (Canada)
export type TransactionMethodCanada = 
  | 'Eft'
  | 'Interac'
  | 'VisaDirect'
  | 'CreditCard'
  | 'PrepaidCard'

// Transaction Methods (US)
export type TransactionMethodUS = 
  | 'Ach'
  | 'RtpFedNow'
  | 'DebitCard'
  | 'CreditCard'
  | 'MoneyTransfer'

// Combined Transaction Method
export type TransactionMethod = TransactionMethodCanada | TransactionMethodUS

// Zum Rails Transaction Status
export type ZumRailsTransactionStatus =
  | 'InProgress'
  | 'Completed'
  | 'Succeeded'
  | 'Failed'
  | 'Cancelled'
  | 'Scheduled'
  | 'InReview'
  | 'Pending Cancellation'

// Zum Rails Transaction Events
export type ZumRailsTransactionEvent = 
  // Common events
  | 'Started'
  | 'Succeeded'
  | 'WalletFunded'
  | 'WalletWithdrawn'
  // EFT events
  | 'EFTFileCreated'
  | 'EFTFileUploaded'
  | 'EFTAnswerReceived'
  | 'EFTAnswerProcessed'
  // EFT failure events
  | 'EftFailedValidationRejection'
  | 'EftFailedInsufficientFunds'
  | 'EftFailedCannotLocateAccount'
  | 'EftFailedStopPayment'
  | 'EftFailedAccountClosed'
  | 'EftFailedNoDebitAllowed'
  | 'EftFailedFundsNotFree'
  | 'EftFailedCurrencyAccountMismatch'
  | 'EftFailedPayorPayeeDeceased'
  | 'EftFailedFrozenAccount'
  | 'EftFailedInvalidErrorAccountNumber'
  | 'EftFailedErrorPayorPayeeName'
  | 'EftFailedRefusedNoAgreement'
  | 'EftFailedNotInAccountAgreementP'
  | 'EftFailedNotInAccountAgreementE'
  | 'EftFailedAgreementRevoked'
  | 'EftFailedDefaultByAFinancialInstitution'
  | 'EftFailedCustomerInitiatedReturnCreditOnly'
  | 'EftFailedTransactionNotAllowed'
  | 'EftFailedNoPrenotificationP1'
  | 'EftFailedNoPrenotificationP2'
  | 'NotEnoughBalanceInWalletError'
  // Interac events
  | 'InteracSent'
  | 'InteracAcknowledgedCredit'
  | 'InteracAcknowledgedDebit'
  | 'InteracFailedRecipientContactInfoMissing'
  | 'InteracFailedInvalidEmailFormat'
  | 'InteracFailedInvalidPhoneNumber'
  | 'InteracFailedMultipleTransferLevelErrors'
  | 'InteracFailedRevoked'
  | 'InteracFailedBulkCancellationRequest'
  | 'InteracFailedRecipientRejected'
  | 'InteracFailedAuthentication'
  | 'InteracFailedReachedCancellationCutOff'
  | 'InteracFailedNotificationDeliveryFailure'
  | 'InteracFailedAmountGreaterThanMax'
  | 'InteracFailedDebtorRejected'
  | 'InteracFailedFundsDepositFailed'
  | 'InteracFailedClientEmailedToRequestCancellation'
  | 'InteracFailedGenericError'
  | 'InteracWaitingSettlementIntoWallet'
  | 'InteracSettledIntoWallet'
  | 'InteracFailedNameMismatch'
  | 'InteracFraudAlertResponded'
  | 'InteracFundsHeldForValidation'
  | 'InteracFailedInvalidAccountNumber'
  | 'InteracFailedRequestBlockedByUser'
  | 'InteracCreditorExternalFinancialInfo'
  | 'InteracFailedAPICancellation'
  | 'InteracFailedANRNotSupported'
  | 'InteracFailedSecurityQuestionNeededForProvidedEmail'
  | 'InteracFailedBannedAccount'
  | 'InteracFailedSameProfileConflict'
  | 'InteracFailedAutoDeposit'
  // Visa Direct events
  | 'VisaDirectGenericError'
  | 'VisaDirectDoNotHonor'
  | 'VisaDirectInsufficientFunds'
  | 'VisaDirectNotPermittedToCardHolderInformed'
  | 'VisaDirectAmountLimitNotAuthorized'
  | 'VisaDirectRejectedAmlOrFraud'
  | 'VisaDirectWaitingSettlementIntoClientsAccounts'
  | 'VisaDirectSettledIntoClientsAccount'
  | 'VisaDirectInvalidCardNumber'
  | 'VisaDirectChargeback'
  | 'VisaDirectReenterTransaction'
  | 'VisaDirectInvalidTransaction'
  | 'VisaDirectIssuerOrSwitchInoperative'
  | 'VisaDirectUnsupportedCardType'
  | 'VisaDirectRejectedAccountLimitExceeded'
  | 'VisaDirectInvalidExpiryDate'
  | 'VisaDirectInvalidPIN'
  | 'VisaDirectInvalidSecret'
  | 'VisaDirectTimeoutLimitReachedError'
  // Credit Card events
  | 'CreditCardDeclined'
  | 'CreditCardError'
  | 'CreditCardHeldForReview'
  | 'CreditCardGenericError'
  | 'CreditCardUnknownResponse'
  | 'CreditCardHoldCallOrPickUpCard'
  | 'CreditCardSecViolation'
  | 'CreditCardServNotAllowed'
  | 'CreditCardCvvMismatch'
  | 'CreditCardInvalidMerchantId'
  | 'CreditCardAmountExceeded'
  | 'CreditCardRefundAmountExceeded'
  | 'CreditCardCashbackNotApp'
  | 'CreditCardExpiredCard'
  | 'CreditCardNoAccountFound'
  | 'CreditCardNotPermittedToCardHolderInformed'
  | 'CreditCardInvalidCardNumber'
  | 'CreditCardRejectedAmlOrFraud'
  | 'CreditCardTypeNotAccepted'
  | 'CreditCardDomesticDebitDeclined'
  | 'CreditCardClosedAccount'
  | 'CreditCardDuplicateTransaction'
  | 'CreditCardNotActivated'
  // ACH events (US)
  | 'AchTransactionAccepted'
  | 'AchFailedTransactionExpired'
  | 'AchFailedReturnedOrClosedAccount'
  | 'AchFailedRejectedWithReason'
  | 'AchFailedGeneralError'
  | 'AchFailedHighRiskOrPotentialFraud'
  | 'AchFailedDueToMerchantSetup'
  | 'AchFailedInvalidValueForField'
  | 'AchFailedAuthorizationRevoked'
  | 'AchFailedDuplicateTransaction'
  | 'AchFailedDueToProcessorTimeout'
  | 'AchFailedTransactionNotAllowed'
  | 'AchBankAccountVerificationFailed'
  | 'AchDebitResponseReceived'
  | 'AchCreditResponseReceived'
  | 'AchTransactionReturned'
  | 'AchTransactionResubmitted'
  | 'AchCancellationFailed'
  | 'AchCancellationFailedDueToMerchantSetup'
  | 'AchCancellationFailedRefundGreaterThanTransactionAmount'
  | 'AchCancellationFailedTransactionAlreadyCancelled'
  | 'AchFailedDueToNegativeData'
  | 'AchFailedIneligibleBankAccount'

// Zum Rails User object
export interface ZumRailsUser {
  Id: string
  FirstName?: string
  LastName?: string
  Email?: string
  IsActive?: boolean
  CompanyName?: string
}

// Zum Rails Wallet object
export interface ZumRailsWallet {
  Id: string
  Type?: string
  Currency?: string
}

// Zum Rails Funding Source object
export interface ZumRailsFundingSource {
  Id: string
  Institution?: string
  InstitutionNumber?: string  // Canada
  TransitNumber?: string      // Canada
  AccountNumber?: string
  RoutingNumber?: string      // US
}

// Zum Rails Customer object
export interface ZumRailsCustomer {
  Id: string
  CompanyName?: string
  CompanyEmail?: string
}

// Zum Rails Transaction History Event
export interface ZumRailsTransactionHistory {
  Id?: string
  CreatedAt: string
  Event: ZumRailsTransactionEvent
  EventDescription: string
}

// Zum Rails Create Transaction Request
export interface ZumRailsCreateTransactionRequest {
  ZumRailsType: ZumRailsType
  TransactionMethod: TransactionMethod
  Amount: number
  Memo: string
  Comment?: string
  UserId?: string
  WalletId?: string
  FundingSourceId?: string
  ScheduledStartDate?: string  // YYYY-MM-DD format
  ClientTransactionId?: string
  User?: {
    CompanyName?: string
    Email?: string
    FirstName?: string
    LastName?: string
    PhoneNumber?: string
  }
  // Interac specific
  InteracNotificationChannel?: 'email' | 'sms'
  InteracHasSecurityQuestionAndAnswer?: boolean
  InteracSecurityQuestion?: string
  InteracSecurityAnswer?: string
  SessionFingerprint?: string
  SessionIpAddress?: string
  UseInteracANR?: boolean
  // 3D Secure (Visa Direct/Credit Card)
  CardEci?: string
  CardXid?: string
  CardCavv?: string
  // Authorize (Credit Card)
  Authorize?: {
    Capture: boolean
    AutoExpireDays?: number
  }
  // Payment Instrument (US)
  PaymentInstrumentId?: string
}

// Zum Rails Create Transaction Response
export interface ZumRailsCreateTransactionResponse {
  statusCode: number
  message: string
  isError: boolean
  result: {
    Id: string
    Amount?: number
    Comment?: string
    TransactionMethod?: TransactionMethod
    TransactionStatus?: ZumRailsTransactionStatus
    Customer?: ZumRailsCustomer
    ZumRailsType?: ZumRailsType
    PaymentInstrumentId?: string
    User?: ZumRailsUser
    Wallet?: ZumRailsWallet
    From?: string
    Memo?: string
    To?: string
    Currency?: string
    CreatedAt?: string
    TransactionHistory?: ZumRailsTransactionHistory[]
  }
}

// Zum Rails Get Transaction Response
export interface ZumRailsGetTransactionResponse {
  statusCode: number
  message: string
  isError: boolean
  result: {
    Id: string
    CreatedAt: string
    Memo?: string
    Comment?: string
    Amount: number
    Currency?: string
    ZumRailsType: ZumRailsType
    TransactionMethod: TransactionMethod
    TransactionStatus: ZumRailsTransactionStatus
    RecurrentTransactionId?: string | null
    FailedTransactionEvent?: ZumRailsTransactionEvent | null
    ScheduledStartDate?: string
    ClientTransactionId?: string
    InteracUrl?: string
    InteracDebtorInstitutionNumber?: string
    InteracDebtorFullName?: string
    InteracDebtorAccountNumber?: string
    InteracCreditorInstitutionNumber?: string
    InteracCreditorFullName?: string
    InteracCreditorAccountNumber?: string
    InteracNotificationChannel?: string
    UseInteracANR?: boolean
    From?: string
    To?: string
    IsRefundable?: boolean
    FailedAt?: string | null
    AuthorizedHoldExpiredAt?: string | null
    Customer?: ZumRailsCustomer
    User?: ZumRailsUser
    Wallet?: ZumRailsWallet
    FundingSource?: ZumRailsFundingSource
    TargetWallet?: ZumRailsWallet
    TransactionHistory?: ZumRailsTransactionHistory[]
    // US specific fields
    TelecheckApprovalCode?: string
    TelecheckDenialRecordNumber?: string
    PaymentInstrumentId?: string
    CreditCardResponseCode?: string
    CreditCardAdditionalResponseData?: string
    CreditCardAuthorizationId?: string
    CreditCardAuthorizationNetworkId?: string
    CreditCardAuthorizationNetworkName?: string
    CreditCardErrorData?: string
    TransactionChargeback?: Array<{
      Id: string
      AcquirerReferenceNumber?: string
      AuthorizationCode?: string
      ChargebackAmount?: number
      ChargebackControlNumber?: string
      ChargebackStatus?: string
      ChargebackWorkTypeCode?: string
      DisputeCurrencyCode?: string
      DisputeReasonCode?: string
      DueDate?: string
      FileId?: string
      MemberMessageText?: string
      ReceivedDate?: string
    }>
  }
}

// Provider Data structure stored in payment_transactions.provider_data
export interface ZumRailsProviderData {
  // Transaction identifiers
  transaction_id: string
  client_transaction_id?: string
  // Optional batch identifier (for batch-created transactions)
  batch_number?: number
  
  // Transaction details
  zumrails_type: ZumRailsType
  transaction_method: TransactionMethod
  transaction_status: ZumRailsTransactionStatus
  
  // Amount and dates
  amount: number
  currency?: 'CAD' | 'USD'
  scheduled_start_date?: string
  created_at: string
  completed_at?: string | null
  failed_at?: string | null
  
  // Memo and comments
  memo?: string
  comment?: string
  
  // Related entities
  user?: ZumRailsUser
  wallet?: ZumRailsWallet
  funding_source?: ZumRailsFundingSource
  customer?: ZumRailsCustomer
  
  // Transaction events
  failed_transaction_event?: ZumRailsTransactionEvent | null
  transaction_history?: ZumRailsTransactionHistory[]
  
  // Additional fields
  recurrent_transaction_id?: string | null
  is_refundable?: boolean
  from?: string
  to?: string
  
  // Full API response
  raw_response?: ZumRailsGetTransactionResponse['result']
}

// ===========================
// Filter Transactions Types
// ===========================

/**
 * Filter transactions request
 */
export interface ZumRailsFilterTransactionsRequest {
  TransactionMethod?: TransactionMethod
  ZumRailsType?: ZumRailsType
  TransactionStatus?: ZumRailsTransactionStatus
  CreatedAtFrom?: string // YYYY-MM-DD format
  CreatedAtTo?: string // YYYY-MM-DD format
  UserId?: string
  WalletId?: string
  FundingSourceId?: string
  BatchNumber?: number // Batch ID from processBatchFile response
  Pagination?: {
    PageNumber?: number
    ItemsPerPage?: number
  }
}

/**
 * Filter transactions response
 */
export interface ZumRailsFilterTransactionsResponse {
  statusCode: number
  message: string
  isError: boolean
  result?: {
    Items: Array<ZumRailsGetTransactionResponse['result']>
    TotalCount: number
    PageNumber: number
    ItemsPerPage: number
    TotalPages: number
  }
}

// ===========================
// Batch Transaction Types
// ===========================

/**
 * Batch transaction validation request (Canada - EFT/Interac)
 */
export interface ZumRailsValidateBatchRequest {
  TransactionType: 'AccountsReceivable' | 'AccountsPayable'
  WalletId?: string
  FundingSourceId?: string
  Bytes: string // Base64 encoded CSV file
}

/**
 * Batch transaction validation response (Canada)
 */
export interface ZumRailsValidateBatchResponse {
  statusCode: number
  message: string
  isError: boolean
  result?: {
    InvalidTransactions: string
    ValidTransactions: number
    Status: string
    TotalAmount: number
    Transactions: Array<{
      AccountNumber: string
      Amount: number
      Comment: string
      CompanyName: string
      CustomerId: string | null
      FirstName: string
      InstitutionNumber: string
      LastName: string
      Memo: string
      Status: string
      TransitNumber: string
    }>
  }
}

/**
 * Batch transaction process request (Canada - EFT/Interac)
 */
export interface ZumRailsProcessBatchRequest {
  FileName: string
  SkipFileAlreadyProcessedInLast24Hours: boolean
  WithdrawSumTotalFromFundingSource: boolean
  Bytes: string // Base64 encoded CSV file
  FundingSourceId?: string
  WalletId?: string
  TransactionType: 'AccountsReceivable' | 'AccountsPayable'
  TransactionMethod: 'Eft' | 'Interac'
}

/**
 * Batch transaction process response (Canada)
 */
export interface ZumRailsProcessBatchResponse {
  statusCode: number
  message: string
  isError: boolean
  result?: number // Batch ID
}

/**
 * Batch transaction upload request (US - ACH)
 */
export interface ZumRailsUploadBatchUsRequest {
  FileName: string
  SkipFileAlreadyProcessedInLast24Hours: boolean
  WithdrawSumTotalFromFundingSource: boolean
  Bytes: string // Base64 encoded CSV file
  FundingSourceId?: string
  WalletId?: string
  TransactionType: 'AccountsReceivable' | 'AccountsPayable'
  TransactionMethod: 'Ach'
}

/**
 * Batch transaction upload response (US)
 */
export interface ZumRailsUploadBatchUsResponse {
  statusCode: number
  message: string
  isError: boolean
  result?: string // Batch ID or empty string
}
