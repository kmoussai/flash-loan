/**
 * API Route: Add/Update Bank Account for Client
 * 
 * POST /api/admin/clients/[id]/bank-account
 * 
 * Adds or updates bank account information for a client
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { isAdmin } from '@/src/lib/supabase/admin-helpers'
import type { BankAccount } from '@/src/types'

export const dynamic = 'force-dynamic'

export async function POST(
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
    const {
      bank_name,
      account_number,
      transit_number,
      institution_number,
      account_name
    } = body

    // Validate required fields
    if (!bank_name || !account_number || !transit_number || !institution_number || !account_name) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: {
            bank_name: !!bank_name,
            account_number: !!account_number,
            transit_number: !!transit_number,
            institution_number: !!institution_number,
            account_name: !!account_name
          }
        },
        { status: 400 }
      )
    }

    // Validate format
    if (transit_number.length !== 5) {
      return NextResponse.json(
        { error: 'Transit number must be 5 digits' },
        { status: 400 }
      )
    }

    if (institution_number.length !== 3) {
      return NextResponse.json(
        { error: 'Institution number must be 3 digits' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // Check if client exists
    const { data: client, error: clientError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Prepare bank account data
    const bankAccount: BankAccount = {
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      transit_number: transit_number.trim(),
      institution_number: institution_number.trim(),
      account_name: account_name.trim()
    }

    // Update user profile with bank account
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      // @ts-ignore - Supabase type inference issue with bank_account field
      .update({
        bank_account: bankAccount,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .select('id, bank_account')
      .single()

    if (updateError) {
      console.error('[Bank Account API] Error updating bank account:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update bank account',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    if (!updatedUser) {
      return NextResponse.json(
        {
          error: 'Failed to retrieve updated user data'
        },
        { status: 500 }
      )
    }

    // Type assertion for the result
    const userData = updatedUser as { id: string; bank_account: BankAccount | null }

    return NextResponse.json({
      success: true,
      message: 'Bank account updated successfully',
      data: {
        client_id: userData.id,
        bank_account: userData.bank_account
      }
    })
  } catch (error: any) {
    console.error('[Bank Account API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

