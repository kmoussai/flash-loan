import type { QuickApplyFormData } from '../types'
import { validateMinimumAge } from '@/src/lib/utils/age'

interface ValidationContext {
  ibvVerified: boolean
  ibvSubmissionOverride: 'pending' | 'failed' | null
  zumrailsRequestId: string | null
}

export function isStepValid(
  currentStep: number,
  formData: QuickApplyFormData,
  context: ValidationContext
): boolean {
  switch (currentStep) {
    case 1:
      // Validate all required fields and age (must be at least 18)
      const hasAllFields =
        Boolean(formData.firstName?.trim()) &&
        Boolean(formData.lastName?.trim()) &&
        Boolean(formData.email?.trim()) &&
        Boolean(formData.phone?.trim()) &&
        Boolean(formData.dateOfBirth?.trim())
      if (!hasAllFields) return false

      // Validate age if date of birth is provided
      if (formData.dateOfBirth?.trim()) {
        const ageValidation = validateMinimumAge(formData.dateOfBirth.trim(), 18)
        return ageValidation.isValid
      }
      return false
    case 2:
      return (
        Boolean(formData.streetNumber?.trim()) &&
        Boolean(formData.streetName?.trim()) &&
        Boolean(formData.city?.trim()) &&
        Boolean(formData.province?.trim()) &&
        Boolean(formData.postalCode?.trim()) &&
        Boolean(formData.country?.trim()) &&
        Boolean(formData.movingDate?.trim())
      )
    case 3:
      return formData.loanAmount?.trim() !== ''
    case 4:
      return formData.confirmInformation
    case 5:
      return (
        context.ibvVerified ||
        Boolean(context.ibvSubmissionOverride) ||
        Boolean(context.zumrailsRequestId)
      )
    default:
      return false
  }
}

