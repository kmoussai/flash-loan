// Supabase exports - central import point
// Note: createServerSupabaseClient is not exported here to prevent
// it from being imported in Client Components. Import it directly
// from './server' in Server Components when needed.

export { createClient } from './client'

// Export all types
export type { 
  Database, 
  User, 
  Staff, 
  Address,
  LoanApplication,
  Reference,
  UserInsert, 
  StaffInsert, 
  AddressInsert,
  LoanApplicationInsert,
  ReferenceInsert,
  UserUpdate, 
  StaffUpdate,
  AddressUpdate,
  LoanApplicationUpdate,
  ReferenceUpdate,
  StaffRole, 
  KycStatus,
  AddressType,
  LoanType,
  ApplicationStatus,
  IncomeSourceType,
  IbvProvider,
  IbvStatus,
  IbvProviderData,
  FlinksIbvData,
  InveriteIbvData,
  PlaidIbvData
} from './types'

// Export user and staff helpers
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

// Export loan application helpers
export {
  createAddress,
  getClientAddresses,
  getCurrentAddress,
  updateAddress,
  setCurrentAddress,
  createLoanApplication,
  getClientLoanApplications,
  getLoanApplication,
  getLoanApplicationWithDetails,
  updateLoanApplication,
  updateApplicationStatus,
  getAllLoanApplications,
  assignApplicationToStaff,
  createReference,
  createReferences,
  getApplicationReferences,
  updateReference,
  deleteReference
} from './loan-helpers'

// Export admin helpers (server-side only)
export {
  isAdmin,
  isStaff,
  getStaffRole,
  createClientUser,
  createStaffMember,
  updateStaffMemberRole,
  deleteStaffMember,
  promoteUserToStaff,
  getAllUsersWithPagination,
  getAllStaffMembers
} from './admin-helpers'

export type {
  CreateUserParams,
  CreateStaffParams
} from './admin-helpers'

// Export IBV helpers
export {
  createIbvProviderData,
  getProviderSpecificData,
  determineIbvStatus,
  isIbvDataComplete
} from './ibv-helpers'
