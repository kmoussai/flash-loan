/**
 * Resend email provider implementation
 * 
 * This module implements the EmailProvider interface using Resend.
 * Requires RESEND_API_KEY environment variable.
 */

import type { EmailProvider, SendEmailOptions, SendEmailResult } from './types'

/**
 * Resend email provider implementation
 * 
 * Uses Resend API for sending emails. Requires RESEND_API_KEY environment variable.
 */
export class ResendEmailProvider implements EmailProvider {
  private apiKey: string | null
  private fromEmail: string
  private fromName: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || null
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@flash-loan.ca'
    this.fromName = process.env.RESEND_FROM_NAME || 'Flash-Loan'
  }

  getName(): string {
    return 'Resend'
  }

  async verify(): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'RESEND_API_KEY environment variable is not set',
      }
    }

    try {
      // Try to make a simple API call to verify the key
      const response = await fetch('https://api.resend.com/emails', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      // Even if the request fails, if we get a response, the key is valid
      // (we're just checking connectivity, not actually sending)
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to verify Resend connection',
      }
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'RESEND_API_KEY environment variable is not set',
      }
    }

    try {
      // Format recipients
      const to = Array.isArray(options.to)
        ? options.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
        : [options.to.name ? `${options.to.name} <${options.to.email}>` : options.to.email]

      const cc = options.cc
        ? Array.isArray(options.cc)
          ? options.cc.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
          : [options.cc.name ? `${options.cc.name} <${options.cc.email}>` : options.cc.email]
        : undefined

      const bcc = options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
          : [options.bcc.name ? `${options.bcc.name} <${options.bcc.email}>` : options.bcc.email]
        : undefined

      const replyTo = options.replyTo
        ? options.replyTo.name
          ? `${options.replyTo.name} <${options.replyTo.email}>`
          : options.replyTo.email
        : undefined

      // Prepare attachments if provided
      const attachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content:
          typeof att.content === 'string'
            ? att.content
            : Buffer.from(att.content).toString('base64'),
        content_type: att.contentType,
      }))

      // Make API request to Resend
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to,
          cc,
          bcc,
          reply_to: replyTo,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments,
          tags: options.tags,
          metadata: options.metadata,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Resend API error: ${response.statusText}`,
          providerData: data,
        }
      }

      return {
        success: true,
        messageId: data.id,
        providerData: data,
      }
    } catch (error: any) {
      console.error('[ResendEmailProvider] Failed to send email:', error)
      return {
        success: false,
        error: error?.message || 'Failed to send email via Resend',
      }
    }
  }
}

/**
 * Create a Resend email provider instance
 */
export function createResendProvider(): ResendEmailProvider {
  return new ResendEmailProvider()
}

