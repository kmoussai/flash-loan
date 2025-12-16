/**
 * Zum Rails Integration Helpers
 * 
 * To use Zum Rails Connect with token (recommended approach):
 * 
 * 1. Get a connect token from your backend:
 *    const { connectToken } = await initializeZumrailsSession({ firstName, lastName, email })
 * 
 * 2. In your React component, create a container div and initialize the SDK:
 * 
 *    useEffect(() => {
 *      if (connectToken) {
 *        initializeZumrailsSdk(connectToken, 'zumrails-container', {
 *          onSuccess: (data) => {
 *            // Handle success - data contains userId, requestId, etc.
 *          },
 *          onError: (error) => {
 *            // Handle error
 *          }
 *        })
 *      }
 *    }, [connectToken])
 * 
 * 3. In your JSX, add the container:
 *    <div id="zumrails-container" className="h-[600px] w-full"></div>
 * 
 * The SDK will automatically create and manage the iframe with the token.
 */

export type ZumrailsVerificationStatus =
  | 'pending'
  | 'verified'
  | 'failed'
  | 'cancelled'

export interface ZumrailsConnection {
  userId?: string // userid from CONNECTIONSUCCESSFULLYCOMPLETED
  requestId: string // Primary identifier - requestid from CONNECTIONSUCCESSFULLYCOMPLETED (required)
  clientUserId?: string // clientuserid from CONNECTIONSUCCESSFULLYCOMPLETED

  cardId?: string // cardid from CONNECTIONSUCCESSFULLYCOMPLETED
  customerId?: string // Optional - legacy/compatibility (can be userId)
  token?: string // Legacy - kept for backward compatibility (maps to requestId)
  refreshToken?: string
  connectToken?: string
  verificationStatus?: ZumrailsVerificationStatus
}

export const ZUMRAILS_STORAGE_KEY = 'zumrailsConnection'
export const ZUMRAILS_ORIGIN_REGEX = /https:\/\/.*\.zumrails\.com/

// Base URL for Zumrails connector (sandbox)
export const ZUMRAILS_CONNECTOR_BASE_URL =
  'https://connector-sandbox.aggregation.zumrails.com'

// Zum Rails SDK URLs (Connector SDK for Data Aggregation)
// Sandbox: https://cdn.aggregation.zumrails.com/sandbox/connector.js
// Production: https://cdn.aggregation.zumrails.com/production/connector.js
export const ZUMRAILS_SDK_SANDBOX_URL = 
  process.env.NEXT_PUBLIC_ZUMRAILS_SDK_URL || 
  'https://sandbox-cdn.zumrails.com/sandbox/zumsdk.js'
export const ZUMRAILS_SDK_PRODUCTION_URL = 
  process.env.NEXT_PUBLIC_ZUMRAILS_SDK_URL || 
  'https://cdn.zumrails.com/production/zumsdk.js'

// Get the appropriate SDK URL based on environment
export function getZumrailsSdkUrl(): string {
  const isProduction = process.env.NEXT_PUBLIC_ZUMRAILS_ENV === 'production'
  return isProduction ? ZUMRAILS_SDK_PRODUCTION_URL : ZUMRAILS_SDK_SANDBOX_URL
}

// Get iframe config with customer ID
export function getZumrailsIframeConfig(
  customerId?: string,
  testInstitution: boolean = true
) {
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
  addressCity?: string
  addressLine1?: string
  addressProvince?: string
  addressPostalCode?: string
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

      const iframeUrl =
        data.iframeUrl || getZumrailsIframeConfig(data.customerId).src

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
    // requestId is required - check if it exists (new format) or use token/legacy fields
    const requestId =
      connection?.requestId || connection?.request_id || connection?.token
    if (requestId) {
      return {
        requestId,
        cardId: connection.cardId || connection.card_id,
        userId: connection.userId || connection.user_id,
        customerId:
          connection.customerId ||
          connection.customer_id ||
          connection.userId ||
          connection.user_id,
        token: connection.token || requestId,
        refreshToken: connection.refreshToken || connection.refresh_token,
        connectToken:
          connection.connectToken ||
          connection.connect_token ||
          connection.cardId ||
          connection.card_id,
        verificationStatus:
          (connection.verificationStatus as ZumrailsVerificationStatus) ||
          'pending'
      }
    }
    return null
  } catch {
    return null
  }
}

