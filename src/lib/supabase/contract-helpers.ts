// Database helper functions for loan contract system

import type { 
  LoanContract, 
  LoanContractInsert, 
  LoanContractUpdate,
  ContractStatus,
} from './types'
import { createClient } from './client'
import { Loan } from '@/src/types'

type LoanContractWithLoanNumber = LoanContract & { loan?: Pick<Loan, 'loan_number'> | null }

// ===========================
// CONTRACT OPERATIONS
// ===========================

/**
 * Create a new loan contract
 */
export async function createLoanContract(contractData: LoanContractInsert, isServer = false) {
  const supabase: any = isServer 
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()
  
  const { data, error } = await supabase
    .from('loan_contracts')
    .insert(contractData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating loan contract:', error)
    return { success: false, error: error.message, data: null }
  }
  
  return { success: true, data: data as LoanContract, error: null }
}

/**
 * Get contract by application ID
 */
export async function getContractByApplicationId(applicationId: string, isServer = false) {
  const supabase: any = isServer 
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()
  
  const { data, error } = await supabase
    .from('loan_contracts')
    .select(`
      *,
      loan:loans!loan_contracts_loan_id_fkey (
        loan_number
      )
    `)
    .eq('loan_application_id', applicationId)
    .order('contract_version', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching contract:', error)
    return { success: false, error: error.message, data: null }
  }
  
  return { success: true, data: data as LoanContractWithLoanNumber | null, error: null }
}

/**
 * Get contract by ID
 */
export async function getContractById(contractId: string, isServer = false) {
  const supabase: any = isServer 
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()
  
  const { data, error } = await supabase
    .from('loan_contracts')
    .select('*')
    .eq('id', contractId)
    .single()
  
  if (error) {
    console.error('Error fetching contract:', error)
    return { success: false, error: error.message, data: null }
  }
  
  return { success: true, data: data as LoanContract, error: null }
}

/**
 * Update contract
 */
export async function updateLoanContract(
  contractId: string, 
  updates: LoanContractUpdate, 
  isServer = false
) {
  const supabase: any = isServer 
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()
  
  const { data, error } = await supabase
    .from('loan_contracts')
    .update(updates)
    .eq('id', contractId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating contract:', error)
    return { success: false, error: error.message, data: null }
  }
  
  return { success: true, data: data as LoanContract, error: null }
}

/**
 * Update contract status
 */
export async function updateContractStatus(
  contractId: string, 
  status: ContractStatus, 
  isServer = false
) {
  return updateLoanContract(contractId, { contract_status: status }, isServer)
}

/**
 * Sign contract (client signature)
 */
export async function signContract(
  contractId: string,
  signatureData: {
    signature_method: 'click_to_sign' | 'drawn_signature' | 'uploaded'
    ip_address: string
    user_agent: string
    signed_from_device?: string
    signature_timestamp: string
    signature_hash?: string
  },
  isServer = false
) {
  const supabase: any = isServer 
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()
  
  const { data, error } = await supabase
    .from('loan_contracts')
    .update({
      contract_status: 'signed',
      client_signed_at: new Date().toISOString(),
      client_signature_data: signatureData
    })
    .eq('id', contractId)
    .select()
    .single()
  
  if (error) {
    console.error('Error signing contract:', error)
    return { success: false, error: error.message, data: null }
  }
  
  return { success: true, data: data as LoanContract, error: null }
}

/**
 * Send contract (mark as sent)
 */
export async function sendContract(
  contractId: string,
  method: 'email' | 'sms' | 'portal',
  isServer = false
) {
  const supabase: any = isServer 
    ? await (await import('./server')).createServerSupabaseClient()
    : createClient()
  
  const { data, error } = await supabase
    .from('loan_contracts')
    .update({
      contract_status: 'sent',
      sent_at: new Date().toISOString(),
      sent_method: method
    })
    .eq('id', contractId)
    .select()
    .single()
  
  if (error) {
    console.error('Error sending contract:', error)
    return { success: false, error: error.message, data: null }
  }
  
  return { success: true, data: data as LoanContract, error: null }
}

