// Database helper functions for loan application system

import type {
  Address,
  AddressInsert,
  AddressUpdate,
  LoanApplication,
  LoanApplicationInsert,
  LoanApplicationUpdate,
  Reference,
  ReferenceInsert,
  ReferenceUpdate,
  ApplicationStatus,
  DocumentRequest,
  DocumentRequestStatus,
  DocumentRequestUpdate,
  RequestKind,
  RequestFormSubmission,
  RequestFormSubmissionInsert,
  RequestFormSubmissionUpdate,
  LoanUpdate
} from './types'
import { createClient } from './client'
import { Loan } from '@/src/types'

interface DocumentRequestRow extends DocumentRequest {
  loan_applications?: {
    id: string
    loan_amount: number | null
    application_status: ApplicationStatus
    created_at: string
  } | null
  document_types?: {
    id: string
    name: string | null
    slug?: string | null
  } | null
  form_schema: Record<string, any>
  request_form_submissions?: Array<{
    id: string
    form_data: Record<string, any> | null
    submitted_at: string
    submitted_by?: string | null
  }>
}

export interface ClientDocumentRequestSummary {
  id: string
  loan_application_id: string
  document_type_id: string | null
  request_kind: RequestKind
  status: DocumentRequestStatus
  expires_at: string | null
  requested_by: string | null
  created_at: string
  magic_link_sent_at: string | null
  form_schema: Record<string, any> | null
  request_form_submissions: Array<{
    id: string
    form_data: Record<string, any>
    submitted_at: string
    submitted_by?: string | null
  }>
  application: {
    id: string
    loan_amount: number | null
    application_status: ApplicationStatus
    created_at: string
  } | null
  document_type: {
    id: string
    name: string | null
    slug?: string | null
  } | null
}

// ===========================
// ADDRESS OPERATIONS
// ===========================

/**
 * Create a new address for a client
 */
export async function createAddress(
  addressData: AddressInsert,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('addresses')
    .insert(addressData)
    .select()
    .single()

  if (error) {
    console.error('Error creating address:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as Address, error: null }
}

/**
 * Get all addresses for a client
 */
export async function getClientAddresses(clientId: string, isServer = false) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching addresses:', error)
    return []
  }

  return data as Address[]
}

/**
 * Get current address for a client
 */
export async function getCurrentAddress(clientId: string, isServer = false) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .single()

  if (error) {
    console.error('Error fetching current address:', error)
    return null
  }

  return data as Address
}

/**
 * Update an address
 */
