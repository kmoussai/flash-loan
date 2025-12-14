/**
 * Email provider abstraction types
 * 
 * This module defines the interface that all email providers must implement,
 * allowing for easy swapping between different email services.
 */

/**
 * Email recipient information
 */
export interface EmailRecipient {
  /** Email address */
  email: string
  /** Optional display name */
  name?: string
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  /** File name */
  filename: string
  /** File content (base64 encoded or buffer) */
  content: string | Buffer
  /** MIME type */
  contentType?: string
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /** Recipient(s) */
  to: EmailRecipient | EmailRecipient[]
  /** Optional CC recipients */
  cc?: EmailRecipient | EmailRecipient[]
  /** Optional BCC recipients */
  bcc?: EmailRecipient | EmailRecipient[]
  /** Email subject */
  subject: string
  /** HTML content */
  html: string
  /** Plain text content (optional, will be generated from HTML if not provided) */
  text?: string
  /** Optional reply-to address */
  replyTo?: EmailRecipient
  /** Optional attachments */
  attachments?: EmailAttachment[]
  /** Optional tags for analytics/tracking */
  tags?: string[]
  /** Optional metadata */
  metadata?: Record<string, string>
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
  /** Whether the email was sent successfully */
  success: boolean
  /** Message ID from the provider (if successful) */
  messageId?: string
  /** Error message (if failed) */
  error?: string
  /** Provider-specific response data */
  providerData?: Record<string, any>
}

/**
 * Email provider interface
 * 
 * All email providers must implement this interface to be compatible
 * with the notification system.
 */
export interface EmailProvider {
  /**
   * Send an email using this provider
   * 
   * @param options - Email sending options
   * @returns Promise resolving to the send result
   */
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>

  /**
   * Verify the provider configuration and connection
   * 
   * @returns Promise resolving to verification result
   */
  verify(): Promise<{ success: boolean; error?: string }>

  /**
   * Get the provider name
   */
  getName(): string
}

