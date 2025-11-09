/**
 * API Route: Generate Loan Contract
 * 
 * POST /api/admin/applications/[id]/contract/generate
 * 
 * Generates a new contract for an approved loan application
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'
import { createLoanContract, getContractByApplicationId } from '@/src/lib/supabase/contract-helpers'
import type { ContractTerms, PaymentFrequency } from '@/src/lib/supabase/types'
import { getPaymentsPerMonth, assertFrequency } from '@/src/lib/utils/frequency'
import { buildContractTermsFromApplication } from '@/src/lib/contracts/terms'

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

    const supabase = await createServerSupabaseAdminClient()

    let payload: any = {}
    try {
      payload = await request.json()
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('No JSON payload provided or failed to parse payload:', error)
      }
      payload = {}
    }

    // Fetch application details
    const { data: application, error: appError } = await supabase
      .from('loan_applications')
      .select(`
        id,
        loan_amount,
        application_status,
        interest_rate,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          preferred_language
        ),
        address_id,
        addresses!loan_applications_address_id_fkey (
          street_number,
          street_name,
          apartment_number,
          city,
          province,
          postal_code
        )
      `)
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const app = application as {
      id: string
      loan_amount: number
      application_status: string
      interest_rate: number | null
      users: {
        id: string
        first_name: string | null
        last_name: string | null
        email: string | null
        phone: string | null
        preferred_language: string | null
      } | null
      addresses?: {
        street_number: string | null
        street_name: string | null
        apartment_number: string | null
        city: string | null
        province: string | null
        postal_code: string | null
      } | null
    }

    // Allow generation when application is pre-approved OR already in contract flow (pending)
    const applicationStatus = String(app.application_status || '')
    const canGenerateInitial = applicationStatus === 'pre_approved'
    const canRegenerate = applicationStatus === 'contract_pending'

    // Get existing contract (if any)
    const existingContract = await getContractByApplicationId(applicationId, true)
    const existing = existingContract.success ? existingContract.data : null

    // Guard rails:
    // 1) If a contract exists and is signed, block regeneration
    if (existing && existing.contract_status === 'signed') {
      return NextResponse.json(
        { error: 'Contract already signed; regeneration is not allowed' },
        { status: 400 }
      )
    }
    // 2) If no contract exists yet, require application to be pre-approved
    if (!existing && !canGenerateInitial) {
      return NextResponse.json(
        { error: 'Application must be pre-approved before generating contract' },
        { status: 400 }
      )
    }

    // Build contract terms (calculation + borrower details + viewer aliases)
    const contractTerms = buildContractTermsFromApplication(
      {
        id: app.id,
        loan_amount: app.loan_amount,
        interest_rate: app.interest_rate,
        users: app.users,
        addresses: app.addresses ?? null
      },
      {
        loanAmount: payload?.loanAmount,
        paymentFrequency: payload?.paymentFrequency,
        numberOfPayments: payload?.numberOfPayments,
        termMonths: payload?.termMonths,
        firstPaymentDate: payload?.firstPaymentDate
      }
    )

    // Create or update contract
    if (!existing) {
      // Create new
      const contractResult = await createLoanContract({
        loan_application_id: applicationId,
        contract_version: 1,
        contract_terms: contractTerms,
        contract_status: 'generated',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }, true)

      if (!contractResult.success) {
        return NextResponse.json(
          { error: contractResult.error || 'Failed to create contract' },
          { status: 500 }
        )
      }

      // Move application into contract flow
      await (supabase
        .from('loan_applications') as any)
        .update({ 
          application_status: 'contract_pending',
          contract_generated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      return NextResponse.json({
        success: true,
        contract: contractResult.data
      })
    } else {
      // Regenerate (update existing, bump version)
      const nextVersion = (existing.contract_version ?? 1) + 1
      const { updateLoanContract } = await import('@/src/lib/supabase/contract-helpers')
      const updateResult = await updateLoanContract(
        existing.id,
        {
          contract_terms: contractTerms,
          contract_version: nextVersion,
          contract_status: 'generated',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        true
      )
      if (!updateResult.success) {
        return NextResponse.json(
          { error: updateResult.error || 'Failed to regenerate contract' },
          { status: 500 }
        )
      }
      return NextResponse.json({
        success: true,
        contract: updateResult.data
      })
    }
  } catch (error: any) {
    console.error('Error generating contract:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

