/**
 * API Route: Update Client Information
 * 
 * PATCH /api/admin/clients/[id]/info
 * 
 * Updates client information in both users table and auth.users
 * If email is updated, it will also update the email in Supabase Auth
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { isAdmin } from '@/src/lib/supabase/admin-helpers'
import { updateUserProfile } from '@/src/lib/supabase/db-helpers'
import type { UserUpdate } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * PATCH - Update client information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Verify admin permission
    const isUserAdmin = await isAdmin(true)
    if (!isUserAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { first_name, last_name, email, phone } = body

    // Validate required fields
    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: {
            first_name: !!first_name,
            last_name: !!last_name,
            email: !!email,
            phone: !!phone
          }
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // Check if client exists and get current email
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', clientId)
      .single()

    if (userError || !existingUser) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const currentEmail = (existingUser as { id: string; email: string | null }).email
    const emailChanged = currentEmail !== email

    // Prepare updates for users table
    const updates: UserUpdate = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone.trim(),
      email: email.trim()
    }

    // Update email in auth.users if it changed
    if (emailChanged) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        clientId,
        {
          email: email.trim(),
          email_confirm: true, // Auto-confirm the new email
          user_metadata: {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            phone: phone.trim()
          }
        }
      )

      if (authError) {
        console.error('[Client Info API] Error updating auth email:', authError)
        return NextResponse.json(
          {
            error: 'Failed to update email in authentication system',
            details: authError.message
          },
          { status: 500 }
        )
      }
    } else {
      // Even if email didn't change, update user_metadata for consistency
      const { error: authError } = await supabase.auth.admin.updateUserById(
        clientId,
        {
          user_metadata: {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            phone: phone.trim()
          }
        }
      )

      if (authError) {
        // Log but don't fail - metadata update is not critical
        console.warn('[Client Info API] Warning: Failed to update auth metadata:', authError.message)
      }
    }

    // Update users table
    const result = await updateUserProfile(clientId, updates, true)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update client information' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Client information updated successfully',
      data: result.data,
      emailUpdated: emailChanged
    })
  } catch (error: any) {
    console.error('[Client Info API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

