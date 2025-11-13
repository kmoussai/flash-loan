export type NotificationRecipient = 'client' | 'staff'

export type NotificationCategory =
  | 'document_request_submission'
  | 'reference_request_submission'
  | 'employment_request_submission'
  | 'address_request_submission'
  | 'other_request_submission'
  | 'document_request_created'
  | 'reference_request_created'
  | 'employment_request_created'
  | 'address_request_created'
  | 'multi_request_created'
  | 'contract_sent'
  | 'contract_signed'
  | 'contract_viewed'
  | 'application_submitted'
  | 'application_pre_approved'
  | 'ibv_request_submitted'
  | 'ibv_request_created'
  | 'ibv_request_notification_sent'
  | (string & {})

export interface RequestSubmissionNotificationMetadata {
  type: 'request_submission'
  requestId: string
  requestKind: string
  submissionId: string
  clientId: string | null
  clientName?: string | null
  loanApplicationId?: string | null
  submittedAt: string
}

export interface RequestPromptNotificationMetadata {
  type: 'request_prompt'
  requestIds: string[]
  groupId: string | null
  loanApplicationId?: string | null
  requestKinds: string[]
  expiresAt?: string | null
}

export interface ContractNotificationMetadata {
  type: 'contract_event'
  contractId: string
  loanApplicationId: string
  contractNumber?: number
  sentAt?: string | null
  viewedAt?: string | null
  signedAt?: string | null
  event: 'sent' | 'viewed' | 'signed'
}

export interface ApplicationNotificationMetadata {
  type: 'application_event'
  loanApplicationId: string
  clientId: string
  status: string
  submittedAt?: string | null
}

export interface IbvNotificationMetadata {
  type: 'ibv_event'
  loanApplicationId: string
  clientId: string
  provider: string
  status: string
  requestGuid?: string | null
  requestId?: string | null
  submittedAt?: string | null
  createdAt?: string | null
  notificationSentAt?: string | null
}

export type NotificationMetadata =
  | RequestSubmissionNotificationMetadata
  | RequestPromptNotificationMetadata
  | ContractNotificationMetadata
  | ApplicationNotificationMetadata
  | IbvNotificationMetadata
  | Record<string, any>

export type Notification = {
  id: string
  client_id: string | null
  staff_id: string | null
  title: string
  message: string
  category: NotificationCategory | null
  metadata: NotificationMetadata | null
  read_at: string | null
  created_at: string
  updated_at: string
}

export type NotificationInsert = {
  client_id?: string | null
  staff_id?: string | null
  title: string
  message: string
  category?: NotificationCategory | null
  metadata?: NotificationMetadata | null
  read_at?: string | null
}

export type NotificationUpdate = {
  client_id?: string | null
  staff_id?: string | null
  title?: string
  message?: string
  category?: NotificationCategory | null
  metadata?: NotificationMetadata | null
  read_at?: string | null
}

