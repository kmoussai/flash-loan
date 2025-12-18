import { useState, useEffect, useRef } from 'react'

export function useIbvVerification() {
  const [showIBV, setShowIBV] = useState(false)
  const [ibvVerified, setIbvVerified] = useState(false)
  const [ibvStep, setIbvStep] = useState(1)
  const [isVerifying, setIsVerifying] = useState(false)
  const [zumrailsRequestId, setZumrailsRequestId] = useState<string | null>(null)
  const [ibvSubmissionOverride, setIbvSubmissionOverride] = useState<'pending' | 'failed' | null>(null)
  const [lastVerifiedSubmissionRequestId, setLastVerifiedSubmissionRequestId] = useState<string | null>(null)
  const [serverIbvConnectToken, setServerIbvConnectToken] = useState<string | null>(null)
  const verifiedFetchInFlight = useRef(false)

  // On page load: reset IBV state
  useEffect(() => {
    // Reset IBV-related state
    setZumrailsRequestId(null)
    setIbvVerified(false)
    setShowIBV(false)
    setIbvStep(1)
    setIsVerifying(false)
    setIbvSubmissionOverride(null)
  }, [])

  const resetIbvState = () => {
    setZumrailsRequestId(null)
    setIbvVerified(false)
    setIbvSubmissionOverride(null)
    setShowIBV(false)
    setIbvStep(1)
    setIsVerifying(false)
  }

  return {
    showIBV,
    setShowIBV,
    ibvVerified,
    setIbvVerified,
    ibvStep,
    setIbvStep,
    isVerifying,
    setIsVerifying,
    zumrailsRequestId,
    setZumrailsRequestId,
    ibvSubmissionOverride,
    setIbvSubmissionOverride,
    lastVerifiedSubmissionRequestId,
    setLastVerifiedSubmissionRequestId,
    serverIbvConnectToken,
    setServerIbvConnectToken,
    verifiedFetchInFlight,
    resetIbvState
  }
}

