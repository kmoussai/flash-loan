/**
 * Accept Pay Global API Client
 *
 * Server-side only - handles authentication and API requests to Accept Pay
 * Token expires after 240 minutes - automatically refreshes when needed
 */

interface AcceptPayLoginResponse {
  Success: boolean
  Token: string
  ExpireAfterMinutes: number
}

interface AcceptPayError {
  Message?: string
  ModelState?: Record<string, string[]>
}

interface AcceptPayRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  requireAuth?: boolean
}

class AcceptPayClient {
  private baseUrl: string
  private username: string
  private password: string
  private token: string | null = null
  private tokenExpiresAt: number | null = null

  constructor() {
    const env = process.env.ACCEPT_PAY_ENV || 'uat'
    this.baseUrl =
      env === 'production'
        ? process.env.ACCEPT_PAY_BASE_URL ||
          'https://api.acceptpayglobal.com/eft'
        : process.env.ACCEPT_PAY_BASE_URL ||
          'https://apiuat.acceptpayglobal.com/eft'

    this.username = process.env.ACCEPT_PAY_USERNAME || ''
    this.password = process.env.ACCEPT_PAY_PASSWORD || ''

    if (!this.username || !this.password) {
      console.warn(
        'Accept Pay credentials not configured. Set ACCEPT_PAY_USERNAME and ACCEPT_PAY_PASSWORD environment variables.'
      )
    }
  }

  async getInfo(): Promise<{ baseUrl: string; username: string; password: string; token: string | null }> {
    return {
      baseUrl: this.baseUrl,
      username: this.username,
      password: this.password,
      token: await this.getAuthToken()
    } as const
  }

