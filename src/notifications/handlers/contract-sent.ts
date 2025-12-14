/**
 * Handler for contract_sent notification events
 */

import type { NotificationHandler } from './types'
import type { NotificationEvent } from '../events/types'
import { getEmailProvider } from '../providers'
import { generateContractSentEmail } from '../emails/templates/contract-sent'
import { createNotification } from '@/src/lib/supabase/notification-helpers'
import { getAppUrl } from '@/src/lib/config'

export const handleContractSent: NotificationHandler = async (
  event: NotificationEvent
) => {
  try {
    const metadata = event.metadata as any
    const contractId = metadata.contractId || metadata.contract_id
    const loanApplicationId =
      metadata.loanApplicationId || metadata.loan_application_id
    const contractNumber = metadata.contractNumber || metadata.contract_number
    const loanAmount = metadata.loanAmount || metadata.loan_amount
    const expiresAt = metadata.expiresAt || metadata.expires_at

    if (!contractId || !loanApplicationId) {
      return {
        success: false,
        error: 'Missing required metadata: contractId and loanApplicationId',
      }
    }

    const dashboardUrl = `${getAppUrl()}/client/dashboard`

    // Generate email content
    const emailContent = generateContractSentEmail({
      firstName: event.recipient.firstName || '',
      lastName: event.recipient.lastName || '',
      email: event.recipient.email,
      contractNumber: contractNumber?.toString() || null,
      loanAmount: loanAmount ? parseFloat(loanAmount.toString()) : null,
      dashboardUrl,
      preferredLanguage: event.recipient.preferredLanguage || 'en',
      expiresAt: expiresAt || null,
    })

    let emailResult: any = undefined

    // Send email if requested
    if (event.sendEmail) {
      const provider = await getEmailProvider()
      emailResult = await provider.sendEmail({
        to: {
          email: event.recipient.email,
          name: event.recipient.firstName
            ? `${event.recipient.firstName} ${event.recipient.lastName || ''}`.trim()
            : undefined,
        },
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        tags: ['contract-sent', 'loan-application'],
        metadata: {
          contractId,
          loanApplicationId,
          eventId: event.id,
        },
      })

      if (!emailResult.success) {
        console.error(
          '[handleContractSent] Failed to send email:',
          emailResult.error
        )
        // Continue to create notification even if email fails
      }
    }

    // Create database notification if requested
    let notificationId: string | undefined = undefined
    if (event.createNotification) {
      const notificationResult = await createNotification(
        {
          recipientId: event.recipient.id,
          recipientType: event.recipient.type,
          title: emailContent.subject,
          message: `Your loan contract is ready to sign. Contract #${contractNumber || 'N/A'}`,
          category: 'contract_sent',
          metadata: {
            type: 'contract_event',
            contractId,
            loanApplicationId,
            contractNumber,
            event: 'sent',
            sentAt: event.timestamp,
          },
        },
        { useAdminClient: true }
      )

      if (notificationResult.success && notificationResult.data) {
        notificationId = notificationResult.data.id
      }
    }

    return {
      success: true,
      emailResult,
      notificationId,
    }
  } catch (error: any) {
    console.error('[handleContractSent] Error processing event:', error)
    return {
      success: false,
      error: error?.message || 'Failed to process contract_sent event',
    }
  }
}

