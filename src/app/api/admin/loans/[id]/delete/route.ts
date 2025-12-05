import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseAdminClient } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/loans/[id]/delete
 * Delete a loan (DEV ONLY)
 * This will cascade delete related records (payments, contracts, etc.)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    const { id: loanId } = params

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseAdminClient()

    // Check if loan exists
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, application_id')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      )
    }

    // Delete associated contracts first
    // Note: The foreign key is ON DELETE SET NULL, so we need to explicitly delete contracts
    const { error: deleteContractsError } = await supabase
      .from('loan_contracts')
      .delete()
      .eq('loan_id', loanId)

    if (deleteContractsError) {
      console.error('Error deleting contracts:', deleteContractsError)
      return NextResponse.json(
        { error: 'Failed to delete associated contracts', details: deleteContractsError.message },
        { status: 500 }
      )
    }

    // Delete loan (this should cascade to related records like payments based on database constraints)
    const { error: deleteError } = await supabase
      .from('loans')
      .delete()
      .eq('id', loanId)

    if (deleteError) {
      console.error('Error deleting loan:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete loan', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Loan deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting loan:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