  /**
   * Login to Accept Pay API and get Bearer token
   * Token expires after 240 minutes
   */
  private async login(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/User/Login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: this.username,
          password: this.password
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Accept Pay login failed: ${response.status} ${errorText}`
        )
      }

      const data = (await response.json()) as AcceptPayLoginResponse

      if (!data.Success || !data.Token) {
        throw new Error('Accept Pay login failed: Invalid response')
      }

      // Store token and expiration time (240 minutes = 14,400,000 ms)
      this.token = data.Token
      const expiresInMs = (data.ExpireAfterMinutes || 240) * 60 * 1000
      this.tokenExpiresAt = Date.now() + expiresInMs

      return this.token
    } catch (error) {
      console.error('[Accept Pay] Login error:', error)
      throw error
    }
  }

  /**
   * Check if token is valid and not expired
   */
  private isTokenValid(): boolean {
    if (!this.token || !this.tokenExpiresAt) {
      return false
    }
    // Refresh token if it expires in less than 5 minutes
    return this.tokenExpiresAt > Date.now() + 5 * 60 * 1000
  }

  /**
   * Get valid authentication token (refreshes if needed)
   */
  private async getAuthToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.token!
    }

    // Token expired or missing - login again
    return await this.login()
  }

  /**
   * Get authorization header
   */
  private async getAuthHeader(): Promise<string> {
    const token = await this.getAuthToken()
    return `Bearer ${token}`
  }

  /**
   * Make authenticated request to Accept Pay API
   */
  async request<T>(
    endpoint: string,
    options: AcceptPayRequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, requireAuth = true } = options

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    }

    // Add authentication if required
    if (requireAuth) {
      requestHeaders.Authorization = await this.getAuthHeader()
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined
      })

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `Accept Pay API error: ${response.status} ${response.statusText}`

        try {
          const errorData = (await response.json()) as AcceptPayError
          if (errorData.Message) {
            errorMessage = errorData.Message
          }
          if (errorData.ModelState) {
            const validationErrors = Object.entries(errorData.ModelState)
              .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
              .join('; ')
            errorMessage += ` - ${validationErrors}`
          }
        } catch {
          // If response is not JSON, try to get text
          const errorText = await response.text().catch(() => '')
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }

        throw new Error(errorMessage)
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        return (text || {}) as T
      }

      return (await response.json()) as T
    } catch (error) {
      console.error(
        `[Accept Pay] Request error (${method} ${endpoint}):`,
        error
      )
      throw error
    }
  }

  /**
   * GET request helper
   */
  async get<T>(
    endpoint: string,
    options?: Omit<AcceptPayRequestOptions, 'method'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST request helper
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<AcceptPayRequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  /**
   * PUT request helper
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<AcceptPayRequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  /**
   * DELETE request helper
   */
  async delete<T>(
    endpoint: string,
    options?: Omit<AcceptPayRequestOptions, 'method'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  // ===========================
  // CUSTOMER MANAGEMENT METHODS
  // ===========================

  /**
   * Create a new customer in Accept Pay
   */
  async createCustomer(customerData: {
    FirstName: string
    LastName: string
    Address: string
    City: string
    State: string
    Zip: string
    Country: string
    Phone: string
    Institution_Number: string
    Transit_Number: string
    Account_Number: string
    Email: string
    PADTType?: string
    PaymentType?: number
  }): Promise<{ Id: number }> {
    return this.post('/customers', customerData)
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: number): Promise<unknown> {
    return this.get(`/customers/${customerId}`)
  }

  /**
   * Get all customers
   */
  async getAllCustomers(): Promise<unknown[]> {
    return this.get('/customers')
  }

  /**
   * Get active customers only
   */
  async getActiveCustomers(): Promise<unknown[]> {
    return this.get('/customers/active')
  }

  /**
   * Get suspended customers only
   */
  async getSuspendedCustomers(): Promise<unknown[]> {
    return this.get('/customers/suspended')
  }

  /**
   * Update customer information
   */
  async updateCustomer(
    customerId: number,
    customerData: Partial<{
      FirstName: string
      LastName: string
      Address: string
      City: string
      State: string
      Zip: string
      Country: string
      Phone: string
      Institution_Number: string
      Transit_Number: string
      Account_Number: string
      Email: string
      PADTType: string
      PaymentType: number
    }>
  ): Promise<unknown> {
    return this.put(`/customers/${customerId}`, customerData)
  }

  /**
   * Suspend customer (voids pending transactions)
   */
  async suspendCustomer(customerId: number): Promise<unknown> {
    return this.delete(`/customers/${customerId}`)
  }

  /**
   * Get transactions for a customer
   */
  async getCustomerTransactions(customerId: number): Promise<unknown[]> {
    return this.get(`/customers/${customerId}/transactions`)
  }

  // ===========================
  // TRANSACTION METHODS
  // ===========================

  /**
   * Create a new transaction
   */
  async createTransaction(transactionData: {
    CustomerId: number
    ProcessDate: string // YYYY-MM-DD format
    Amount: number
    Schedule?: number
    TransactionType: 'DB' | 'CR' // Debit or Credit
    PaymentType: number
    PADTType?: string
    Status?: string // e.g., "Authorized"
    Memo?: string
    Reference?: string
  }): Promise<{ Id: number }> {
    if (process.env.NODE_ENV === 'development' && transactionData.TransactionType === 'CR') {
      return new Promise((resolve) => resolve({ Id: crypto.getRandomValues(new Int32Array(1))[0] }))
    }
    return this.post('/transactions', transactionData)
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: number): Promise<unknown> {
    return this.get(`/transactions/${transactionId}`)
  }

  /**
   * Get all transactions (last 6 months)
   */
  async getAllTransactions(): Promise<unknown[]> {
    return this.get('/transactions')
  }

  /**
   * Get transactions by date
   * @param selector - Date field selector (e.g., "ProcessDate", "CreatedDate")
   * @param date - Date in YYYY-MM-DD format
   */
  async getTransactionsByDate(
    selector: string,
    date: string
  ): Promise<unknown[]> {
    return this.get(`/transactions/${selector}/${date}`)
  }

  /**
   * Authorize a transaction
   */
  async authorizeTransaction(transactionId: number): Promise<unknown> {
    return this.post(`/transactions/${transactionId}/authorizations`)
  }

  /**
   * Unauthorize a transaction
   */
  async unauthorizeTransaction(transactionId: number): Promise<unknown> {
    return this.post(`/transactions/${transactionId}/unauthorizations`)
  }

  /**
   * Get authorization details for a transaction
   */
  async getTransactionAuthorization(transactionId: number): Promise<unknown> {
    return this.get(`/transactions/${transactionId}/authorizations`)
  }

  /**
   * Void a transaction (DELETE method)
   */
  async voidTransaction(transactionId: number): Promise<unknown> {
    return this.delete(`/transactions/${transactionId}`)
  }

  /**
   * Void a transaction (POST method - marks as voided)
   */
  async voidTransactionPost(transactionId: number): Promise<unknown> {
    return this.post(`/transactions/${transactionId}/voids`)
  }

  /**
   * Get minimum process date from Accept Pay
   * Returns the earliest date that can be used for ProcessDate
   */
  async getMinProcessDate(): Promise<{
    ProcessDate: string
    CutOffTime: string
  }> {
    return this.get('/enumerations/MinProcessDate')
  }

  // ===========================
  // UPDATES/POLLING METHODS
  // ===========================

  /**
   * Format date string to YYYY-MM-DD format for Accept Pay API
   * Accepts ISO 8601 timestamps or date strings
   * @param dateString - ISO 8601 date string or YYYY-MM-DD format
   * @returns Date in YYYY-MM-DD format
   */
  private formatDateForAPI(dateString: string): string {
    try {
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString
      }
      
      // Parse the date string and format to YYYY-MM-DD
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateString}`)
      }
      
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error('[Accept Pay] Error formatting date:', error, dateString)
      throw new Error(`Failed to format date: ${dateString}`)
    }
  }

  /**
   * Get transaction updates since a specific date
   * @param changedSince - ISO 8601 date string or YYYY-MM-DD format
   * @param page - Optional page number for pagination
   */
  async getTransactionUpdates(
    changedSince: string,
    page?: number
  ): Promise<unknown[]> {
    // Format date to YYYY-MM-DD (Accept Pay expects this format, not ISO timestamp)
    const dateStr = this.formatDateForAPI(changedSince)
    const endpoint = page
      ? `/updates/transactions/${dateStr}/${page}`
      : `/updates/transactions/${dateStr}/1`
    return this.get(endpoint)
  }

  /**
   * Get NOCs (Notification of Changes) since a specific date
   * @param changedSince - ISO 8601 date string or YYYY-MM-DD format
   */
  async getNOCs(changedSince: string): Promise<unknown[]> {
    // Format date to YYYY-MM-DD (Accept Pay expects this format, not ISO timestamp)
    const dateStr = this.formatDateForAPI(changedSince)
    return this.get(`/updates/nocs/${dateStr}`)
  }

  /**
   * Get customer updates since a specific date
   * @param changedSince - ISO 8601 date string or YYYY-MM-DD format
   * @param page - Optional page number for pagination
   */
  async getCustomerUpdates(
    changedSince: string,
    page?: number
  ): Promise<unknown[]> {
    // Format date to YYYY-MM-DD (Accept Pay expects this format, not ISO timestamp)
    const dateStr = this.formatDateForAPI(changedSince)
    const endpoint = page
      ? `/updates/customer/${dateStr}/${page}`
      : `/updates/customer/${dateStr}`
    return this.get(endpoint)
  }

  // ===========================
  // ENUMERATIONS METHODS
  // ===========================

  /**
   * Get payment types
   */
  async getPaymentTypes(): Promise<unknown[]> {
    return this.get('/enumerations/paymenttype')
  }

  /**
   * Get status codes
   */
  async getStatusCodes(): Promise<unknown[]> {
    return this.get('/enumerations/status')
  }

  /**
   * Get response codes
   */
  async getResponseCodes(): Promise<unknown[]> {
    return this.get('/enumerations/response')
  }

  /**
   * Get available schedules for recurring payments
   */
  async getSchedules(): Promise<unknown[]> {
    return this.get('/enumerations/schedule')
  }

  /**
   * Get server info (API version, timezone, etc.)
   */
  async getServerInfo(): Promise<unknown> {
    return this.get('/enumerations/serverinfo')
  }

  /**
   * Get account information (balance, currency, MID)
   */
  async getAccountInfo(): Promise<{
    Currency: string
    Balance: number
    MID: number[]
  }> {
    return this.get('/account')
  }
}

// Export singleton instance
let clientInstance: AcceptPayClient | null = null

/**
 * Get Accept Pay API client instance (singleton)
 * Server-side only - should only be called from API routes
 */
export function getAcceptPayClient(): AcceptPayClient {
  if (!clientInstance) {
    clientInstance = new AcceptPayClient()
  }
  return clientInstance
}

export default AcceptPayClient
