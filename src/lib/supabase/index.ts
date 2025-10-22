// Supabase exports - central import point
// Note: createServerSupabaseClient is not exported here to prevent
// it from being imported in Client Components. Import it directly
// from './server' in Server Components when needed.

export { createClient } from './client'

export type { Database, User, Staff, UserInsert, StaffInsert, UserUpdate, StaffUpdate, StaffRole, KycStatus } from './types'

export {
  getUserProfile,
  updateUserProfile,
  updateKycStatus,
  getAllUsers,
  getStaffProfile,
  updateStaffProfile,
  updateStaffRole,
  getAllStaff,
  getStaffByRole,
  isStaffMember,
  getUserType
} from './db-helpers'

