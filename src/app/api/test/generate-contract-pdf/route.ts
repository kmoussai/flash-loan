/**
 * Test API Endpoint: Generate Contract PDF
 *
 * GET /api/test/generate-contract-pdf
 *
 * Generates a contract PDF using mocked data for testing purposes.
 * Uses the same HTML generation as ContractViewer component and converts it to PDF.
 * This endpoint is temporary and should be removed or secured in production.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateContractPDFFromHTML } from '@/src/lib/contracts/html-to-pdf'
import type { LoanContract } from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

/**
 * Create mocked contract data for testing
 */
function createMockContract(): LoanContract {
  const now = new Date()
  const firstPaymentDate = new Date(now)
  firstPaymentDate.setDate(firstPaymentDate.getDate() + 30) // 30 days from now

  const lastPaymentDate = new Date(firstPaymentDate)
  lastPaymentDate.setMonth(lastPaymentDate.getMonth() + 5) // 5 months later

  // Create payment schedule
  const paymentSchedule = []
  const paymentAmount = 300.0
  for (let i = 0; i < 6; i++) {
    const dueDate = new Date(firstPaymentDate)
    dueDate.setMonth(dueDate.getMonth() + i)
    paymentSchedule.push({
      due_date: dueDate.toISOString(),
      amount: paymentAmount,
      principal: 250.0,
      interest: 50.0
    })
  }

  return {
    id: 'test-contract-' + Date.now(),
    contract_number: 12345,
    loan_application_id: 'test-application-123',
    loan_id: 'test-loan-123',
    contract_version: 1,
    contract_terms: {
      interest_rate: 24.0,
      term_months: 6,
      principal_amount: 1500.0,
      total_amount: 1800.0,
      payment_frequency: 'monthly',
      payment_amount: paymentAmount,
      number_of_payments: 6,
      fees: {
        origination_fee: 55, // Fee for preauthorized payments returned to the creditor
        processing_fee: 0, // Debit fee for every payment
        other_fees: 35 // Fee to postpone a payment
      },
      payment_schedule: paymentSchedule,
      effective_date: firstPaymentDate.toISOString(),
      maturity_date: lastPaymentDate.toISOString(),
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '514-123-4567',
      street_number: '123',
      street_name: 'Main Street',
      apartment_number: '4B',
      city: 'Montreal',
      province: 'Quebec',
      postal_code: 'H1A 1A1'
    },
    bank_account: {
      bank_name: 'Royal Bank of Canada',
      account_number: '1234567890',
      transit_number: '12345',
      institution_number: '003',
      account_name: 'John Doe'
    },
    contract_document_path: null,
    contract_status: 'generated',
    client_signed_at: new Date().toISOString(),
    client_signature_data: {
      signature_name: 'John Doe',
      signature_method: 'click_to_sign',
      ip_address: '127.0.0.1',
      user_agent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      signature_timestamp: new Date().toISOString()
    },
    staff_signed_at: null,
    staff_signature_id: null,
    sent_at: null,
    sent_method: null,
    expires_at: null,
    created_by: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    notes: 'Test contract for PDF generation',
    loan: {
      id: 'test-loan-123',
      application_id: 'test-application-123',
      user_id: 'test-user-123',
      loan_number: 12345,
      principal_amount: 1500.0,
      interest_rate: 24.0,
      term_months: 6,
      disbursement_date: null,
      due_date: lastPaymentDate.toISOString(),
      remaining_balance: 1800.0,
      status: 'pending_disbursement',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      accept_pay_customer_id: null,
      disbursement_transaction_id: null,
      disbursement_process_date: null,
      disbursement_status: null,
      disbursement_authorized_at: null,
      disbursement_initiated_at: null,
      disbursement_completed_at: null,
      disbursement_error_code: null,
      disbursement_reference: null,
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Create mocked contract data
    const mockContract = createMockContract()

    // Generate PDF from HTML (same as ContractViewer component)
    // This uses createContractHTML and converts it to PDF using Puppeteer
    const pdfBuffer = await generateContractPDFFromHTML(mockContract)

    // Return PDF as response
    // Convert Buffer to Uint8Array for Response compatibility
    const pdfUint8Array = new Uint8Array(pdfBuffer)
    return new Response(pdfUint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract-${mockContract.contract_number}.pdf"`,
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    })
  } catch (error: any) {
    console.error('Error generating contract PDF:', error)
    const isServerless =
      !!process.env.VERCEL || process.env.NODE_ENV === 'production'
    return NextResponse.json(
      {
        error: 'Failed to generate contract PDF',
        details: error.message,
        stack: error.stack,
        moreDetails: {
          isServerless: isServerless,
          VERCEL: process.env.VERCEL,
          VERCEL_ENV: process.env.VERCEL_ENV,
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL
        }
      },
      { status: 500 }
    )
  }
}
