/**
 * Server-side Zumrails helper functions
 * Handles authentication token caching and API calls
 */

interface ZumrailsAuthResponse {
  statusCode: number
  message: string
  isError: boolean
  result: {
    Id: string
    Role: string
    Token: string
    CustomerId: string
    CompanyName: string
    CustomerType: string
    Username: string
    RefreshToken: string
    CreatedAt: string
  }
}

interface ZumrailsConnectTokenResponse {
  statusCode: number
  message: string
  isError: boolean
  result: {
    Token: string
    ExpirationUTC: string
  }
}

// Cache for authentication token (in-memory, expires based on JWT)
let authTokenCache: {
  token: string
  refreshToken: string
  expiresAt: number
  customerId: string
} | null = null

/**
 * Get Zumrails authentication token from cache or authenticate
 * Returns token, refreshToken, and customerId
 */
export async function getZumrailsAuthToken(): Promise<{
  token: string
  refreshToken: string
  customerId: string
}> {
  // Check cache first
  if (authTokenCache && authTokenCache.expiresAt > Date.now()) {
    console.log('[Zumrails] Using cached auth token')
    return {
      token: authTokenCache.token,
      refreshToken: authTokenCache.refreshToken,
      customerId: authTokenCache.customerId
    }
  }

  const username = process.env.ZUMRAILS_USERNAME
  const password = process.env.ZUMRAILS_PASSWORD
  const baseUrl =
    process.env.ZUMRAILS_API_BASE_URL || 'https://api-sandbox.zumrails.com'

  if (!username || !password) {
    throw new Error(
      'ZUMRAILS_USERNAME and ZUMRAILS_PASSWORD must be configured'
    )
  }

  const authUrl = `${baseUrl}/api/Authorize`

  console.log('[Zumrails] Authenticating...', { url: authUrl })

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Username: username,
      Password: password
    })
  })

  const rawText = await response.text().catch(() => '')

  if (!response.ok) {
    console.error('[Zumrails] Auth failed:', {
      status: response.status,
      body: rawText
    })
    throw new Error(
      `Zumrails authentication failed: ${rawText || response.statusText}`
    )
  }

  let authData: ZumrailsAuthResponse
  try {
    authData = rawText ? JSON.parse(rawText) : {}
  } catch (error) {
    throw new Error('Failed to parse Zumrails auth response')
  }

  if (authData.isError || !authData.result?.Token) {
    throw new Error(authData.message || 'Zumrails authentication failed')
  }

  // Parse JWT to get expiration (basic parsing, not full validation)
  let expiresAt = Date.now() + 3600000 // Default to 1 hour if can't parse
  try {
    const tokenParts = authData.result.Token.split('.')
    if (tokenParts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64').toString()
      )
      if (payload.exp) {
        expiresAt = payload.exp * 1000 // Convert to milliseconds
      }
    }
  } catch {
    // Use default expiration
  }

  // Cache the token
  authTokenCache = {
    token: authData.result.Token,
    refreshToken: authData.result.RefreshToken,
    expiresAt: expiresAt - 60000, // Expire 1 minute before actual expiration
    customerId: authData.result.CustomerId
  }

  console.log('[Zumrails] Authentication successful', {
    customerId: authData.result.CustomerId,
    expiresAt: new Date(expiresAt).toISOString()
  })

  return {
    token: authData.result.Token,
    refreshToken: authData.result.RefreshToken,
    customerId: authData.result.CustomerId
  }
}

/**
 * Create a connect token for bank verification
 */
export async function createZumrailsConnectToken(
  authToken: string
): Promise<{ connectToken: string; expiresAt: string; customerId: string }> {
  const baseUrl =
    process.env.ZUMRAILS_API_BASE_URL || 'https://api-sandbox.zumrails.com'
  const createTokenUrl = `${baseUrl}/api/connect/createtoken`

  const payload = {
    ConnectTokenType: 'AddPaymentProfile',
    Configuration: {
      allowEft: true,
      allowInterac: true,
      allowVisaDirect: true,
      allowCreditCard: true
    }
  }

  console.log('[Zumrails] Creating connect token...', { url: createTokenUrl })

  const response = await fetch(createTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  })

  const rawText = await response.text().catch(() => '')

  if (!response.ok) {
    console.error('[Zumrails] Create token failed:', {
      status: response.status,
      body: rawText
    })
    throw new Error(
      `Zumrails connect token creation failed: ${rawText || response.statusText}`
    )
  }

  let tokenData: ZumrailsConnectTokenResponse
  try {
    tokenData = rawText ? JSON.parse(rawText) : {}
  } catch (error) {
    throw new Error('Failed to parse Zumrails connect token response')
  }

  if (tokenData.isError || !tokenData.result?.Token) {
    throw new Error(
      tokenData.message || 'Zumrails connect token creation failed'
    )
  }

  console.log('[Zumrails] Connect token created successfully', {
    expiresAt: tokenData.result.ExpirationUTC
  })
  const customerId = tokenData.result.Token.split('|')[2]

  return {
    connectToken: tokenData.result.Token,
    expiresAt: tokenData.result.ExpirationUTC,
    customerId
  }
}

/**
 * Initialize Zumrails session - gets auth token and creates connect token
 */
export async function initializeZumrailsSession(userData?: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}): Promise<{
  connectToken: string
  customerId: string
  iframeUrl: string
  expiresAt: string
}> {
  // Step 1: Get authentication token (from cache or authenticate)
  const { token } = await getZumrailsAuthToken()

  // Step 2: Create connect token
  const { connectToken, expiresAt, customerId } = await createZumrailsConnectToken(token)

  // Step 3: Build iframe URL
  const connectorBaseUrl =
    process.env.ZUMRAILS_CONNECTOR_BASE_URL ||
    'https://connector-sandbox.aggregation.zumrails.com'
  const testInstitution = process.env.ZUMRAILS_TEST_INSTITUTION !== 'false' // Default to true
  const params = new URLSearchParams({
    customerid: customerId,
    ...(testInstitution && { testinstitution: 'true' })
  })
  // https://connector-sandbox.aggregation.zumrails.com/consent?customerid=bed473d8-e3ca-483a-9300-2de2849dcfc3&testinstitution=true
  const iframeUrl = `${connectorBaseUrl}/consent?${params.toString()}`

  return {
    connectToken,
    customerId,
    iframeUrl,
    expiresAt
  }
}