export function persistZumrailsConnection(
  connection: ZumrailsConnection
): void {
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
export function addZumrailsListener(
  enabled: boolean,
  handlers: ZumrailsHandlers
): () => void {
  if (typeof window === 'undefined' || !enabled) return () => {}

  const listener = (event: MessageEvent) => {
    // Check if message is from Zumrails connector
    const isZumrailsOrigin = event.origin.match(ZUMRAILS_ORIGIN_REGEX)
    const isOwnOrigin =
      typeof window !== 'undefined' && event.origin === window.location.origin

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
            // Extract identifiers from the Zumrails response
            // Response format: { requestid, cardid, userid }
            const requestId = stepData.requestid
            const cardId = stepData.cardid
            const userId = stepData.userid

            // requestid is required - this is what we use to match webhooks
            if (!requestId) {
              console.error(
                '[Zumrails] CONNECTIONSUCCESSFULLYCOMPLETED missing requestid',
                stepData
              )
              handlers.onError &&
                handlers.onError(
                  new Error('Missing requestid in connection response')
                )
              break
            }

            const connection: ZumrailsConnection = {
              requestId, // Primary identifier for webhook matching
              verificationStatus: 'verified',
              ...(cardId && { cardId }),
              ...(userId && { userId }),
              // Legacy fields for backward compatibility
              ...(userId && { customerId: userId }), // userid can be used as customerId
              token: requestId, // token maps to requestId for compatibility
              ...(cardId && { connectToken: cardId })
            }

            console.log('[Zumrails] Connection completed', {
              requestId,
              cardId,
              userId
            })

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
      const messageData =
        typeof data === 'object' && data?.data ? data.data : data

      const isSuccess =
        (typeof data === 'string' && data === 'success') ||
        (typeof data === 'object' && data?.success === true) ||
        (typeof messageData === 'object' &&
          (messageData?.status === 'success' ||
            messageData?.status === 'verified'))

      const isError =
        (typeof data === 'string' && (data === 'error' || data === 'failed')) ||
        (typeof data === 'object' && data?.success === false) ||
        (typeof messageData === 'object' &&
          (messageData?.status === 'failed' || messageData?.status === 'error'))

      const isCancelled =
        (typeof data === 'string' && data === 'cancelled') ||
        (typeof messageData === 'object' && messageData?.status === 'cancelled')

      if (isSuccess) {
        // Extract identifiers from legacy success message
        const requestId =
          (typeof messageData === 'object' &&
            (messageData?.requestid || messageData?.requestId)) ||
          (typeof data === 'object' && (data?.requestid || data?.requestId)) ||
          `zumrails-${Date.now()}` // Fallback if no requestid

        const cardId =
          (typeof messageData === 'object' &&
            (messageData?.cardid || messageData?.cardId)) ||
          (typeof data === 'object' && (data?.cardid || data?.cardId))

        const userId =
          (typeof messageData === 'object' &&
            (messageData?.userid || messageData?.userId)) ||
          (typeof data === 'object' && (data?.userid || data?.userId))

        const connection: ZumrailsConnection = {
          requestId,
          verificationStatus: 'verified',
          ...(cardId && { cardId }),
          ...(userId && { userId, customerId: userId }),
          token: requestId
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
    ;(window as any).attachEvent('onmessage', listener)
  }

  // Return cleanup function
  return () => {
    if (window.removeEventListener) {
      window.removeEventListener('message', listener, false)
    } else {
      ;(window as any).detachEvent('onmessage', listener)
    }
  }
}

// Helper function to extract customer ID from URL
function extractCustomerIdFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('customerid') || undefined
}

/**
 * Load Zum Rails SDK script dynamically
 */
export function loadZumrailsSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('SDK can only be loaded in browser'))
      return
    }

    // Check if SDK is already loaded
    // The SDK exposes itself as ZumRailsSDK (per documentation)
    if ((window as any).ZumRailsSDK) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = getZumrailsSdkUrl()
    script.id = 'ZumRailsSDK' // Match the ID from the documentation
    script.async = true
    script.type = 'text/javascript'
    script.onload = () => {
      // Check for ZumRailsSDK (per documentation)
      if ((window as any).ZumRailsSDK) {
        resolve()
      } else {
        reject(new Error('Zum Rails SDK failed to load - ZumRailsSDK global object not found'))
      }
    }
    script.onerror = () => {
      reject(new Error('Failed to load Zum Rails SDK'))
    }
    document.head.appendChild(script)
  })
}

