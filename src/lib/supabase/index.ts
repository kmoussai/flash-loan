// Supabase exports - central import point
// Note: createServerSupabaseClient is not exported here to prevent
// it from being imported in Client Components. Import it directly
// from './server' in Server Components when needed.
export { createClient } from './client'
export type { Loan } from '@/src/types'
// Export all types
export type {
  Database, 
  User, 
  Staff, 
  Address,
  LoanApplication,
  Reference,
  LoanPayment,
  LoanPaymentSchedule,
  AcceptPaySyncLog,
  DocumentRequest,
  RequestFormSubmission,
  UserInsert, 
  StaffInsert, 
  AddressInsert,
  LoanApplicationInsert,
  ReferenceInsert,
  LoanInsert,
  LoanPaymentInsert,
  LoanPaymentScheduleInsert,
  AcceptPaySyncLogInsert,
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
  LoanPaymentScheduleUpdate,
  DocumentRequestUpdate,
  RequestFormSubmissionUpdate,
  StaffRole, 
  KycStatus,
  AddressType,
  ApplicationStatus,
  LoanStatus,
  PaymentStatus,
  PaymentScheduleStatus,
  IncomeSourceType,
  IbvProvider,
  IbvStatus,
  IbvProviderData,
  FlinksIbvData,
  InveriteIbvData,
  PlaidIbvData,
  DocumentRequestStatus,
  RequestKind,
  AcceptPayCustomerStatus,
  AcceptPayTransactionStatus,
  AcceptPayTransactionType
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

// Export API authentication helpers (server-side only)
export {
  requireAuth,
  requireStaff,
  requireAdmin,
  createAuthErrorResponse,
  checkAdminAccess,
  checkStaffAccess
} from './api-auth'

export type { AuthResult } from './api-auth'

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

// Export notification helpers
export {
  createNotification,
  getNotificationsForRecipient,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from './notification-helpers'

export type {
  CreateNotificationParams,
  GetNotificationsParams,
  MarkNotificationAsReadParams
} from './notification-helpers'

export type {
  Notification,
  NotificationInsert,
  NotificationUpdate,
  NotificationRecipient
} from '@/src/types'

// ===========================
// ACCEPT PAY HELPERS
// ===========================
// ⚠️ SERVER-ONLY: These helpers should ONLY be called from API routes or server-side code.
// NEVER import these functions in client components.

export {
  mapUserToAcceptPayCustomer,
  createAcceptPayCustomer,
  getAcceptPayCustomerId,
  updateAcceptPayCustomerStatus,
  initiateDisbursement,
  authorizeDisbursement,
  updateDisbursementStatus,
  getDisbursementStatus,
  createPaymentSchedule,
  initiatePaymentCollection,
  authorizePayment,
  updatePaymentStatus,
  voidPayment,
  syncTransactionUpdates,
  logSync,
  getLastSyncTime
} from './accept-pay-helpers'
