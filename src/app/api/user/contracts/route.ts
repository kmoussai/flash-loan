import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import type {
  ApplicationStatus,
  ContractStatus,
  ContractTerms,
  LoanContract
} from '@/src/lib/supabase/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('loan_contracts')
      .select(
        `
          *,
          loan_applications!inner (
            id,
            application_status,
            loan_amount,
            client_id
          ),
          loan:loans (
            id,
            loan_number,
            principal_amount,
            interest_rate,
            term_months,
            disbursement_date,
            due_date,
            remaining_balance,
            status
          )
        `
      )
      .eq('loan_applications.client_id', user.id)
      .not('sent_at', 'is', null) // Only return contracts that have been sent
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/user/contracts] Error fetching contracts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch contracts', details: error.message },
        { status: 500 }
      )
    }

    const contracts =
      (data as (LoanContract & {
        loan_applications?: {
          id: string
          application_status: ApplicationStatus
          loan_amount: number | null
        } | null
        loan?: {
          id: string
          loan_number: number
          principal_amount: number
          interest_rate: number
          term_months: number
          disbursement_date: string | null
          due_date: string | null
          remaining_balance: number | null
          status: string
        } | null
      })[] | null)?.map(row => {
        const application = row.loan_applications
        const { loan_applications, loan, ...rest } = row
        const contract: LoanContract = {
          ...rest,
          bank_account: rest.bank_account ?? null,
          contract_document_path: rest.contract_document_path ?? null,
          client_signature_data: rest.client_signature_data ?? null,
          staff_signed_at: rest.staff_signed_at ?? null,
          staff_signature_id: rest.staff_signature_id ?? null,
          loan_id: rest.loan_id ?? null,
          sent_method: rest.sent_method ?? null,
          sent_at: rest.sent_at ?? null,
          expires_at: rest.expires_at ?? null,
          notes: rest.notes ?? null,
          loan: loan ?? null
        }

        return {
          contract,
          application: application
            ? {
                id: application.id,
                status: application.application_status,
                loanAmount: application.loan_amount
              }
            : null,
          loan
        }
      }) ?? []

    return NextResponse.json({ contracts })
  } catch (error: any) {
    console.error('[GET /api/user/contracts] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}

