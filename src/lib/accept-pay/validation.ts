/**
 * Accept Pay API Validation Utilities
 * 
 * Validates data according to Accept Pay API requirements
 * Based on Accept Pay API documentation regex patterns and rules
 */

/**
 * Validate account number format
 * EFT: Must be exactly 12 digits
 * ACH: 5-17 digits
 */
export function validateAccountNumber(
  accountNumber: string,
  type: 'EFT' | 'ACH' = 'EFT'
): { valid: boolean; error?: string } {
  if (!accountNumber) {
    return { valid: false, error: 'Account number is required' }
  }

  // Remove any non-digit characters
  const cleaned = accountNumber.replace(/\D/g, '')

  if (type === 'EFT') {
    if (cleaned.length !== 12) {
      return {
        valid: false,
        error: 'EFT account number must be exactly 12 digits'
      }
    }
  } else {
    // ACH
    if (cleaned.length < 5 || cleaned.length > 17) {
      return {
        valid: false,
        error: 'ACH account number must be between 5 and 17 digits'
      }
    }
  }

  return { valid: true }
}

/**
 * Validate process date
 * Must be >= MinProcessDate from Accept Pay API
 * Format: YYYY-MM-DD
 */
export function validateProcessDate(
  processDate: string,
  minProcessDate?: string
): { valid: boolean; error?: string } {
  if (!processDate) {
    return { valid: false, error: 'Process date is required' }
  }

  // Check format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(processDate)) {
    return { valid: false, error: 'Process date must be in YYYY-MM-DD format' }
  }

  const date = new Date(processDate)
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date' }
  }

  // Check if date is in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date < today) {
    return { valid: false, error: 'Process date cannot be in the past' }
  }

  // Check against minimum process date if provided
  if (minProcessDate) {
    const minDate = new Date(minProcessDate)
    if (date < minDate) {
      return {
        valid: false,
        error: `Process date must be >= ${minProcessDate} (Accept Pay minimum process date)`
      }
    }
  }

  return { valid: true }
}

/**
 * Sanitize text fields according to Accept Pay regex rules
 * Pattern: [a-zA-Z0-9(). _#/-]+
 * Removes invalid characters
 */
export function sanitizeTextField(
  text: string | null | undefined,
  maxLength?: number
): string {
  if (!text) {
    return ''
  }

  // Remove characters that don't match Accept Pay regex: [a-zA-Z0-9(). _#/-]+
  let sanitized = text.replace(/[^a-zA-Z0-9(). _#/-]/g, '')

  // Trim whitespace
  sanitized = sanitized.trim()

  // Apply max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Validate and sanitize FirstName/LastName
 * Max length: 64 characters
 */
export function sanitizeName(name: string | null | undefined): string {
  return sanitizeTextField(name, 64)
}

/**
 * Validate and sanitize Address
 * Max length: 100 characters
 */
export function sanitizeAddress(address: string | null | undefined): string {
  return sanitizeTextField(address, 100)
}

/**
 * Validate and sanitize City
 * Max length: 50 characters
 */
export function sanitizeCity(city: string | null | undefined): string {
  return sanitizeTextField(city, 50)
}

/**
 * Validate and sanitize Memo/Reference
 * Max length: 100 characters
 */
export function sanitizeMemo(memo: string | null | undefined): string {
  return sanitizeTextField(memo, 100)
}

/**
 * Validate phone number
 * Accept Pay expects digits only (no formatting)
 */
export function validatePhone(phone: string | null | undefined): {
  valid: boolean
  cleaned?: string
  error?: string
} {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' }
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length < 10) {
    return { valid: false, error: 'Phone number must contain at least 10 digits' }
  }

  return { valid: true, cleaned }
}

/**
 * Validate email format
 */
export function validateEmail(email: string | null | undefined): {
  valid: boolean
  error?: string
} {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }

  return { valid: true }
}

/**
 * Validate province/state code
 * Should be 2-letter code for Canada (e.g., ON, QC, BC)
 */
export function validateProvince(province: string | null | undefined): {
  valid: boolean
  error?: string
} {
  if (!province) {
    return { valid: false, error: 'Province is required' }
  }

  const cleaned = province.trim().toUpperCase()
  if (cleaned.length !== 2) {
    return { valid: false, error: 'Province must be a 2-letter code (e.g., ON, QC, BC)' }
  }

  return { valid: true }
}

/**
 * Validate postal code format
 * Canadian format: A1A 1A1 or A1A1A1
 */
export function validatePostalCode(postalCode: string | null | undefined): {
  valid: boolean
  cleaned?: string
  error?: string
} {
  if (!postalCode) {
    return { valid: false, error: 'Postal code is required' }
  }

  // Remove spaces and convert to uppercase
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase()

  // Canadian postal code format: A1A1A1 (alternating letter-number-letter-number-letter-number)
  const postalCodeRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/
  if (!postalCodeRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Postal code must be in Canadian format (e.g., A1A1A1 or A1A 1A1)'
    }
  }

  return { valid: true, cleaned }
}

/**
 * Validate institution number (3 digits)
 */
export function validateInstitutionNumber(
  institutionNumber: string | null | undefined
): { valid: boolean; cleaned?: string; error?: string } {
  if (!institutionNumber) {
    return { valid: false, error: 'Institution number is required' }
  }

  const cleaned = institutionNumber.replace(/\D/g, '')
  if (cleaned.length !== 3) {
    return { valid: false, error: 'Institution number must be exactly 3 digits' }
  }

  return { valid: true, cleaned }
}

/**
 * Validate transit number (5 digits)
 */
export function validateTransitNumber(
  transitNumber: string | null | undefined
): { valid: boolean; cleaned?: string; error?: string } {
  if (!transitNumber) {
    return { valid: false, error: 'Transit number is required' }
  }

  const cleaned = transitNumber.replace(/\D/g, '')
  if (cleaned.length !== 5) {
    return { valid: false, error: 'Transit number must be exactly 5 digits' }
  }

  return { valid: true, cleaned }
}

/**
 * Validate amount (must be positive)
 */
export function validateAmount(amount: number | string | null | undefined): {
  valid: boolean
  cleaned?: number
  error?: string
} {
  if (amount === null || amount === undefined) {
    return { valid: false, error: 'Amount is required' }
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' }
  }

  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }

  // Round to 2 decimal places
  const cleaned = Math.round(numAmount * 100) / 100

  return { valid: true, cleaned }
}

