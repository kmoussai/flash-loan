// Admin helper functions for managing users and staff
// Only accessible by admin role staff members

import type { StaffRole, Database, UserInsert, StaffInsert, Staff } from './types'
import { createClient } from './client'
import type { SupabaseClient } from '@supabase/supabase-js'

// ===========================
// PERMISSION CHECKS
// ===========================

/**
 * Check if current user is admin
 */
export async function isAdmin(isServer = false): Promise<boolean> {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('[isAdmin] Error checking admin status:', error.message)
    return false
  }

  return data ? (data as any).role === 'admin' : false
}

/**
 * Check if current user is staff (any role)
 */
export async function isStaff(isServer = false): Promise<boolean> {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('staff')
    .select('id')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[isStaff] Error checking staff status:', error.message)
  }

  return data !== null
}

/**
 * Get current staff role
 */
export async function getStaffRole(isServer = false): Promise<StaffRole | null> {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single()

  return data ? (data as any).role : null
}

// ===========================
// ADMIN-ONLY USER MANAGEMENT
// ===========================

export interface CreateUserParams {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  nationalId?: string
  preferredLanguage?: 'en' | 'fr'
  autoConfirmEmail?: boolean
}

/**
 * Create a new client user (admin only)
 * Uses Supabase Auth Admin API - requires service role
 */
export async function createClientUser(params: CreateUserParams, isServer = true) {
  // Must use server-side client for admin operations
  if (!isServer) {
    return { success: false, error: 'This operation must be performed server-side' }
  }

  const { createServerSupabaseClient, createServerSupabaseAdminClient } = await import('./server')
  const supabase = await createServerSupabaseClient()

  // Verify admin permission
  const isUserAdmin = await isAdmin(true)
  if (!isUserAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  // Now use admin client for user creation (permission already verified)
  const adminClient = createServerSupabaseAdminClient()

  // Create auth user with metadata
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: params.autoConfirmEmail ?? true,
    user_metadata: {
      signup_type: 'client',
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone,
      national_id: params.nationalId,
      preferred_language: params.preferredLanguage || 'en'
    }
  })

  if (authError) {
    return { success: false, error: authError.message }
  }

  // The trigger will automatically create the user in public.users
  // Wait a moment for trigger to complete
  await new Promise(resolve => setTimeout(resolve, 100))

  // Fetch the created user (use admin client to bypass RLS)
  const { data: userData } = await adminClient
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  return { 
    success: true, 
    user: userData,
    authUser: authData.user 
  }
}

export interface CreateStaffParams {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role: StaffRole
  department?: string
  autoConfirmEmail?: boolean
}

/**
 * Create a new staff member (admin only)
 * Uses Supabase Auth Admin API - requires service role
 */
export async function createStaffMember(params: CreateStaffParams, isServer = true) {
  // Must use server-side client for admin operations
  if (!isServer) {
    return { success: false, error: 'This operation must be performed server-side' }
  }

  const { createServerSupabaseClient, createServerSupabaseAdminClient } = await import('./server')
  const supabase = await createServerSupabaseClient()

  // Verify admin permission
  const isUserAdmin = await isAdmin(true)
  if (!isUserAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  // Validate role
  if (!['admin', 'support', 'intern'].includes(params.role)) {
    return { success: false, error: 'Invalid staff role' }
  }

  // Now use admin client for user creation (permission already verified)
  const adminClient = createServerSupabaseAdminClient()

  // Create auth user with metadata
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: params.autoConfirmEmail ?? true,
    user_metadata: {
      signup_type: 'staff',
      role: params.role,
      department: params.department,
      first_name: params.firstName,
      last_name: params.lastName
    }
  })

  if (authError) {
    return { success: false, error: authError.message }
  }

  // The trigger will automatically create the staff in public.staff
  // and insert first_name/last_name into public.users from user_metadata
  // Wait a moment for trigger to complete
  await new Promise(resolve => setTimeout(resolve, 100))

  // Fetch the created staff member (use admin client to bypass RLS)
  const { data: staffData } = await adminClient
    .from('staff')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  return { 
    success: true, 
    staff: staffData,
    authUser: authData.user 
  }
}

/**
 * Update staff member role (admin only)
 */