/**
 * Initialize Zum Rails Connector SDK with token
 * This will create and manage the iframe automatically
 * @param connectToken - The token received from /api/aggregationconnector/createtoken
 * @param containerId - Optional: The ID of the container element where the iframe should be rendered.
 *                      If not provided, the SDK will create its own container.
 * @param callbacks - Event callbacks for SDK events
 * @param options - Optional configuration options for the connector
 */
export async function initializeZumrailsSdk(
  connectToken: string,
  containerId?: string,
  callbacks?: {
    onLoad?: () => void
    onSuccess?: (connection: ZumrailsConnection) => void
    onError?: (error: string) => void
    onConnectorClosed?: () => void
    onStepChanged?: (data: { step: string; data: any }) => void
  },
  options?: {
    accountselector?: boolean
    testinstitution?: boolean
    backbutton?: boolean
    closebutton?: boolean
    extrafield1?: string
    extrafield2?: string
    cardidforreconnect?: string
  }
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('SDK can only be initialized in browser')
  }

  // Load SDK if not already loaded
  await loadZumrailsSdk()

  // Check for SDK global variable (ZumRailsSDK per documentation)
  const ZumRailsSDK = (window as any).ZumRailsSDK
  if (!ZumRailsSDK) {
    throw new Error('Zum Rails SDK not available - ZumRailsSDK global object not found')
  }

  // Validate token before initializing
  if (!connectToken || typeof connectToken !== 'string' || connectToken.trim().length === 0) {
    throw new Error('Invalid connectToken: token must be a non-empty string')
  }

  // Build initialization config according to documentation
  // Documentation: https://docs.zumrails.com/data-aggregation/how-it-works
  const trimmedToken = connectToken.trim()
  
  // Log token details for debugging (but don't log full token in production)
  console.log('[Zumrails SDK] Initializing with token:', {
    tokenLength: trimmedToken.length,
    tokenPreview: trimmedToken.substring(0, 50) + '...',
    tokenEnd: '...' + trimmedToken.substring(trimmedToken.length - 20),
    tokenStartsWith: trimmedToken.substring(0, 10),
    timestamp: new Date().toISOString()
  })
  
  // Verify token looks like a JWT (3 parts separated by dots) or similar format
  // This helps catch obvious formatting issues early
  if (trimmedToken.split('.').length !== 3 && !trimmedToken.includes('.')) {
    console.warn('[Zumrails SDK] Token format looks unusual - expected JWT-like format with dots')
  }
  
  const config: any = {
    token: trimmedToken,
    options: {
      accountselector: options?.accountselector ?? true,
      testinstitution: options?.testinstitution ?? true,
      backbutton: options?.backbutton ?? true,
      closebutton: options?.closebutton ?? true,
      ...(options?.extrafield1 && { extrafield1: options.extrafield1 }),
      ...(options?.extrafield2 && { extrafield2: options.extrafield2 }),
      ...(options?.cardidforreconnect && { cardidforreconnect: options.cardidforreconnect })
    },
    onLoad: () => {
      console.log('[Zumrails SDK] Iframe loaded')
      callbacks?.onLoad?.()
    },
    onSuccess: (
     connection: ZumrailsConnection
    ) => {
      console.log('[Zumrails SDK] Success:', {
       connection
      })
      // Pass parameters as separate arguments per documentation
      callbacks?.onSuccess?.(connection)
    },
    onError: (error: string) => {
      console.error('[Zumrails SDK] Error:', {error, trimmedToken})
      callbacks?.onError?.(error)
    },
    onConnectorClosed: () => {
      console.log('[Zumrails SDK] Connector closed by user')
      callbacks?.onConnectorClosed?.()
    },
    onStepChanged: (data: { step: string; data: any }) => {
      console.log('[Zumrails SDK] Step changed:', data)
      callbacks?.onStepChanged?.(data)
    }
  }

  // Add containerId if provided - this makes the SDK render inline instead of as a modal
  // The containerId should be the ID of the DOM element where the SDK should render
  if (containerId) {
    // Try both top-level and in options (SDK might accept it in either place)
    config.containerId = containerId
    // Also try adding it to options as some SDKs require it there
    if (!config.options.containerId) {
      config.options.containerId = containerId
    }
  }

  // Initialize the SDK with the token
  // If containerId is provided, SDK will render inline in that container
  // If not provided, SDK will render as a modal
  ZumRailsSDK.init(config)
}
