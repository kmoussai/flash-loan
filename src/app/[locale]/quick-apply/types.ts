export interface QuickApplyFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  preferredLanguage: string
  streetNumber: string
  streetName: string
  apartmentNumber: string
  city: string
  province: string
  postalCode: string
  movingDate: string
  country: string
  loanAmount: string
  confirmInformation: boolean
}

export type QuickApplyUpdateHandler = (
  field: keyof QuickApplyFormData,
  value: string | boolean
) => void

