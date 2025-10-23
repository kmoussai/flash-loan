// Admin API client functions
// Use these functions to interact with admin endpoints

export interface CreateClientUserRequest {
  userType: 'client'
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  nationalId?: string
  preferredLanguage?: 'en' | 'fr'
  autoConfirmEmail?: boolean
}

export interface CreateStaffRequest {
  userType: 'staff'
  email: string
  password: string
  role: 'admin' | 'support' | 'intern'
  department?: string
  autoConfirmEmail?: boolean
}

/**
 * Create a new client user (admin only)
 */
export async function createClientUser(params: Omit<CreateClientUserRequest, 'userType'>) {
  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userType: 'client',
      ...params
    })
  })

  return response.json()
}

/**
 * Create a new staff member (admin only)
 */
export async function createStaffMember(params: Omit<CreateStaffRequest, 'userType'>) {
  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userType: 'staff',
      ...params
    })
  })

  return response.json()
}

/**
 * Get all staff members (admin only)
 */
export async function getAllStaff() {
  const response = await fetch('/api/admin/staff/manage', {
    method: 'GET'
  })

  return response.json()
}

/**
 * Update staff member role (admin only)
 */
export async function updateStaffRole(staffId: string, role: 'admin' | 'support' | 'intern') {
  const response = await fetch('/api/admin/staff/manage', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      staffId,
      role
    })
  })

  return response.json()
}

/**
 * Delete staff member (admin only)
 */
export async function deleteStaff(staffId: string) {
  const response = await fetch(`/api/admin/staff/manage?staffId=${staffId}`, {
    method: 'DELETE'
  })

  return response.json()
}

/**
 * Promote existing client user to staff (admin only)
 */
export async function promoteToStaff(
  userId: string, 
  role: 'admin' | 'support' | 'intern',
  department?: string
) {
  const response = await fetch('/api/admin/staff/manage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      role,
      department
    })
  })

  return response.json()
}

// ===========================
// USAGE EXAMPLES
// ===========================

/**
 * Example: Create a new client user
 * 
 * const result = await createClientUser({
 *   email: 'john.doe@example.com',
 *   password: 'SecurePassword123!',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   phone: '+1-514-555-0100',
 *   preferredLanguage: 'en'
 * })
 */

/**
 * Example: Create a new staff member
 * 
 * const result = await createStaffMember({
 *   email: 'jane.admin@flash-loan.ca',
 *   password: 'AdminPassword123!',
 *   role: 'admin',
 *   department: 'Operations'
 * })
 */

/**
 * Example: Create a support staff member
 * 
 * const result = await createStaffMember({
 *   email: 'support@flash-loan.ca',
 *   password: 'SupportPass123!',
 *   role: 'support',
 *   department: 'Customer Service'
 * })
 */

/**
 * Example: Update staff member role
 * 
 * const result = await updateStaffRole(
 *   'user-uuid-here',
 *   'admin'
 * )
 */

/**
 * Example: Promote a client to staff
 * 
 * const result = await promoteToStaff(
 *   'user-uuid-here',
 *   'support',
 *   'Customer Service'
 * )
 */

