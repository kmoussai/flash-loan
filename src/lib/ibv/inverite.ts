export type InveriteVerificationStatus = 'pending' | 'verified' | 'failed' | 'cancelled'

export interface InveriteConnection {
  sessionId: string
  applicantId?: string
  verificationStatus?: InveriteVerificationStatus
  requestGuid?: string
}

export const INVERITE_STORAGE_KEY = 'inveriteConnection'

export const INVERITE_ORIGIN_REGEX = /https:\/\/(sandbox|live|www)\.inverite\.com/

// Base URL for Inverite iframe
export const INVERITE_IFRAME_BASE_URL = 'https://sandbox.inverite.com/customer/v2/web/start'

// Get iframe config with dynamic request_GUID
export function getInveriteIframeConfig(requestGuid?: string, iframeUrl?: string) {
  const src = iframeUrl || (requestGuid ? `${INVERITE_IFRAME_BASE_URL}/${requestGuid}/0/modern` : '')
  return {
    src,
    title: 'Inverite Verification',
    allow: 'camera; microphone; geolocation',
    className: 'inverite h-[500px] w-full sm:h-[600px] md:h-[650px]'
  }
}

// Legacy static config (for backward compatibility)
export const INVERITE_IFRAME_CONFIG = getInveriteIframeConfig()

// Initialize Inverite session and get request_GUID
export async function initializeInveriteSession(userData?: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  redirectParams?: Record<string, string> // Additional params for redirect URL
}): Promise<{ requestGuid: string; iframeUrl?: string }> {
  try {
    console.log('[Inverite] Initializing session with user data:', userData)
    
    // Try to fetch from backend API endpoint
    const response = await fetch('/api/inverite/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    
    if (response.ok) {
      const data = await response.json()
      if (!data?.requestGuid) {
        throw new Error('Missing requestGuid in response')
      }
      return { requestGuid: data.requestGuid, iframeUrl: data.iframeUrl }
    }
    
    const text = await response.text().catch(() => '')
    throw new Error(text || `HTTP ${response.status}`)
  } catch (error) {
    console.error('[Inverite] Error initializing session:', error)
    throw error
  }
}

export function restoreInveriteConnection(): InveriteConnection | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(INVERITE_STORAGE_KEY)
  if (!stored) return null
  try {
    const connection = JSON.parse(stored)
    if (connection?.sessionId) {
      return {
        sessionId: connection.sessionId,
        applicantId: connection.applicantId,
        verificationStatus: (connection.verificationStatus as InveriteVerificationStatus) || 'verified'
      }
    }
    return null
  } catch {
    return null
  }
}


export function persistInveriteConnection(connection: InveriteConnection): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    INVERITE_STORAGE_KEY,
    JSON.stringify({ ...connection, connectedAt: new Date().toISOString() })
  )
}

type InveriteHandlers = {
  onSuccess: (connection: InveriteConnection) => void
  onError?: (data?: unknown) => void
  onCancel?: () => void
}

// Add Inverite event listener
export function addInveriteListener(enabled: boolean, handlers: InveriteHandlers): () => void {
  if (typeof window === 'undefined' || !enabled) return () => {}

  const listener = (event: MessageEvent) => {
    // Check if message is from Inverite or our own callback page
    const isInveriteOrigin = event.origin.match(INVERITE_ORIGIN_REGEX)
    const isOwnOrigin = typeof window !== 'undefined' && event.origin === window.location.origin
    
    if (isInveriteOrigin || isOwnOrigin) {
      // Log raw event data for debugging/inspection
      try {
        // Avoid logging huge objects by extracting key parts
        // eslint-disable-next-line no-console
        console.log('[Inverite] message received', {
          origin: event.origin,
          data: event.data
        })
      } catch {
        // eslint-disable-next-line no-console
        console.log('[Inverite] message received (unable to serialize data)')
      }
      const data = event.data

      // Handle new message format with success and data fields
      const messageData = typeof data === 'object' && data?.data ? data.data : data
      const isSuccess =
        (typeof data === 'string' && data === 'success') ||
        (typeof data === 'object' && data?.success === true) ||
        (typeof messageData === 'object' && (messageData?.task_status === 'success' || messageData?.status === 'success'))

      const isError =
        (typeof data === 'string' && (data === 'error' || data === 'failed')) ||
        (typeof data === 'object' && (data?.success === false)) ||
        (typeof messageData === 'object' && (messageData?.task_status === 'failed' || messageData?.status === 'failed' || messageData?.status === 'error'))

      const isCancelled =
        (typeof data === 'string' && data === 'cancelled') ||
        (typeof messageData === 'object' && (messageData?.task_status === 'cancelled' || messageData?.status === 'cancelled'))

      if (isSuccess) {
        // Extract session ID and request GUID from URL if available, or from message data
        const sessionId = `inverite-${Date.now()}`
        const requestGuid = 
          (typeof messageData === 'object' && messageData?.request_guid) ||
          (typeof data === 'object' && data?.request_guid) || 
          extractGuidFromIframe()
        
        const connection: InveriteConnection = {
          sessionId,
          requestGuid,
          verificationStatus: 'verified'
        }
        
        handlers.onSuccess(connection)
      } else if (isError) {
        handlers.onError && handlers.onError(messageData || event.data)
      } else if (isCancelled) {
        handlers.onCancel && handlers.onCancel()
      }
      return
    }
  }

  // Add event listener
  if (window.addEventListener) {
    window.addEventListener('message', listener, false)
  } else {
    // Fallback for older browsers
    (window as any).attachEvent('onmessage', listener)
  }

  // Return cleanup function
  return () => {
    if (window.removeEventListener) {
      window.removeEventListener('message', listener, false)
    } else {
      (window as any).detachEvent('onmessage', listener)
    }
  }
}

// Helper function to extract GUID from iframe URL or extract from current URL
function extractGuidFromIframe(): string | undefined {
  if (typeof window === 'undefined') return undefined
  // The GUID is in the iframe src: 0DC61938-CB22-4235-A4CD-3AF0F3DD5252
  // Extract from INVERITE_IFRAME_CONFIG.src or from current page URL
  const match = INVERITE_IFRAME_CONFIG.src.match(/[A-F0-9-]{36}/)
  return match ? match[1] : undefined
}


