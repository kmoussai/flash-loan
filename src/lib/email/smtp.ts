import nodemailer from 'nodemailer'

interface SmtpConfig {
  host: string
  port: number
  secure: boolean // true for 465, false for other ports
  auth: {
    user: string
    pass: string
  }
  from: {
    name: string
    email: string
  }
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'no-reply@flash-loan.ca'
  const fromName = process.env.SMTP_FROM_NAME || 'Flash-Loan'
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === '465'

  if (!host || !port || !user || !pass) {
    console.warn('[SMTP] Configuration incomplete. Email sending will be disabled.')
    return null
  }

  return {
    host,
    port: parseInt(port, 10),
    secure,
    auth: {
      user,
      pass
    },
    from: {
      name: fromName,
      email: fromEmail
    }
  }
}

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter

  const config = getSmtpConfig()
  if (!config) return null

  try {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    })
    return transporter
  } catch (error) {
    console.error('[SMTP] Failed to create transporter:', error)
    return null
  }
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const config = getSmtpConfig()
  const transport = getTransporter()

  if (!config || !transport) {
    console.warn('[SMTP] Email not sent - SMTP not configured:', options.to)
    return { success: false, error: 'SMTP not configured' }
  }

  try {
    const result = await transport.sendMail({
      from: `"${config.from.name}" <${config.from.email}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    })

    console.log('[SMTP] Email sent successfully:', {
      to: options.to,
      messageId: result.messageId
    })

    return { success: true }
  } catch (error: any) {
    console.error('[SMTP] Failed to send email:', error)
    return { success: false, error: error?.message || 'Failed to send email' }
  }
}

// Test SMTP connection
export async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  const transport = getTransporter()
  if (!transport) {
    return { success: false, error: 'SMTP not configured' }
  }

  try {
    await transport.verify()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'SMTP verification failed' }
  }
}

