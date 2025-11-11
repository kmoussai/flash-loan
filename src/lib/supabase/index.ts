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
  Loan,
  LoanPayment,
  DocumentRequest,
  RequestFormSubmission,
  UserInsert, 
  StaffInsert, 
  AddressInsert,
  LoanApplicationInsert,
  ReferenceInsert,
  LoanInsert,
  LoanPaymentInsert,
  DocumentRequestInsert,
  RequestFormSubmissionInsert,
  LoanContract,
  LoanContractInsert,
  LoanContractUpdate,
  ContractTerms,
  ContractStatus,
  ClientSignatureData,
  UserUpdate, 
  StaffUpdate,
  AddressUpdate,
  LoanApplicationUpdate,
  ReferenceUpdate,
  LoanUpdate,
  LoanPaymentUpdate,
  DocumentRequestUpdate,
  RequestFormSubmissionUpdate,
  StaffRole, 
  KycStatus,
  AddressType,
  ApplicationStatus,
  LoanStatus,
  PaymentStatus,
  IncomeSourceType,
  IbvProvider,
  IbvStatus,
  IbvProviderData,
  FlinksIbvData,
  InveriteIbvData,
  PlaidIbvData,
  DocumentRequestStatus,
  RequestKind
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
  updateLoan,
  updateLoanApplication,
  updateApplicationStatus,
  getAllLoanApplications,
  assignApplicationToStaff,
  createReference,
  createReferences,
  getApplicationReferences,
  updateReference,
  deleteReference,
  getDocumentRequestsForApplication,
  getClientDocumentRequests,
  getDocumentRequestById,
  updateDocumentRequest,
  createRequestFormSubmission,
  getRequestFormSubmissions,
  getLatestRequestFormSubmission,
  updateRequestFormSubmission
} from './loan-helpers'

// Export contract helpers
export {
  createLoanContract,
  getContractByApplicationId,
  getContractById,
  updateLoanContract,
  updateContractStatus,
  signContract,
  sendContract
} from './contract-helpers'

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