export async function updateStaffMemberRole(
  staffId: string, 
  newRole: StaffRole,
  isServer = true
) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }

  // Verify admin permission
  const isUserAdmin = await isAdmin(isServer)
  if (!isUserAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  const { data, error } = await supabase
    .from('staff')
    // @ts-ignore
    .update({ role: newRole })
    .eq('id', staffId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Delete staff member (admin only)
 * This will also delete the auth user due to CASCADE
 */
export async function deleteStaffMember(staffId: string, isServer = true) {
  // Must use server-side client for admin operations
  if (!isServer) {
    return { success: false, error: 'This operation must be performed server-side' }
  }

  const { createServerSupabaseClient } = await import('./server')
  const supabase = await createServerSupabaseClient()

  // Verify admin permission
  const isUserAdmin = await isAdmin(true)
  if (!isUserAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  // Delete the auth user (this will cascade to staff table)
  const { error } = await supabase.auth.admin.deleteUser(staffId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ===========================
// DOCUMENT REQUESTS - MAGIC LINKS
// ===========================

interface SendDocumentRequestMagicLinkResult {
  success: boolean
  error?: string
  email?: string
  redirectTo?: string
}

/**
 * Generate and log a signed upload link for a document request (no auth magic link)
 * - Finds user email via document_requests -> loan_applications -> users
 * - Builds signed token URL to upload-documents page
 * - Updates document_requests.magic_link_sent_at as a send timestamp
 */
export async function sendDocumentRequestMagicLink(
  requestId: string
): Promise<SendDocumentRequestMagicLinkResult> {
  try {
    const { createServerSupabaseAdminClient } = await import('./server')
    const { getAppUrl } = await import('../config')
    const { signRequestToken } = await import('../security/token')
    const adminClient = createServerSupabaseAdminClient()

    // Resolve email for the request
    const { data: reqRow, error: reqErr } = await adminClient
      .from('document_requests' as any)
      .select('id, loan_application_id, document_type_id')
      .eq('id', requestId)
      .single()

    if (reqErr || !reqRow) {
      return { success: false, error: reqErr?.message || 'Request not found' }
    }

    // Join to users via loan_applications
    const { data: appJoin, error: joinErr } = await adminClient
      .from('loan_applications' as any)
      .select('id, client_id, users:client_id(email, preferred_language)')
      .eq('id', (reqRow as any).loan_application_id)
      .single()

    if (joinErr || !appJoin) {
      return { success: false, error: joinErr?.message || 'Loan application not found' }
    }

    const email: string | null = (appJoin as any)?.users?.email || null
    const preferredLanguage: 'en' | 'fr' = ((appJoin as any)?.users?.preferred_language === 'fr') ? 'fr' : 'en'
    if (!email) {
      return { success: false, error: 'Client email not available' }
    }

    const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes
    const token = signRequestToken(requestId, expiresAt)
    const tokenHash = (await import('crypto')).createHash('sha256').update(token).digest('hex')
    const publicLink = `${getAppUrl()}/${preferredLanguage}/upload-documents?req=${encodeURIComponent(requestId)}&token=${encodeURIComponent(token)}`

    // Log the generated link (to be sent externally)
    console.log('[sendDocumentRequestLink] Link generated for:', email, 'URL:', publicLink)

    // Save token hash and expiry; update sent timestamp
    await adminClient
      .from('document_requests' as any)
      // @ts-ignore - using admin client with loosely typed table
      .update({ magic_link_sent_at: new Date().toISOString(), request_token_hash: tokenHash, expires_at: new Date(expiresAt).toISOString() } as any)
      .eq('id', requestId)

    return { success: true, email, redirectTo: publicLink }
  } catch (e: any) {
    console.error('[sendDocumentRequestMagicLink] Unexpected error:', e?.message)
    return { success: false, error: e?.message || 'Unexpected error' }
  }
}

/**
 * Promote existing client user to staff (admin only)
 */
export async function promoteUserToStaff(
  userId: string,
  role: StaffRole,
  department?: string,
  isServer = true
) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }

  // Verify admin permission
  const isUserAdmin = await isAdmin(isServer)
  if (!isUserAdmin) {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }

  // Check if user exists in users table
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (!userData) {
    return { success: false, error: 'User not found' }
  }

  // Check if already staff
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('id', userId)
    .single()

  if (existingStaff) {
    return { success: false, error: 'User is already a staff member' }
  }

  // Insert into staff table
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    // @ts-ignore - Supabase type inference issue
    .insert({
      id: userId,
      role: role,
      department: department || null
    })
    .select()
    .single()

  if (staffError) {
    return { success: false, error: staffError.message }
  }

  // Remove from users table
  await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  return { success: true, data: staffData }
}

// ===========================
// ADMIN USER QUERIES
// ===========================

/**
 * Get all users with pagination (admin/support/intern can access)
 */
export async function getAllUsersWithPagination(
  page = 1,
  limit = 50,
  isServer = false
) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }

  // Verify staff permission (any role can view)
  const isUserStaff = await isStaff(isServer)
  if (!isUserStaff) {
    return { success: false, error: 'Unauthorized: Staff access required' }
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[getAllUsersWithPagination] Error:', error.message)
    return { success: false, error: error.message }
  }

  return {
    success: true,
    users: data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }
}

/**
 * Get all staff members (admin can access all, support can view, intern can view own)
 */
export async function getAllStaffMembers(isServer = false) {
  let supabase: SupabaseClient<Database>
  if (isServer) {
    const { createServerSupabaseClient } = await import('./server')
    supabase = await createServerSupabaseClient()
  } else {
    supabase = createClient()
  }

  // RLS will handle permissions automatically
  // Join with users table to get first_name and last_name
  // Since staff.id = users.id, we can manually join them
  const { data: staffData, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false }) as { data: Staff[] | null, error: any }

  if (error) {
    console.error('[getAllStaffMembers] Error:', error.message)
    return { success: false, error: error.message }
  }

  if (!staffData) {
    console.error('[getAllStaffMembers] No staff data returned')
    return { success: false, error: 'No staff data returned' }
  }

  // Manually fetch user details for each staff member
  const staffIds = staffData.map(s => s.id)
  
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .in('id', staffIds) as { data: { id: string, first_name: string | null, last_name: string | null, email: string | null }[] | null, error: any }

  if (usersError) {
    console.error('[getAllStaffMembers] Error fetching users:', usersError.message)
    // Return staff data without user details if users fetch fails
    return { success: true, staff: staffData.map(s => ({ ...s, users: null })) }
  }

  if (!usersData) {
    console.error('[getAllStaffMembers] No users data returned')
    // Return staff data without user details if no users data
    return { success: true, staff: staffData.map(s => ({ ...s, users: null })) }
  }

  // Combine staff with their user details
  const staffWithUsers = staffData.map(staff => {
    const user = usersData.find(u => u.id === staff.id)
    return {
      ...staff,
      users: user || null
    }
  })

  return { success: true, staff: staffWithUsers }
}

