/**
 * API Route: Get/Delete Contract for Application
 * 
 * GET /api/admin/applications/[id]/contract - Returns the contract for a specific loan application
 * DELETE /api/admin/applications/[id]/contract - Deletes the contract (only if not sent)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getContractByApplicationId, deleteContract } from '@/src/lib/supabase/contract-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    const contractResult = await getContractByApplicationId(applicationId, true)

    if (!contractResult.success) {
      return NextResponse.json(
        { error: contractResult.error || 'Failed to fetch contract' },
        { status: 500 }
      )
    }

    if (!contractResult.data) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      contract: contractResult.data
    })
  } catch (error: any) {
    console.error('Error fetching contract:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    // Get the contract first to get its ID
    const contractResult = await getContractByApplicationId(applicationId, true)

    if (!contractResult.success) {
      return NextResponse.json(
        { error: contractResult.error || 'Failed to fetch contract' },
        { status: 500 }
      )
    }

    if (!contractResult.data) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    const contract = contractResult.data

    // Delete the contract (function will check if it can be deleted)
    const deleteResult = await deleteContract(contract.id, true)

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: deleteResult.error || 'Failed to delete contract' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Contract deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting contract:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

