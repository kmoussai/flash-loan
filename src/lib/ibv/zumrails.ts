export type ZumrailsVerificationStatus = 'pending' | 'verified' | 'failed' | 'cancelled'

export interface ZumrailsConnection {
  customerId: string
  token?: string
  refreshToken?: string
  connectToken?: string
  verificationStatus?: ZumrailsVerificationStatus
}

export const ZUMRAILS_STORAGE_KEY = 'zumrailsConnection'
export const ZUMRAILS_ORIGIN_REGEX = /https:\/\/.*\.zumrails\.com/

// Base URL for Zumrails connector (sandbox)
export const ZUMRAILS_CONNECTOR_BASE_URL = 'https://connector-sandbox.aggregation.zumrails.com'

// Get iframe config with customer ID
export function getZumrailsIframeConfig(customerId?: string, testInstitution: boolean = true) {
  if (!customerId) {
    return {
      src: '',
      title: 'Zumrails Verification',
      allow: 'camera; microphone; geolocation',
      className: 'zumrails h-[500px] w-full sm:h-[600px] md:h-[650px]'
    }
  }

  const params = new URLSearchParams({
    customerid: customerId,
    ...(testInstitution && { testinstitution: 'true' })
  })

  const src = `${ZUMRAILS_CONNECTOR_BASE_URL}/success?${params.toString()}`

  return {
    src,
    title: 'Zumrails Verification',
    allow: 'camera; microphone; geolocation',
    className: 'zumrails h-[500px] w-full sm:h-[600px] md:h-[650px]'
  }
}

// Initialize Zumrails session and get connect token
export async function initializeZumrailsSession(userData?: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}): Promise<{ connectToken: string; customerId: string; iframeUrl?: string }> {
  try {
    console.log('[Zumrails] Initializing session with user data:', userData)
    
    // Call backend API endpoint to initialize
    const response = await fetch('/api/zumrails/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    
    if (response.ok) {
      const data = await response.json()
      if (!data?.connectToken || !data?.customerId) {
        throw new Error('Missing connectToken or customerId in response')
      }
      
      const iframeUrl = data.iframeUrl || getZumrailsIframeConfig(data.customerId).src
      
      return { 
        connectToken: data.connectToken, 
        customerId: data.customerId,
        iframeUrl 
      }
    }
    
    const text = await response.text().catch(() => '')
    throw new Error(text || `HTTP ${response.status}`)
  } catch (error) {
    console.error('[Zumrails] Error initializing session:', error)
    throw error
  }
}

export function restoreZumrailsConnection(): ZumrailsConnection | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(ZUMRAILS_STORAGE_KEY)
  if (!stored) return null
  try {
    const connection = JSON.parse(stored)
    if (connection?.customerId) {
      return {
        customerId: connection.customerId,
        token: connection.token,
        refreshToken: connection.refreshToken,
        connectToken: connection.connectToken,
        verificationStatus: (connection.verificationStatus as ZumrailsVerificationStatus) || 'pending'
      }
    }
    return null
  } catch {
    return null
  }
}

export function persistZumrailsConnection(connection: ZumrailsConnection): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    ZUMRAILS_STORAGE_KEY,
    JSON.stringify({ ...connection, connectedAt: new Date().toISOString() })
  )
}

type ZumrailsHandlers = {
  onSuccess: (connection: ZumrailsConnection) => void
  onError?: (data?: unknown) => void
  onCancel?: () => void
}

// Add Zumrails event listener for postMessage from iframe
export function addZumrailsListener(enabled: boolean, handlers: ZumrailsHandlers): () => void {
  if (typeof window === 'undefined' || !enabled) return () => {}

  const listener = (event: MessageEvent) => {
    // Check if message is from Zumrails connector
    const isZumrailsOrigin = event.origin.match(ZUMRAILS_ORIGIN_REGEX)
    const isOwnOrigin = typeof window !== 'undefined' && event.origin === window.location.origin
    
    if (isZumrailsOrigin || isOwnOrigin) {
      try {
        console.log('[Zumrails] message received', {
          origin: event.origin,
          data: event.data
        })
      } catch {
        console.log('[Zumrails] message received (unable to serialize data)')
      }
      
      const data = event.data
      
      // Handle Zumrails-specific message format with 'step' field
      if (typeof data === 'object' && data?.step) {
        const step = data.step as string
        const stepData = data.data || {}
        
        console.log(`[Zumrails] Event: ${step}`, stepData)
        
        switch (step) {
          case 'CONNECTIONSUCCESSFULLYCOMPLETED':
            // Extract customer ID and other identifiers from the data
            const customerId = 
              stepData.customerId ||
              stepData.userid ||
              stepData.requestid ||
              extractCustomerIdFromUrl() ||
              `zumrails-${Date.now()}`
            
            const connection: ZumrailsConnection = {
              customerId,
              verificationStatus: 'verified',
              // Store additional identifiers if available
              ...(stepData.requestid && { token: stepData.requestid }),
              ...(stepData.cardid && { connectToken: stepData.cardid })
            }
            
            handlers.onSuccess(connection)
            break
            
          case 'GENERICERROR':
            handlers.onError && handlers.onError(stepData || data)
            break
            
          case 'CONNECTORCLOSED':
            console.log('[Zumrails] Connector closed by user', stepData)
            handlers.onCancel && handlers.onCancel()
            break
            
          // Informational events - log but don't trigger handlers
          case 'CONNECTORLOADED':
          case 'CONSENTACCEPTED':
          case 'INSTITUTIONSELECTED':
          case 'AUTHENTICATEINITIATED':
          case 'ACCOUNTSELECTORFOOTERCLICKED':
          case 'SECURITYQUESTIONPROMPTED':
          case 'SECURITYQUESTIONANSWERINITIATED':
          case 'AUTHENTICATECOMPLETED':
          case 'GETINFORMATIONINITIATED':
          case 'GETINFORMATIONCOMPLETED':
            // Log informational events for debugging
            console.log(`[Zumrails] ${step}:`, stepData)
            break
            
          default:
            console.log(`[Zumrails] Unknown event: ${step}`, stepData)
        }
        return
      }
      
      // Fallback: Handle legacy success/error/cancel messages (for backward compatibility)
      const messageData = typeof data === 'object' && data?.data ? data.data : data
      
      const isSuccess =
        (typeof data === 'string' && data === 'success') ||
        (typeof data === 'object' && data?.success === true) ||
        (typeof messageData === 'object' && (messageData?.status === 'success' || messageData?.status === 'verified'))
      
      const isError =
        (typeof data === 'string' && (data === 'error' || data === 'failed')) ||
        (typeof data === 'object' && data?.success === false) ||
        (typeof messageData === 'object' && (messageData?.status === 'failed' || messageData?.status === 'error'))
      
      const isCancelled =
        (typeof data === 'string' && data === 'cancelled') ||
        (typeof messageData === 'object' && messageData?.status === 'cancelled')

      if (isSuccess) {
        // Extract customer ID from URL or message data
        const customerId = 
          (typeof messageData === 'object' && messageData?.customerId) ||
          (typeof data === 'object' && data?.customerId) ||
          extractCustomerIdFromUrl()
        
        const connection: ZumrailsConnection = {
          customerId: customerId || `zumrails-${Date.now()}`,
          verificationStatus: 'verified'
        }
        
        handlers.onSuccess(connection)
      } else if (isError) {
        handlers.onError && handlers.onError(messageData || event.data)
      } else if (isCancelled) {
        handlers.onCancel && handlers.onCancel()
      }
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

// Helper function to extract customer ID from URL
function extractCustomerIdFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('customerid') || undefined
}

