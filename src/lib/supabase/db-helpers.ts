// Database helper functions for users and staff tables

import type { User, Staff, UserUpdate, StaffUpdate, KycStatus, StaffRole, Database } from './types'
import { createClient } from './client'
import type { SupabaseClient } from '@supabase/supabase-js'

// ===========================
// USER OPERATIONS (Clients)
// ===========================

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data as User
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: UserUpdate, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  const { data, error } = await supabase
    .from('users')
    // @ts-ignore - Supabase type inference issue with dynamic client
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating user profile:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

/**
 * Update user KYC status
 */
export async function updateKycStatus(userId: string, status: KycStatus, isServer = false) {
  return updateUserProfile(userId, { kyc_status: status }, isServer)
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching users:', error)
    return []
  }
  
  return data as User[]
}

// ===========================
// STAFF OPERATIONS
// ===========================

/**
 * Get staff profile by ID
 */
export async function getStaffProfile(staffId: string, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single()
  
  if (error) {
    console.error('Error fetching staff profile:', error)
    return null
  }
  
  return data as Staff
}

/**
 * Update staff profile
 */
export async function updateStaffProfile(staffId: string, updates: StaffUpdate, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  const { data, error } = await supabase
    .from('staff')
    // @ts-ignore - Supabase type inference issue with dynamic client
    .update(updates)
    .eq('id', staffId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating staff profile:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

/**
 * Update staff role
 */
export async function updateStaffRole(staffId: string, role: StaffRole, isServer = false) {
  return updateStaffProfile(staffId, { role }, isServer)
}

/**
 * Get all staff members (admin only)
 */
export async function getAllStaff(isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching staff:', error)
    return []
  }
  
  return data as Staff[]
}

/**
 * Get staff by role
 */
export async function getStaffByRole(role: StaffRole, isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching staff by role:', error)
    return []
  }
  
  return data as Staff[]
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Check if user is staff member
 */
export async function isStaffMember(userId: string, isServer = false) {
  const staff = await getStaffProfile(userId, isServer)
  return staff !== null
}

/**
 * Get user type (client or staff)
 */
export async function getUserType(userId: string, isServer = false): Promise<'client' | 'staff' | null> {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }
  
  // Check if user exists in staff table
  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('id', userId)
    .single()
  
  if (staffData) return 'staff'
  
  // Check if user exists in users table
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()
  
  if (userData) return 'client'
  
  return null
}