export async function updateAddress(
  addressId: string,
  updates: AddressUpdate,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('addresses')
    .update(updates)
    .eq('id', addressId)
    .select()
    .single()

  if (error) {
    console.error('Error updating address:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Set an address as current (and mark others as not current)
 */
export async function setCurrentAddress(
  clientId: string,
  addressId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  // First, mark all addresses as not current
  await supabase
    .from('addresses')
    .update({ is_current: false })
    .eq('client_id', clientId)

  // Then mark the specified address as current
  const { data, error } = await supabase
    .from('addresses')
    .update({ is_current: true })
    .eq('id', addressId)
    .select()
    .single()

  if (error) {
    console.error('Error setting current address:', error)
    return { success: false, error: error.message }
  }

  // Update user's current_address_id
  await supabase
    .from('users')
    .update({ current_address_id: addressId })
    .eq('id', clientId)

  return { success: true, data }
}

// ===========================
// LOAN APPLICATION OPERATIONS
// ===========================

/**
 * Create a new loan application
 */
export async function createLoanApplication(
  applicationData: LoanApplicationInsert,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loan_applications')
    .insert(applicationData)
    .select()
    .single()

  if (error) {
    console.error('Error creating loan application:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as LoanApplication, error: null }
}

/**
 * Get all loan applications for a client
 */
export async function getClientLoanApplications(
  clientId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching loan applications:', error)
    return []
  }

  return data as LoanApplication[]
}

export async function getLoanApplicationById(
  applicationId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()
  const { data, error } = await supabase
    .from('loan_applications')
    .select('ibv_results')
    .eq('id', applicationId)
    .single()

  if (error) {
    console.error('Error fetching loan application by ID:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as LoanApplication, error: null }
}
export async function getLoanById(loanId: string, isServer = false) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching loan by ID:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as Loan, error: null }
}
export async function getLoanByApplicationId(
  applicationId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching loan by application ID:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as Loan, error: null }
}

/**
 * Get a single loan application by ID
 */
export async function getLoanApplication(
  applicationId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (error) {
    console.error('Error fetching loan application:', error)
    return null
  }

  return data as LoanApplication
}

/**
 * Get loan application with references and address
 */
export async function getLoanApplicationWithDetails(
  applicationId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loan_applications')
    .select(
      `
      *,
      references (*),
      addresses (*)
    `
    )
    .eq('id', applicationId)
    .single()

  if (error) {
    console.error('Error fetching loan application with details:', error)
    return null
  }

  return data
}
/**
 * Update loan details
 */
type UpdateLoanOptions =
  | boolean
  | {
      isServer?: boolean
      useAdminClient?: boolean
    }

export async function updateLoan(
  loanId: string,
  updates: LoanUpdate,
  options: UpdateLoanOptions = false
) {
  const normalizedOptions =
    typeof options === 'boolean' ? { isServer: options } : options

  const { isServer = false, useAdminClient = false } = normalizedOptions

  const supabase: any = useAdminClient
    ? await (await import('./server')).createServerSupabaseAdminClient()
    : isServer
      ? await (await import('./server')).createServerSupabaseClient()
      : createClient()
      
  const { data, error } = await supabase
    .from('loans')
    .update(updates)
    .eq('id', loanId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('Error updating loan:', error)
    return { success: false, error: error.message }
  }

  if (!data) {
    return { success: false, error: 'Loan not found' }
  }

  return { success: true, data: data as Loan }
}

// TODO: Update loan ampunt when generating contract
export async function updateLoanAmount(
  id: string,
  amount: number,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loans')
    .update({ principal_amount: amount })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('Error updating loan amount:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Update loan application
 */
export async function updateLoanApplication(
  applicationId: string,
  updates: LoanApplicationUpdate,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loan_applications')
    .update(updates)
    .eq('id', applicationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating loan application:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  isServer = false
) {
  return updateLoanApplication(
    applicationId,
    { application_status: status },
    isServer
  )
}

/**
 * Get all loan applications (admin/staff only)
 */
export async function getAllLoanApplications(isServer = false) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all loan applications:', error)
    return []
  }

  return data as LoanApplication[]
}

/**
 * Assign application to staff member
 */
export async function assignApplicationToStaff(
  applicationId: string,
  staffId: string,
  isServer = false
) {
  return updateLoanApplication(
    applicationId,
    { assigned_to: staffId },
    isServer
  )
}

// ===========================
// REFERENCE OPERATIONS
// ===========================

/**
 * Create a new reference for a loan application
 */
export async function createReference(
  referenceData: ReferenceInsert,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('references')
    .insert(referenceData)
    .select()
    .single()

  if (error) {
    console.error('Error creating reference:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as Reference, error: null }
}

/**
 * Create multiple references at once
 */
export async function createReferences(
  referencesData: ReferenceInsert[],
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('references')
    .insert(referencesData)
    .select()

  if (error) {
    console.error('Error creating references:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as Reference[], error: null }
}

/**
 * Get all references for a loan application
 */
export async function getApplicationReferences(
  applicationId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('references')
    .select('*')
    .eq('loan_application_id', applicationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching references:', error)
    return []
  }

  return data as Reference[]
}

/**
 * Update a reference
 */
export async function updateReference(
  referenceId: string,
  updates: ReferenceUpdate,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('references')
    .update(updates)
    .eq('id', referenceId)
    .select()
    .single()

  if (error) {
    console.error('Error updating reference:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Delete a reference
 */
export async function deleteReference(referenceId: string, isServer = false) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { error } = await supabase
    .from('references')
    .delete()
    .eq('id', referenceId)

  if (error) {
    console.error('Error deleting reference:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ===========================
// DOCUMENT REQUEST OPERATIONS
// ===========================

export async function getDocumentRequestsForApplication(
  loanApplicationId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('document_requests')
    .select('*')
    .eq('loan_application_id', loanApplicationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching document requests:', error)
    return []
  }

  return (data || []) as DocumentRequest[]
}

export async function getClientDocumentRequests(
  clientId: string,
  isServer = false
): Promise<ClientDocumentRequestSummary[]> {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('document_requests')
    .select(
      `
        *,
        request_form_submissions (
          id,
          form_data,
          submitted_at,
          submitted_by
        ),
        loan_applications!inner (
          id,
          loan_amount,
          application_status,
          created_at
        ),
        document_types (
          id,
          name,
          slug
        )
      `
    )
    .eq('loan_applications.client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching client document requests:', error)
    return []
  }

  const rows = (data || []) as DocumentRequestRow[]

  return rows.map(row => ({
    id: row.id,
    loan_application_id: row.loan_application_id,
    document_type_id: row.document_type_id ?? null,
    request_kind: row.request_kind as RequestKind,
    status: row.status as DocumentRequestStatus,
    expires_at: row.expires_at ?? null,
    requested_by: row.requested_by ?? null,
    created_at: row.created_at,
    magic_link_sent_at: row.magic_link_sent_at ?? null,
    form_schema:
      row.form_schema && typeof row.form_schema === 'object'
        ? row.form_schema
        : null,
    request_form_submissions: Array.isArray(row.request_form_submissions)
      ? row.request_form_submissions.map(sub => ({
          id: sub.id,
          form_data: sub.form_data ?? {},
          submitted_at: sub.submitted_at,
          submitted_by: sub.submitted_by ?? null
        }))
      : [],
    application: row.loan_applications
      ? {
          id: row.loan_applications.id,
          loan_amount: row.loan_applications.loan_amount ?? null,
          application_status: row.loan_applications.application_status,
          created_at: row.loan_applications.created_at
        }
      : null,
    document_type: row.document_types
      ? {
          id: row.document_types.id,
          name: row.document_types.name ?? null,
          slug: row.document_types.slug ?? null
        }
      : null
  }))
}

export async function getDocumentRequestById(
  requestId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('document_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (error) {
    console.error('Error fetching document request:', error)
    return null
  }

  return data as DocumentRequest
}

export async function updateDocumentRequest(
  requestId: string,
  updates: DocumentRequestUpdate,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('document_requests')
    .update(updates)
    .eq('id', requestId)
    .select()
    .single()

  if (error) {
    console.error('Error updating document request:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data as DocumentRequest }
}

// ===========================
// REQUEST FORM SUBMISSIONS
// ===========================

export async function createRequestFormSubmission(
  submission: RequestFormSubmissionInsert,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('request_form_submissions')
    .insert(submission)
    .select()
    .single()

  if (error) {
    console.error('Error creating request form submission:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data as RequestFormSubmission }
}

export async function getRequestFormSubmissions(
  requestId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('request_form_submissions')
    .select('*')
    .eq('document_request_id', requestId)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching request form submissions:', error)
    return []
  }

  return (data || []) as RequestFormSubmission[]
}

export async function getLatestRequestFormSubmission(
  requestId: string,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('request_form_submissions')
    .select('*')
    .eq('document_request_id', requestId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching latest request form submission:', error)
    return null
  }

  return data as RequestFormSubmission | null
}

export async function updateRequestFormSubmission(
  submissionId: string,
  updates: RequestFormSubmissionUpdate,
  isServer = false
) {
  const supabase: any = isServer
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()

  const { data, error } = await supabase
    .from('request_form_submissions')
    .update(updates)
    .eq('id', submissionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating request form submission:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data as RequestFormSubmission }
}
