/**
 * Password generation utilities
 * 
 * Provides secure password generation for temporary passwords
 * and invitation emails.
 */

import { randomBytes } from 'crypto'

/**
 * Generate a secure temporary password
 * 
 * Creates a password that:
 * - Is at least 12 characters long
 * - Contains uppercase, lowercase, numbers, and special characters
 * - Is cryptographically secure using crypto.randomBytes
 * 
 * @param length - Desired password length (default: 16, minimum: 12)
 * @returns A secure random password string
 */
export function generateSecurePassword(length: number = 16): string {
  if (length < 12) {
    throw new Error('Password length must be at least 12 characters for security')
  }

  // Character sets for password generation
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const special = '!@#$%&*'
  const allChars = lowercase + uppercase + numbers + special

  // Ensure we have at least one character from each set
  let password = ''
  const bytes = randomBytes(4)
  password += lowercase[bytes[0] % lowercase.length]
  password += uppercase[bytes[1] % uppercase.length]
  password += numbers[bytes[2] % numbers.length]
  password += special[bytes[3] % special.length]

  // Fill the rest with random characters
  const remainingBytes = randomBytes(length - 4)
  for (let i = 0; i < length - 4; i++) {
    password += allChars[remainingBytes[i] % allChars.length]
  }

  // Shuffle the password to avoid predictable patterns
  return shuffleString(password)
}

/**
 * Shuffle a string to randomize character positions
 * Uses Fisher-Yates shuffle algorithm with crypto.randomBytes
 */
function shuffleString(str: string): string {
  const arr = str.split('')
  const bytes = randomBytes(arr.length)
  
  for (let i = arr.length - 1; i > 0; i--) {
    // Use crypto random for secure shuffle
    const j = bytes[i] % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  
  return arr.join('')
}

/**
 * Generate a human-readable temporary password
 * 
 * Creates a password that is easier to read/type while still being secure:
 * - Uses only alphanumeric characters (no special chars)
 * - Groups characters for readability
 * - Still cryptographically secure using crypto.randomBytes
 * 
 * Format: XXXX-XXXX-XXXX (e.g., A3B7-K9M2-P4Q8)
 * 
 * @returns A readable secure password string
 */
export function generateReadablePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars (0, O, I, 1)
  const bytes = randomBytes(12)
  
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length]
  }
  
  // Format as XXXX-XXXX-XXXX
  return `${password.substring(0, 4)}-${password.substring(4, 8)}-${password.substring(8, 12)}`
}

