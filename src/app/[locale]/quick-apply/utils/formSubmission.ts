import type { QuickApplyFormData } from '../types'

export interface SubmissionResult {
  success: boolean
  referenceNumber?: string | null
  applicationId?: string | null
  ibv?: {
    required: boolean
    iframeUrl?: string
    startUrl?: string
    connectToken?: string
    provider?: string
  }
  error?: string
}

export async function submitQuickApplyForm(
  formData: QuickApplyFormData
): Promise<SubmissionResult> {
  try {
    const response = await fetch('/api/loan-application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isQuickApply: true,

        // Personal Information (from form)
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        preferredLanguage: formData.preferredLanguage,

        // Address Information
        streetNumber: formData.streetNumber,
        streetName: formData.streetName,
        apartmentNumber: formData.apartmentNumber || null,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode?.replace(/\s+/g, '') || '',
        country: formData.country,
        movingDate: formData.movingDate,
        rentCost: formData.rentCost || null,

        // Loan Details
        loanAmount: formData.loanAmount,

          // Request IBV but don't provide data - server will initiate
          ibvProvider: 'zumrails',
          ibvStatus: 'pending', // Server will initiate IBV request

        // Other required fields
        bankruptcyPlan: false,
        confirmInformation: formData.confirmInformation
      })
    })

    const responseBody = await response.json().catch(() => null)

    if (!response.ok) {
      const message = (responseBody as any)?.error || 'Failed to submit application'
      return {
        success: false,
        error: message
      }
    }

    // Clear form data from localStorage
    localStorage.removeItem('microLoanFormData')

    const referenceNumber = (responseBody as any)?.data?.referenceNumber ?? null
    const applicationId = (responseBody as any)?.data?.applicationId ?? null
    const ibvData = (responseBody as any)?.data?.ibv

    return {
      success: true,
      referenceNumber,
      applicationId,
      ibv: ibvData
    }
  } catch (error) {
    console.error('Error submitting application:', error)
    return {
      success: false,
      error: 'Error submitting application. Please try again.'
    }
  }
}

