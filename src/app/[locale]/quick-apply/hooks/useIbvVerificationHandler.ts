import { useEffect } from 'react'

interface UseIbvVerificationHandlerOptions {
  ibvVerified: boolean
  applicationId: string | null
  zumrailsRequestId: string | null
  lastVerifiedSubmissionRequestId: string | null
  hasSubmittedApplication: boolean
  isSubmitted: boolean
  verifiedFetchInFlight: React.MutableRefObject<boolean>
  setLastVerifiedSubmissionRequestId: (requestId: string | null) => void
  setIsSubmitted: (submitted: boolean) => void
}

export function useIbvVerificationHandler({
  ibvVerified,
  applicationId,
  zumrailsRequestId,
  lastVerifiedSubmissionRequestId,
  hasSubmittedApplication,
  isSubmitted,
  verifiedFetchInFlight,
  setLastVerifiedSubmissionRequestId,
  setIsSubmitted
}: UseIbvVerificationHandlerOptions) {
  useEffect(() => {
    // For Zumrails: Data fetching is handled by webhook when Insights "Completed" event is received
    // Just mark as submitted when verification is complete
    if (!ibvVerified) return
    if (!applicationId) return
    if (!zumrailsRequestId) return
    if (verifiedFetchInFlight.current) return
    if (lastVerifiedSubmissionRequestId === zumrailsRequestId) {
      if (hasSubmittedApplication && !isSubmitted) {
        setIsSubmitted(true)
      }
      return
    }

    // Zumrails: Data fetching is handled by webhook, just mark as submitted
    setLastVerifiedSubmissionRequestId(zumrailsRequestId)
    if (hasSubmittedApplication && !isSubmitted) {
      setIsSubmitted(true)
    }
  }, [
    ibvVerified,
    applicationId,
    zumrailsRequestId,
    lastVerifiedSubmissionRequestId,
    hasSubmittedApplication,
    isSubmitted,
    verifiedFetchInFlight,
    setLastVerifiedSubmissionRequestId,
    setIsSubmitted
  ])
}

import type { ZumrailsConnection } from '@/src/lib/ibv/zumrails'

export interface IbvVerificationCallbacks {
  onVerificationSuccess: (connection: ZumrailsConnection) => void
  onVerificationError: () => void
  onVerificationCancel: () => void
}

export function createIbvVerificationCallbacks(
  options: {
    applicationId: string | null
    setZumrailsRequestId: (requestId: string | null) => void
    setIbvVerified: (verified: boolean) => void
    setIbvSubmissionOverride: (override: 'pending' | 'failed' | null) => void
    setIsVerifying: (verifying: boolean) => void
    setIsSubmitted: (submitted: boolean) => void
    hasSubmittedApplication: boolean
  }
): IbvVerificationCallbacks {
  const onVerificationSuccess: IbvVerificationCallbacks['onVerificationSuccess'] = (connection) => {
    const zumrailsConn = connection

    // Update request ID and connection data in database
    if (options.applicationId && zumrailsConn.requestId) {
      fetch('/api/zumrails/update-request-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: options.applicationId,
          requestId: zumrailsConn.requestId,
          cardId: zumrailsConn.cardId,
          userId: zumrailsConn.userId
        })
      }).catch(error => {
        console.error('[Zumrails] Failed to update request ID:', error)
      })
    }

    // Store request ID
    if (zumrailsConn.requestId) {
      options.setZumrailsRequestId(zumrailsConn.requestId)
    }

    options.setIbvVerified(true)
    options.setIbvSubmissionOverride(null)
    options.setIsVerifying(false)
    // Show success step immediately after verification success
    if (options.hasSubmittedApplication || options.applicationId) {
      options.setIsSubmitted(true)
    }
  }

  const onVerificationError: IbvVerificationCallbacks['onVerificationError'] = () => {
    options.setIbvVerified(false)
    options.setIsVerifying(false)
    options.setIbvSubmissionOverride('failed')
    console.log('Bank verification failed. Please try again.')
  }

  const onVerificationCancel: IbvVerificationCallbacks['onVerificationCancel'] = () => {
    options.setIsVerifying(false)
    options.setIbvVerified(false)
    options.setIbvSubmissionOverride(null)
  }

  return {
    onVerificationSuccess,
    onVerificationError,
    onVerificationCancel
  }
}

