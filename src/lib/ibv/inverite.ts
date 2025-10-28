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
export const INVERITE_IFRAME_BASE_URL = 'https://www.inverite.com/customer/v2/web/start'

// Get iframe config with dynamic request_GUID
export function getInveriteIframeConfig(requestGuid?: string) {
  const guid = requestGuid || '445AF552-D436-4E67-AB58-DEE546FE35FA' // Fallback for testing
  
  return {
    src: `${INVERITE_IFRAME_BASE_URL}/${guid}/0/modern&request_GUID=${guid}`,
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
}): Promise<string> {
  try {
    console.log('[Inverite] Initializing session with user data:', userData)
    console.log('[Inverite] TODO: Implement API call to get request_GUID from Inverite')
    
    // Try to fetch from backend API endpoint
    const response = await fetch('/api/inverite/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.requestGuid || data.guid
    }
    
    // Fallback: generate a random GUID
    return generateGuid()
  } catch (error) {
    console.error('[Inverite] Error initializing session:', error)
    return generateGuid()
  }
}

function generateGuid(): string {
  return `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`
}

function randomHex(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('')
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
    // Check if message is from Inverite
    if (event.origin.match(INVERITE_ORIGIN_REGEX)) {
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
      if (event.data === 'success') {
        // Extract session ID and request GUID from URL if available
        const sessionId = `inverite-${Date.now()}`
        const requestGuid = extractGuidFromIframe()
        
        const connection: InveriteConnection = {
          sessionId,
          requestGuid,
          verificationStatus: 'verified'
        }
        
        handlers.onSuccess(connection)
      } else if (event.data === 'error' || event.data === 'failed') {
        handlers.onError && handlers.onError(event.data)
      } else if (event.data === 'cancelled') {
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
  const match = INVERITE_IFRAME_CONFIG.src.match(/GUID=([A-F0-9-]+)/)
  return match ? match[1] : undefined
}


