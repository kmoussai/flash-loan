import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/deposits/[loanId]
 * Get deposit information including bank account details for a specific loan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const loanId = params.loanId
    const supabase = createServerSupabaseAdminClient()

    // Fetch loan with application info
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, loan_number, principal_amount, application_id')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    const loanData = loan as any
    
    // Fetch contract with bank account info using application_id
    const { data: contract, error: contractError } = await supabase
      .from('loan_contracts')
      .select('bank_account')
      .eq('loan_application_id', loanData.application_id)
      .maybeSingle()

    const bankAccount = (contract as any)?.bank_account || null

    return NextResponse.json({
      success: true,
      loan: {
        id: loanData.id,
        loan_number: loanData.loan_number,
        principal_amount: loanData.principal_amount
      },
      bank_account: bankAccount
    })
  } catch (error: any) {
    console.error('Error fetching deposit info:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

