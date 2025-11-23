/**
 * Age calculation and validation utilities
 */

/**
 * Calculate age from a date of birth string (YYYY-MM-DD format)
 * @param dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns Age in years, or null if date is invalid
 */
export function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) {
    return null
  }

  const birthDate = new Date(dateOfBirth)
  
  // Check if date is valid
  if (isNaN(birthDate.getTime())) {
    return null
  }

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

/**
 * Validate that a person is at least the minimum age
 * @param dateOfBirth - Date of birth in YYYY-MM-DD format
 * @param minimumAge - Minimum age required (default: 18)
 * @returns Object with isValid boolean and age if valid, error message if invalid
 */
export function validateMinimumAge(
  dateOfBirth: string,
  minimumAge: number = 18
): { isValid: boolean; age: number | null; error: string | null } {
  if (!dateOfBirth) {
    return {
      isValid: false,
      age: null,
      error: 'Date of birth is required'
    }
  }

  const age = calculateAge(dateOfBirth)

  if (age === null) {
    return {
      isValid: false,
      age: null,
      error: 'Invalid date of birth format'
    }
  }

  // Check if date is in the future
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  if (birthDate > today) {
    return {
      isValid: false,
      age: null,
      error: 'Date of birth cannot be in the future'
    }
  }

  if (age < minimumAge) {
    return {
      isValid: false,
      age,
      error: `You must be at least ${minimumAge} years old to apply. You are currently ${age} years old.`
    }
  }

  return {
    isValid: true,
    age,
    error: null
  }
}

