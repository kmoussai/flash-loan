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
    CustomerId?: string // May be included in response
    CompanyName?: string
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

  // Get configuration from database (with env var fallback)
  const { getZumRailsConfig } = await import('@/src/lib/supabase/config-helpers')
  const config = await getZumRailsConfig()

  const username = config.username
  const password = config.password
  const baseUrl = config.apiBaseUrl

  if (!username || !password) {
    throw new Error(
      'ZumRails username and password must be configured. Please set them in the admin configurations page or via ZUMRAILS_USERNAME and ZUMRAILS_PASSWORD environment variables.'
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
 * @param authToken - Zumrails authentication token
 * @param userInfo - Optional user information to pre-fill the form
 * @param clientUserId - Optional client/user ID from our system to associate with the token
 * @param extraField1 - Optional extra field 1 (typically application_id)
 * @param extraField2 - Optional extra field 2 (typically loan_application_ibv_request id)
 */
export async function createZumrailsConnectToken(
  authToken: string,
  userInfo?: {
    firstName?: string
    lastName?: string
    email?: string
    addressCity?: string
    addressLine1?: string
    addressProvince?: string
    addressPostalCode?: string
    clientUserId?: string
    language?: string
  },
  extraField1?: string,
  extraField2?: string
): Promise<{ connectToken: string; expiresAt: string; customerId: string }> {
  // Get base URL from config (with env var fallback)
  const { getZumRailsConfig } = await import('@/src/lib/supabase/config-helpers')
  const config = await getZumRailsConfig()
  const baseUrl = config.apiBaseUrl
  const createTokenUrl = `${baseUrl}/api/connect/createtoken`
  // api/connect/createToken

  const payload: any = {
    ConnectTokenType: 'AddPaymentProfile',
    Configuration: {
      allowEft: true,
      allowInterac: false,
      allowVisaDirect: false,
      allowCreditCard: false,
      ...(userInfo?.clientUserId && { clientUserId: userInfo.clientUserId }), // Add our system ID to track the connection
      ...(userInfo?.firstName && { firstName: userInfo.firstName }),
      ...(userInfo?.lastName && { lastName: userInfo.lastName }),
      ...(userInfo?.email && { email: userInfo.email }),
      ...(userInfo?.language && { language: userInfo.language }), // Add preferred language
      // Add extra fields for webhook matching
      ...(extraField1 && { ExtraField1: extraField1 }), // Typically application_id
      ...(extraField2 && { ExtraField2: extraField2 }), // Typically loan_application_ibv_request id
      ...(userInfo && {
        User: {
          ...(userInfo.firstName && { firstName: userInfo.firstName }),
          ...(userInfo.lastName && { lastName: userInfo.lastName }),
          ...(userInfo.email && { email: userInfo.email }),
          ...(userInfo.addressCity && { addressCity: userInfo.addressCity }),
          ...(userInfo.addressLine1 && { addressLine1: userInfo.addressLine1 }),
          ...(userInfo.addressProvince && {
            addressProvince: userInfo.addressProvince
          }),
          ...(userInfo.addressPostalCode && {
            addressPostalCode: userInfo.addressPostalCode
          })
        }
      })
    }
  }

  console.log('[Zumrails] Creating connect token...', {
    url: createTokenUrl,
    hasClientUserId: !!userInfo?.clientUserId,
    clientUserId: userInfo?.clientUserId || undefined,
    language: userInfo?.language || undefined,
    extraField1: extraField1 || undefined,
    extraField2: extraField2 || undefined
  })

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
  console.log('[Zumrails] Create token successful', {
    body: tokenData,
    token: tokenData.result?.Token?.substring(0, 50) + '...', // Log first 50 chars of token
    hasCustomerId: !!tokenData.result?.CustomerId,
    customerId: tokenData.result?.CustomerId
  })

  if (tokenData.isError || !tokenData.result?.Token) {
    throw new Error(
      tokenData.message || 'Zumrails connect token creation failed'
    )
  }

  console.log('[Zumrails] Connect token created successfully', {
    expiresAt: tokenData.result.ExpirationUTC,
    hasCustomerId: !!tokenData.result.CustomerId
  })

  // Try to get customerId from token response first (if included)
  // Otherwise, get from auth token cache
  let customerId =
    tokenData.result.CustomerId || authTokenCache?.customerId || ''

  if (!customerId) {
    console.warn(
      '[Zumrails] customerId not found in token response or cache, attempting to get from auth token'
    )
    // Fallback: get from auth token if not in cache or response
    const { customerId: authCustomerId } = await getZumrailsAuthToken()
    customerId = authCustomerId
  }

  if (!customerId) {
    console.error(
      '[Zumrails] Failed to get customerId - this may cause SDK issues'
    )
  }

  return {
    connectToken: tokenData.result.Token,
    expiresAt: tokenData.result.ExpirationUTC,
    customerId: customerId || '' // Ensure we always return a string
  }
}

/**
 * Initialize Zumrails session - gets auth token and creates connect token
 * @param userData - Optional user information to pre-fill the form
 * @param applicationId - Optional application ID to pass as ExtraField1
 * @param ibvRequestId - Optional IBV request ID to pass as ExtraField2
 */
export async function initializeZumrailsSession(
  userData?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    addressCity?: string
    addressLine1?: string
    addressProvince?: string
    addressPostalCode?: string
    clientUserId?: string
    language?: string
  },
  applicationId?: string,
  ibvRequestId?: string
): Promise<{
  connectToken: string
  customerId: string
  iframeUrl: string
  expiresAt: string
}> {
  // Step 1: Get authentication token (from cache or authenticate)
  const { token } = await getZumrailsAuthToken()

  // Step 2: Create connect token with user information, client user ID, and extra fields
  const { connectToken, expiresAt, customerId } =
    await createZumrailsConnectToken(token, userData, applicationId, ibvRequestId)

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

/**
 * Fetch bank account information from Zumrails API by request ID
 * Calls: /api/aggregation/GetInformationByRequestId/{requestId}
 */
export async function fetchZumrailsDataByRequestId(
  requestId: string
): Promise<any> {
  // Authenticate with Zumrails
  const { token } = await getZumrailsAuthToken()

  // Get base URL from config (with env var fallback)
  const { getZumRailsConfig } = await import('@/src/lib/supabase/config-helpers')
  const config = await getZumRailsConfig()
  const baseUrl = config.apiBaseUrl
  const fetchUrl = `${baseUrl}/api/aggregation/GetInformationByRequestId/${requestId}`

  console.log('[Zumrails] Fetching data by request ID', {
    url: fetchUrl,
    requestId
  })

  const response = await fetch(fetchUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  const rawText = await response.text().catch(() => '')

  if (!response.ok) {
    console.error('[Zumrails] Fetch API call failed', {
      status: response.status,
      statusText: response.statusText,
      body: rawText
    })
    throw new Error(
      `Zumrails API returned ${response.status}: ${rawText || response.statusText}`
    )
  }

  let apiData: any
  try {
    apiData = rawText ? JSON.parse(rawText) : {}
  } catch (error) {
    console.error('[Zumrails] Failed to parse API response', error)
    throw new Error('Failed to parse Zumrails API response')
  }

  // Check for errors in Zumrails response format
  if (apiData.isError) {
    console.error('[Zumrails] Zumrails returned error', apiData)
    throw new Error(apiData.message || 'Zumrails API returned an error')
  }

  console.log('[Zumrails] Successfully fetched data by request ID', {
    requestId,
    hasData: !!apiData.result || !!apiData.data
  })

  return apiData.result || apiData.data || apiData
}
