/**
 * API Client for Loan Application Submission
 * 
 * This file contains helper functions to interact with the loan application API
 */

export interface SubmitLoanApplicationData {
  // Personal Information
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  preferredLanguage: string
  
  // Address Information
  streetNumber: string
  streetName: string
  apartmentNumber?: string
  city: string
  province: string
  postalCode: string
  movingDate: string
  
  // Financial Obligations (Quebec only)
  residenceStatus?: string
  grossSalary?: string
  rentOrMortgageCost?: string
  heatingElectricityCost?: string
  carLoan?: string
  furnitureLoan?: string
  
  // References
  reference1FirstName: string
  reference1LastName: string
  reference1Phone: string
  reference1Relationship: string
  reference2FirstName: string
  reference2LastName: string
  reference2Phone: string
  reference2Relationship: string
  
  // Income Information
  incomeSource?: string
  occupation?: string
  companyName?: string
  supervisorName?: string
  workPhone?: string
  post?: string
  payrollFrequency?: string
  dateHired?: string
  nextPayDate?: string
  employmentInsuranceStartDate?: string
  paidByDirectDeposit?: string
  selfEmployedPhone?: string
  depositsFrequency?: string
  selfEmployedStartDate?: string
  nextDepositDate?: string
  
  // Loan Details
  loanAmount: string
  
  // Pre-qualification
  bankruptcyPlan: boolean
  
  // Confirmation
  confirmInformation: boolean
}

export interface LoanApplicationResponse {
  success: boolean
  message: string
  data?: {
    applicationId: string
    isPreviousBorrower: boolean
    referenceNumber: string
  }
  error?: string
  details?: string
}

/**
 * Submit a loan application to the server
 * 
 * @param data - The loan application data
 * @returns Promise with the API response
 */
export async function submitLoanApplication(
  data: SubmitLoanApplicationData
): Promise<LoanApplicationResponse> {
  try {
    const response = await fetch('/api/loan-application', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Failed to submit loan application',
        error: result.error,
        details: result.details,
      }
    }

    return result
  } catch (error: any) {
    console.error('Error submitting loan application:', error)
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
      error: error.message,
    }
  }
}

/**
 * Transform form data to API format
 * This helper function can be used to convert the form state to the API request format
 * 
 * @param formData - The raw form data from the application form
 * @returns Formatted data ready for API submission
 */
export function formatFormDataForAPI(formData: any): SubmitLoanApplicationData {
  return {
    // Personal Information
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    dateOfBirth: formData.dateOfBirth,
    preferredLanguage: formData.preferredLanguage,
    
    // Address Information
    streetNumber: formData.streetNumber,
    streetName: formData.streetName,
    apartmentNumber: formData.apartmentNumber,
    city: formData.city,
    province: formData.province,
    postalCode: formData.postalCode,
    movingDate: formData.movingDate,
    
    // Financial Obligations (Quebec only)
    residenceStatus: formData.residenceStatus,
    grossSalary: formData.grossSalary,
    rentOrMortgageCost: formData.rentOrMortgageCost,
    heatingElectricityCost: formData.heatingElectricityCost,
    carLoan: formData.carLoan,
    furnitureLoan: formData.furnitureLoan,
    
    // References
    reference1FirstName: formData.reference1FirstName,
    reference1LastName: formData.reference1LastName,
    reference1Phone: formData.reference1Phone,
    reference1Relationship: formData.reference1Relationship,
    reference2FirstName: formData.reference2FirstName,
    reference2LastName: formData.reference2LastName,
    reference2Phone: formData.reference2Phone,
    reference2Relationship: formData.reference2Relationship,
    
    // Income Information
    incomeSource: formData.incomeSource || undefined,
    occupation: formData.occupation,
    companyName: formData.companyName,
    supervisorName: formData.supervisorName,
    workPhone: formData.workPhone,
    post: formData.post,
    payrollFrequency: formData.payrollFrequency,
    dateHired: formData.dateHired,
    nextPayDate: formData.nextPayDate,
    employmentInsuranceStartDate: formData.employmentInsuranceStartDate,
    paidByDirectDeposit: formData.paidByDirectDeposit,
    selfEmployedPhone: formData.selfEmployedPhone,
    depositsFrequency: formData.depositsFrequency,
    selfEmployedStartDate: formData.selfEmployedStartDate,
    nextDepositDate: formData.nextDepositDate,
    
    // Loan Details
    loanAmount: formData.loanAmount,
    
    // Pre-qualification
    bankruptcyPlan: formData.bankruptcyPlan,
    
    // Confirmation
    confirmInformation: formData.confirmInformation,
  }
}

