/**
 * API Route: Send Contract
 * 
 * POST /api/admin/applications/[id]/contract/send
 * 
 * Sends a contract to the client (marks as sent)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getContractByApplicationId, sendContract } from '@/src/lib/supabase/contract-helpers'

export async function POST(
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

    const body = await request.json()
    const { method = 'email' } = body

    if (!['email', 'sms', 'portal'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid send method. Must be email, sms, or portal' },
        { status: 400 }
      )
    }

    // Get contract
    const contractResult = await getContractByApplicationId(applicationId, true)

    if (!contractResult.success || !contractResult.data) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    const contract = contractResult.data

    // Update contract status
    const sendResult = await sendContract(contract.id, method as 'email' | 'sms' | 'portal', true)

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send contract' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      contract: sendResult.data
    })
  } catch (error: any) {
    console.error('Error sending contract:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

