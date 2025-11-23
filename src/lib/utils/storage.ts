/**
 * Storage utility functions for cleaning up localStorage and sessionStorage
 */

/**
 * Clear all application-related data from localStorage and sessionStorage
 * This should be called on logout to ensure no user data persists
 */
export function clearApplicationStorage(): void {
  if (typeof window === 'undefined') return

  // Clear localStorage items
  const localStorageKeys = [
    'microLoanFormData',
    'inveriteConnection',
    'flinksConnection',
    'loanFormData',
    'loanFormCurrentStep',
    'loanFormPreQualification',
    'loanFormBankruptcyPlan',
    'loanFormPreviousBorrower'
  ]

  localStorageKeys.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`Failed to remove localStorage key: ${key}`, error)
    }
  })

  // Clear sessionStorage items
  const sessionStorageKeys = [
    'inverite_init_session_id'
  ]

  sessionStorageKeys.forEach(key => {
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn(`Failed to remove sessionStorage key: ${key}`, error)
    }
  })
}

