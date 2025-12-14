/**
 * SMTP email provider implementation (using nodemailer)
 * 
 * This module implements the EmailProvider interface using nodemailer/SMTP.
 * This is a fallback provider that uses the existing SMTP configuration.
 */

import nodemailer from 'nodemailer'
import type { EmailProvider, SendEmailOptions, SendEmailResult } from './types'

/**
 * SMTP email provider implementation
 * 
 * Uses nodemailer with SMTP configuration from environment variables.
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null
  private fromEmail: string
  private fromName: string

  constructor() {
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@flash-loan.ca'
    this.fromName = process.env.SMTP_FROM_NAME || 'Flash-Loan'
    this.initializeTransporter()
  }

  private initializeTransporter(): void {
    const host = process.env.SMTP_HOST
    const port = process.env.SMTP_PORT
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASSWORD
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === '465'

    if (!host || !port || !user || !pass) {
      console.warn('[SmtpEmailProvider] SMTP configuration incomplete')
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure,
        auth: {
          user,
          pass,
        },
      })
    } catch (error) {
      console.error('[SmtpEmailProvider] Failed to create transporter:', error)
    }
  }

  getName(): string {
    return 'SMTP (Nodemailer)'
  }

  async verify(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'SMTP transporter not initialized. Check SMTP configuration.',
      }
    }

    try {
      await this.transporter.verify()
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'SMTP verification failed',
      }
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'SMTP transporter not initialized. Check SMTP configuration.',
      }
    }

    try {
      // Format recipients
      const to = Array.isArray(options.to)
        ? options.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
        : options.to.name
          ? `${options.to.name} <${options.to.email}>`
          : options.to.email

      const cc = options.cc
        ? Array.isArray(options.cc)
          ? options.cc.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
          : options.cc.name
            ? `${options.cc.name} <${options.cc.email}>`
            : options.cc.email
        : undefined

      const bcc = options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
          : options.bcc.name
            ? `${options.bcc.name} <${options.bcc.email}>`
            : options.bcc.email
        : undefined

      const replyTo = options.replyTo
        ? options.replyTo.name
          ? `${options.replyTo.name} <${options.replyTo.email}>`
          : options.replyTo.email
        : undefined

      // Prepare attachments
      const attachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content:
          typeof att.content === 'string'
            ? att.content
            : Buffer.from(att.content),
        contentType: att.contentType,
      }))

      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        cc,
        bcc,
        replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
        attachments,
        headers: {
          'X-Email-Tags': options.tags?.join(',') || undefined,
          ...Object.fromEntries(
            Object.entries(options.metadata || {}).map(([k, v]) => [`X-${k}`, v])
          ),
        },
      })

      return {
        success: true,
        messageId: result.messageId,
        providerData: {
          response: result.response,
          accepted: result.accepted,
          rejected: result.rejected,
        },
      }
    } catch (error: any) {
      console.error('[SmtpEmailProvider] Failed to send email:', error)
      return {
        success: false,
        error: error?.message || 'Failed to send email via SMTP',
      }
    }
  }
}

/**
 * Create an SMTP email provider instance
 */
export function createSmtpProvider(): SmtpEmailProvider {
  return new SmtpEmailProvider()
}

