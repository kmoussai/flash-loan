/**
 * Temporary Password Email Utilities
 * 
 * Provides reusable functions for generating and sending temporary passwords
 * to clients. Extracted from loan application flow for reuse across the application.
 */

import { generateReadablePassword } from './password'
import { generateInvitationEmail } from '@/src/lib/email/templates/invitation'
import { sendEmail } from '@/src/lib/email/smtp'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export interface SendInvitationEmailResult {
  success: boolean
  error?: string
}

export interface SendTempPasswordResult {
  success: boolean
  error?: string
  temporaryPassword?: string
}

export interface SendTempPasswordOptions {
  clientId: string
  email: string
  firstName: string
  lastName: string
  preferredLanguage?: 'en' | 'fr'
}

export interface SendInvitationEmailOptions {
  email: string
  firstName: string
  lastName: string
  temporaryPassword: string
  preferredLanguage?: 'en' | 'fr'
}

/**
 * Send an invitation email with temporary password
 * 
 * This is a lower-level function that just sends the email.
 * Use this when you already have a temporary password generated.
 * 
 * @param options - Email and client information
 * @returns Result indicating success/failure
 */
export async function sendInvitationEmail(
  options: SendInvitationEmailOptions
): Promise<SendInvitationEmailResult> {
  try {
    const {
      email,
      firstName,
      lastName,
      temporaryPassword,
      preferredLanguage = 'en'
    } = options

    // Generate invitation email content
    const { subject, html, text } = generateInvitationEmail({
      firstName,
      lastName,
      email,
      temporaryPassword,
      preferredLanguage: preferredLanguage as 'en' | 'fr'
    })

    // Send the email
    const emailResult = await sendEmail({
      to: email,
      subject,
      html,
      text
    })

    if (!emailResult.success) {
      console.warn(
        '[Invitation Email] Failed to send email:',
        emailResult.error
      )
      return {
        success: false,
        error: emailResult.error || 'Failed to send invitation email'
      }
    }

    console.log(
      '[Invitation Email] Invitation email sent successfully to:',
      email
    )

    return {
      success: true
    }
  } catch (error: any) {
    console.error('[Invitation Email] Error sending invitation email:', error)
    return {
      success: false,
      error: error?.message || 'Failed to send invitation email'
    }
  }
}

/**
 * Generate a new temporary password for a client and send it via email
 * 
 * This function:
 * 1. Generates a secure, readable temporary password
 * 2. Updates the client's auth account with the new password
 * 3. Sends an invitation email with the temporary password
 * 
 * @param options - Client information and preferences
 * @returns Result indicating success/failure and the generated password
 */
export async function sendTempPasswordToClient(
  options: SendTempPasswordOptions
): Promise<SendTempPasswordResult> {
  try {
    const {
      clientId,
      email,
      firstName,
      lastName,
      preferredLanguage = 'en'
    } = options

    // Generate a secure, readable temporary password
    const tempPassword = generateReadablePassword()

    // Get admin client to update auth user
    const supabase = createServerSupabaseAdminClient()

    // Update the auth user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      clientId,
      {
        password: tempPassword,
        user_metadata: {
          requires_password_change: true
        }
      }
    )

    if (updateError) {
      console.error(
        '[Temp Password] Failed to update auth user password:',
        updateError
      )
      return {
        success: false,
        error: `Failed to update password: ${updateError.message}`
      }
    }

    // Send invitation email using the reusable function
    const emailResult = await sendInvitationEmail({
      email,
      firstName,
      lastName,
      temporaryPassword: tempPassword,
      preferredLanguage: preferredLanguage as 'en' | 'fr'
    })

    if (!emailResult.success) {
      // Password was updated, but email failed - still return success with warning
      return {
        success: true,
        temporaryPassword: tempPassword,
        error: `Password updated but email failed: ${emailResult.error}`
      }
    }

    console.log(
      '[Temp Password] Temporary password sent successfully to:',
      email
    )

    return {
      success: true,
      temporaryPassword: tempPassword
    }
  } catch (error: any) {
    console.error('[Temp Password] Error sending temp password:', error)
    return {
      success: false,
      error: error?.message || 'Failed to send temporary password'
    }
  }
}

