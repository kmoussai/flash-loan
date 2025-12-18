/**
 * Handler for document_request_created notification events
 */

import type { NotificationHandler } from './types'
import type { NotificationEvent } from '../events/types'
import { getEmailProvider } from '../providers'
import { generateDocumentRequestEmail } from '@/src/lib/email/templates/document-request'
import { createNotification } from '@/src/lib/supabase/notification-helpers'
import { getAppUrl } from '@/src/lib/config'

export const handleDocumentRequestCreated: NotificationHandler = async (
  event: NotificationEvent
) => {
  try {
    const metadata = event.metadata as any
    const requestId = metadata.requestId || metadata.request_id
    const loanApplicationId =
      metadata.loanApplicationId || metadata.loan_application_id
    const requestedItems = metadata.requestedItems || metadata.requested_items || []
    const expiresAt = metadata.expiresAt || metadata.expires_at

    if (!requestId || !requestedItems || requestedItems.length === 0) {
      return {
        success: false,
        error: 'Missing required metadata: requestId and requestedItems',
      }
    }

    // Use uploadLink from metadata if provided, otherwise build dashboard link
    const preferredLanguage = event.recipient.preferredLanguage || 'en'
    const uploadLink = metadata.uploadLink || `${getAppUrl()}/${preferredLanguage}/client/dashboard?section=documents`

    // Generate email content
    const emailContent = generateDocumentRequestEmail({
      applicantName: event.recipient.firstName || 'Applicant',
      requestedItems: requestedItems.map((item: any) => ({
        kind: item.kind || 'other',
        label: item.label || item.name || 'Unknown item',
      })),
      uploadLink,
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
        text: emailContent.html.replace(/<[^>]*>/g, ''), // Generate text from HTML
        tags: ['document-request', 'loan-application'],
        metadata: {
          requestId,
          loanApplicationId: loanApplicationId || '',
          eventId: event.id,
        },
      })

      if (!emailResult.success) {
        console.error(
          '[handleDocumentRequestCreated] Failed to send email:',
          emailResult.error
        )
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
          message: `Please provide the requested documents and information for your loan application.`,
          category: 'document_request_created',
          metadata: {
            type: 'request_prompt',
            requestIds: [requestId],
            groupId: null,
            loanApplicationId: loanApplicationId || null,
            requestKinds: requestedItems.map((item: any) => item.kind || 'other'),
            expiresAt: expiresAt || null,
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
    console.error(
      '[handleDocumentRequestCreated] Error processing event:',
      error
    )
    return {
      success: false,
      error: error?.message || 'Failed to process document_request_created event',
    }
  }
}

