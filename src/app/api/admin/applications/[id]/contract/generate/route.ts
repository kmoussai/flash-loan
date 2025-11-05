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
import type { ContractTerms } from '@/src/lib/supabase/types'

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

    // Fetch application details
    const { data: application, error: appError } = await supabase
      .from('loan_applications')
      .select(`
        id,
        loan_amount,
        loan_type,
        application_status,
        interest_rate,
        users!loan_applications_client_id_fkey (
          id,
          first_name,
          last_name,
          email
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
      loan_type: string
      application_status: string
      interest_rate: number | null
      users: {
        id: string
        first_name: string | null
        last_name: string | null
        email: string | null
      } | null
    }

    // Check if application is pre-approved
    if (app.application_status !== 'pre_approved') {
      return NextResponse.json(
        { error: 'Application must be pre-approved before generating contract' },
        { status: 400 }
      )
    }

    // Check if contract already exists
    const existingContract = await getContractByApplicationId(applicationId, true)
    if (existingContract.success && existingContract.data) {
      return NextResponse.json(
        { 
          error: 'Contract already exists for this application',
          contract: existingContract.data
        },
        { status: 400 }
      )
    }

    // Calculate contract terms (simplified - you may want to add more sophisticated calculations)
    const loanAmount = parseFloat(String(app.loan_amount))
    // Use application's interest_rate, default to 29% if not set
    const interestRate = app.interest_rate ?? 29.0
    const termMonths = 3 // 3 months term (adjust as needed)
    
    // Calculate total with interest
    const monthlyInterest = (loanAmount * interestRate / 100) / 12
    const totalInterest = monthlyInterest * termMonths
    const totalAmount = loanAmount + totalInterest
    const monthlyPayment = totalAmount / termMonths

    // Generate payment schedule
    const paymentSchedule = []
    const today = new Date()
    for (let i = 0; i < termMonths; i++) {
      const dueDate = new Date(today)
      dueDate.setMonth(dueDate.getMonth() + i + 1)
      paymentSchedule.push({
        due_date: dueDate.toISOString().split('T')[0],
        amount: monthlyPayment,
        principal: loanAmount / termMonths,
        interest: monthlyInterest
      })
    }

    const contractTerms: ContractTerms = {
      interest_rate: interestRate,
      term_months: termMonths,
      principal_amount: loanAmount,
      total_amount: totalAmount,
      fees: {
        origination_fee: 0,
        processing_fee: 0,
        other_fees: 0
      },
      payment_schedule: paymentSchedule,
      terms_and_conditions: 'Standard loan terms and conditions apply. Please review carefully before signing.',
      effective_date: new Date().toISOString(),
      maturity_date: paymentSchedule[paymentSchedule.length - 1].due_date
    }

    // Create contract
    const contractResult = await createLoanContract({
      loan_application_id: applicationId,
      contract_version: 1,
      contract_terms: contractTerms,
      contract_status: 'generated',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    }, true)

    if (!contractResult.success) {
      return NextResponse.json(
        { error: contractResult.error || 'Failed to create contract' },
        { status: 500 }
      )
    }

    // Update application status to contract_pending
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
  } catch (error: any) {
    console.error('Error generating contract:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

