// Database types for Supabase tables

// ===========================
// ENUMS
// ===========================

export type StaffRole = 'admin' | 'support' | 'intern'
export type KycStatus = 'pending' | 'verified' | 'rejected'
export type AddressType = 'current' | 'previous' | 'mailing' | 'work'
export type LoanType = 'without-documents' | 'with-documents'
export type ApplicationStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled'
export type IncomeSourceType = 
  | 'employed' 
  | 'employment-insurance' 
  | 'self-employed' 
  | 'csst-saaq' 
  | 'parental-insurance' 
  | 'retirement-plan'

// ===========================
// INCOME FIELDS TYPES (JSONB)
// ===========================

export interface EmployedIncomeFields {
  occupation: string
  company_name: string
  supervisor_name: string
  work_phone: string
  post: string
  payroll_frequency: 'weekly' | 'bi-weekly' | 'monthly'
  date_hired: string
  next_pay_date: string
}

export interface EmploymentInsuranceIncomeFields {
  employment_insurance_start_date: string
  next_deposit_date: string
}

export interface SelfEmployedIncomeFields {
  paid_by_direct_deposit: 'yes' | 'no'
  self_employed_phone: string
  deposits_frequency: 'weekly' | 'bi-weekly' | 'monthly'
  self_employed_start_date: string
  next_deposit_date: string
}

export interface OtherIncomeFields {
  next_deposit_date: string
}

export type IncomeFields = 
  | EmployedIncomeFields 
  | EmploymentInsuranceIncomeFields 
  | SelfEmployedIncomeFields 
  | OtherIncomeFields

// ===========================
// TABLE TYPES
// ===========================

// Extended User (Client) type
export interface User {
  id: string
  kyc_status: KycStatus
  national_id: string | null
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  phone: string | null
  email: string | null
  preferred_language: string | null
  current_address_id: string | null
  residence_status: string | null
  gross_salary: number | null
  rent_or_mortgage_cost: number | null
  heating_electricity_cost: number | null
  car_loan: number | null
  furniture_loan: number | null
  created_at: string
  updated_at: string | null
}

export interface Staff {
  id: string
  role: StaffRole
  department: string | null
  created_at: string
}

export interface Address {
  id: string
  client_id: string
  address_type: AddressType
  street_number: string | null
  street_name: string | null
  apartment_number: string | null
  city: string
  province: string
  postal_code: string
  moving_date: string | null
  is_current: boolean
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface LoanApplication {
  id: string
  client_id: string
  address_id: string | null
  loan_amount: number
  loan_type: LoanType
  income_source: IncomeSourceType
  income_fields: Record<string, any>
  application_status: ApplicationStatus
  assigned_to: string | null
  bankruptcy_plan: boolean | null
  staff_notes: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
}

export interface Reference {
  id: string
  loan_application_id: string
  first_name: string
  last_name: string
  phone: string
  relationship: string
  created_at: string
}

// ===========================
// INSERT TYPES
// ===========================

export interface UserInsert {
  id: string
  kyc_status?: KycStatus
  national_id?: string | null
  first_name?: string
  last_name?: string
  date_of_birth?: string
  phone?: string
  email?: string
  preferred_language?: string
  residence_status?: string
  gross_salary?: number
  rent_or_mortgage_cost?: number
  heating_electricity_cost?: number
  car_loan?: number
  furniture_loan?: number
}

export interface StaffInsert {
  id: string
  role?: StaffRole
  department?: string | null
}

export interface AddressInsert {
  client_id: string
  address_type?: AddressType
  street_number?: string
  street_name?: string
  apartment_number?: string
  city: string
  province: string
  postal_code: string
  moving_date?: string
  is_current?: boolean
}

export interface LoanApplicationInsert {
  client_id: string
  address_id?: string
  loan_amount: number
  loan_type: LoanType
  income_source: IncomeSourceType
  income_fields?: Record<string, any>
  application_status?: ApplicationStatus
  bankruptcy_plan?: boolean
}

export interface ReferenceInsert {
  loan_application_id: string
  first_name: string
  last_name: string
  phone: string
  relationship: string
}

// ===========================
// UPDATE TYPES
// ===========================

export interface UserUpdate {
  kyc_status?: KycStatus
  national_id?: string | null
  first_name?: string
  last_name?: string
  date_of_birth?: string
  phone?: string
  email?: string
  preferred_language?: string
  current_address_id?: string
  residence_status?: string
  gross_salary?: number
  rent_or_mortgage_cost?: number
  heating_electricity_cost?: number
  car_loan?: number
  furniture_loan?: number
}

export interface StaffUpdate {
  role?: StaffRole
  department?: string | null
}

export interface AddressUpdate {
  address_type?: AddressType
  street_number?: string
  street_name?: string
  apartment_number?: string
  city?: string
  province?: string
  postal_code?: string
  moving_date?: string
  is_current?: boolean
  verified_at?: string
}

export interface LoanApplicationUpdate {
  address_id?: string
  loan_amount?: number
  loan_type?: LoanType
  income_source?: IncomeSourceType
  income_fields?: Record<string, any>
  application_status?: ApplicationStatus
  assigned_to?: string
  bankruptcy_plan?: boolean
  staff_notes?: string
  rejection_reason?: string
  submitted_at?: string
  approved_at?: string
  rejected_at?: string
}

export interface ReferenceUpdate {
  first_name?: string
  last_name?: string
  phone?: string
  relationship?: string
}

// ===========================
// COMBINED DATABASE TYPE
// ===========================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      staff: {
        Row: Staff
        Insert: StaffInsert
        Update: StaffUpdate
      }
      addresses: {
        Row: Address
        Insert: AddressInsert
        Update: AddressUpdate
      }
      loan_applications: {
        Row: LoanApplication
        Insert: LoanApplicationInsert
        Update: LoanApplicationUpdate
      }
      references: {
        Row: Reference
        Insert: ReferenceInsert
        Update: ReferenceUpdate
      }
    }
  }
}

