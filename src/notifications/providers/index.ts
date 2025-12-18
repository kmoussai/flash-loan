/**
 * Email providers module
 * 
 * Export all provider types and implementations
 */

export * from './types'
export * from './resend'
export * from './smtp'

/**
 * Get the configured email provider
 * 
 * Priority:
 * 1. Resend (if RESEND_API_KEY is set)
 * 2. SMTP (if SMTP configuration is available)
 * 3. Throws error if no provider is configured
 */
export async function getEmailProvider(): Promise<
  import('./types').EmailProvider
> {
  // Check for Resend first
  if (process.env.RESEND_API_KEY) {
    const { createResendProvider } = await import('./resend')
    return createResendProvider()
  }

  // Fall back to SMTP
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  ) {
    const { createSmtpProvider } = await import('./smtp')
    return createSmtpProvider()
  }

  throw new Error(
    'No email provider configured. Set RESEND_API_KEY or SMTP configuration.'
  )
}

