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
  Database,
  ApplicationStatus 
} from './types'
import { createClient } from './client'
import type { SupabaseClient } from '@supabase/supabase-js'

// ===========================
// ADDRESS OPERATIONS
// ===========================

/**
 * Create a new address for a client
 */
export async function createAddress(addressData: AddressInsert, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
export async function updateAddress(addressId: string, updates: AddressUpdate, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
export async function setCurrentAddress(clientId: string, addressId: string, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
export async function createLoanApplication(applicationData: LoanApplicationInsert, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
export async function getClientLoanApplications(clientId: string, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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

/**
 * Get a single loan application by ID
 */
export async function getLoanApplication(applicationId: string, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
export async function getLoanApplicationWithDetails(applicationId: string, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  const { data, error } = await supabase
    .from('loan_applications')
    .select(`
      *,
      references (*),
      addresses (*)
    `)
    .eq('id', applicationId)
    .single()
  
  if (error) {
    console.error('Error fetching loan application with details:', error)
    return null
  }
  
  return data
}

/**
 * Update loan application
 */
export async function updateLoanApplication(
  applicationId: string, 
  updates: LoanApplicationUpdate, 
  isServer = false
) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
  return updateLoanApplication(applicationId, { application_status: status }, isServer)
}

/**
 * Get all loan applications (admin/staff only)
 */
export async function getAllLoanApplications(isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
  return updateLoanApplication(applicationId, { assigned_to: staffId }, isServer)
}

// ===========================
// REFERENCE OPERATIONS
// ===========================

/**
 * Create a new reference for a loan application
 */
export async function createReference(referenceData: ReferenceInsert, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
export async function createReferences(referencesData: ReferenceInsert[], isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
export async function getApplicationReferences(applicationId: string, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
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

