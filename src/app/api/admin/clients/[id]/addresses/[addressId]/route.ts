/**
 * API Route: Update Address for Client
 * 
 * PATCH /api/admin/clients/[id]/addresses/[addressId]
 * DELETE /api/admin/clients/[id]/addresses/[addressId]
 * 
 * Updates or deletes an address for a client
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { isAdmin } from '@/src/lib/supabase/admin-helpers'
import { updateAddress, setCurrentAddress } from '@/src/lib/supabase/loan-helpers'
import type { AddressUpdate } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * PATCH - Update an address
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; addressId: string } }
) {
  try {
    const clientId = params.id
    const addressId = params.addressId

    if (!clientId || !addressId) {
      return NextResponse.json(
        { error: 'Client ID and Address ID are required' },
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
    const updates: AddressUpdate = {
      street_number: body.street_number || undefined,
      street_name: body.street_name || undefined,
      apartment_number: body.apartment_number || undefined,
      city: body.city,
      province: body.province,
      postal_code: body.postal_code,
      moving_date: body.moving_date || undefined,
      is_current: body.is_current
    }

    // Validate required fields
    if (!updates.street_name || !updates.city || !updates.province || !updates.postal_code) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: {
            street_name: !!updates.street_name,
            city: !!updates.city,
            province: !!updates.province,
            postal_code: !!updates.postal_code
          }
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseAdminClient()

    // Verify the address belongs to the client
    const { data: address, error: addressError } = await supabase
      .from('addresses')
      .select('id, client_id')
      .eq('id', addressId)
      .eq('client_id', clientId)
      .single()

    if (addressError || !address) {
      return NextResponse.json(
        { error: 'Address not found or does not belong to this client' },
        { status: 404 }
      )
    }

    // If setting as current, update all other addresses first
    if (updates.is_current === true) {
      const setCurrentResult = await setCurrentAddress(clientId, addressId, true)
      if (!setCurrentResult.success) {
        return NextResponse.json(
          { error: setCurrentResult.error || 'Failed to set current address' },
          { status: 500 }
        )
      }
      // Remove is_current from updates since setCurrentAddress already handled it
      const { is_current, ...restUpdates } = updates
      // Only update if there are other fields to update
      if (Object.keys(restUpdates).length > 0) {
        const result = await updateAddress(addressId, restUpdates, true)
        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to update address' },
            { status: 500 }
          )
        }
        return NextResponse.json({
          success: true,
          message: 'Address updated successfully',
          data: result.data
        })
      }
      // If only is_current was being updated, return the result from setCurrentAddress
      return NextResponse.json({
        success: true,
        message: 'Address updated successfully',
        data: setCurrentResult.data
      })
    }

    // Update address (not setting as current)
    const result = await updateAddress(addressId, updates, true)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update address' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Address updated successfully',
      data: result.data
    })
  } catch (error: any) {
    console.error('[Address API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete an address
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; addressId: string } }
) {
  try {
    const clientId = params.id
    const addressId = params.addressId

    if (!clientId || !addressId) {
      return NextResponse.json(
        { error: 'Client ID and Address ID are required' },
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

    const supabase = createServerSupabaseAdminClient()

    // Verify the address belongs to the client
    const { data: address, error: addressError } = await supabase
      .from('addresses')
      .select('id, client_id, is_current')
      .eq('id', addressId)
      .eq('client_id', clientId)
      .single()

    if (addressError || !address) {
      return NextResponse.json(
        { error: 'Address not found or does not belong to this client' },
        { status: 404 }
      )
    }

    // Delete the address
    const { error: deleteError } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId)
      .eq('client_id', clientId)

    if (deleteError) {
      console.error('[Address API] Error deleting address:', deleteError)
      return NextResponse.json(
        {
          error: 'Failed to delete address',
          details: deleteError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully'
    })
  } catch (error: any) {
    console.error('[Address API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

