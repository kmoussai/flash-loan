/**
 * Core event types for the notification system
 * 
 * This module defines the event-driven architecture for notifications.
 * Business logic should emit events, not send emails directly.
 */

import type { NotificationCategory, NotificationMetadata } from '@/src/types/notification'

/**
 * Union type of all supported notification event types
 */
export type NotificationEventType =
  | 'contract_sent'
  | 'contract_signed'
  | 'contract_viewed'
  | 'application_submitted'
  | 'application_approved'
  | 'application_rejected'
  | 'document_request_created'
  | 'document_request_submitted'
  | 'ibv_request_created'
  | 'ibv_request_submitted'
  | 'reference_request_created'
  | 'reference_request_submitted'
  | 'payment_received'
  | 'payment_due'
  | 'payment_overdue'
  | 'welcome'
  | 'password_reset'
  | 'magic_link'

/**
 * Base structure for all notification events
 */
export interface NotificationEvent {
  /** Unique event identifier */
  id: string
  /** Type of notification event */
  type: NotificationEventType
  /** When the event occurred */
  timestamp: string
  /** Category for database notifications */
  category: NotificationCategory | null
  /** Additional metadata specific to the event type */
  metadata: NotificationMetadata | Record<string, any>
  /** Recipient information */
  recipient: {
    /** User ID (client or staff) */
    id: string
    /** Type of recipient */
    type: 'client' | 'staff'
    /** Email address for email delivery */
    email: string
    /** Preferred language for i18n */
    preferredLanguage?: 'en' | 'fr'
    /** First name for personalization */
    firstName?: string
    /** Last name for personalization */
    lastName?: string
  }
  /** Priority level (affects processing order) */
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  /** Whether this event should trigger an email */
  sendEmail?: boolean
  /** Whether this event should create a database notification */
  createNotification?: boolean
  /** Optional delay before processing (ISO 8601 duration or timestamp) */
  scheduledFor?: string
}

/**
 * Event payload for contract-related events
 */
export interface ContractEventPayload {
  contractId: string
  loanApplicationId: string
  contractNumber?: number
  loanAmount?: number
  expiresAt?: string
  dashboardUrl?: string
}

/**
 * Event payload for application-related events
 */
export interface ApplicationEventPayload {
  loanApplicationId: string
  clientId: string
  loanAmount?: number
  status: string
  rejectionReason?: string
  dashboardUrl?: string
}

/**
 * Event payload for document request events
 */
export interface DocumentRequestEventPayload {
  requestId: string
  loanApplicationId?: string
  requestedItems: Array<{
    kind: 'document' | 'reference' | 'employment' | 'bank' | 'address' | 'other'
    label: string
  }>
  uploadLink: string
  expiresAt?: string
}

/**
 * Event payload for IBV (Identity Verification) events
 */
export interface IbvEventPayload {
  loanApplicationId: string
  clientId: string
  provider: string
  status: string
  requestGuid?: string
  iframeUrl?: string
}

/**
 * Event payload for payment-related events
 */
export interface PaymentEventPayload {
  contractId: string
  loanApplicationId: string
  amount: number
  dueDate?: string
  paymentUrl?: string
}

/**
 * Event payload for authentication events
 */
export interface AuthEventPayload {
  token?: string
  magicLink?: string
  resetLink?: string
  expiresAt?: string
}

