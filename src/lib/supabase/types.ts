// Database types for Supabase tables

export type StaffRole = 'admin' | 'support' | 'intern'

export type KycStatus = 'pending' | 'verified' | 'rejected'

export interface User {
  id: string
  kyc_status: KycStatus
  national_id: string | null
  created_at: string
}

export interface Staff {
  id: string
  role: StaffRole
  department: string | null
  created_at: string
}

// Insert types (for creating new records)
export interface UserInsert {
  id: string
  kyc_status?: KycStatus
  national_id?: string | null
}

export interface StaffInsert {
  id: string
  role?: StaffRole
  department?: string | null
}

// Update types (for updating existing records)
export interface UserUpdate {
  kyc_status?: KycStatus
  national_id?: string | null
}

export interface StaffUpdate {
  role?: StaffRole
  department?: string | null
}

// Combined Database type
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
    }
  }
}

