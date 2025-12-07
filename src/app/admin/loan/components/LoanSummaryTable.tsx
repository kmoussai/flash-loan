'use client'

import { formatCurrency, formatDate } from '../[id]/utils'

/**
 * Format payment frequency for display
 */
function formatPaymentFrequency(frequency: string): string {
  const frequencyMap: Record<string, string> = {
    weekly: 'Weekly',
    'bi-weekly': 'Bi-weekly',
    'twice-monthly': 'Twice Monthly',
    monthly: 'Monthly'
  }
  return frequencyMap[frequency.toLowerCase()] || frequency
}

interface LoanSummaryTableProps {
  loan: any
  openGenerator: boolean
  setOpenGenerator: (open: boolean) => void
  onViewContract: () => void
  loadingContract: boolean
  onModifyLoan?: () => void
  totalInterest?: number
  cumulativeFees?: number
  failedPaymentCount?: number
  nsfCount?: number
  onLoanDelete?: () => void
}

export default function LoanSummaryTable({
  loan,
  openGenerator,
  setOpenGenerator,
  onViewContract,
  loadingContract,
  onModifyLoan,
  totalInterest = 0,
  cumulativeFees = 0,
  failedPaymentCount = 0,
  nsfCount = 0,
  onLoanDelete
}: LoanSummaryTableProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  const handleDeleteLoan = async () => {
    if (!isDevelopment) {
      alert('Delete loan is only available in development mode')
      return
    }

    const confirmed = confirm(
      `⚠️ DEV ONLY: Are you sure you want to delete loan ${loan.loan_number ? `LN-${String(loan.loan_number).padStart(6, '0')}` : loan.id}?\n\nThis action cannot be undone and will delete all related records (payments, contracts, etc.).`
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/admin/loans/${loan.id}/delete`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete loan')
      }

      alert('Loan deleted successfully')

      // Redirect to loans list or refresh
      if (onLoanDelete) {
        onLoanDelete()
      } else {
        window.location.href = '/admin/applications'
      }
    } catch (error: any) {
      console.error('Error deleting loan:', error)
      alert(`Failed to delete loan: ${error.message}`)
    }
  }
  const handleGenerateContract = async () => {
    setOpenGenerator(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'defaulted':
        return 'bg-red-100 text-red-800'
      case 'pending_disbursement':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleOpenContract = () => {
    if (loan.crmContractPath) {
      // Construct the full URL - adjust base URL based on your CRM storage configuration
      // The path format appears to be: companyId/branchId/filename
      // You may need to adjust this based on your actual CRM storage setup
      const baseUrl = 'https://softloan-ca.s3.amazonaws.com'
      const contractUrl = `${baseUrl}/${loan.crmContractPath}`
      window.open(contractUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const borrowerName = loan.users
    ? `${loan.users.first_name || ''} ${loan.users.last_name || ''}`.trim() ||
      'N/A'
    : 'N/A'

  // Get the latest contract from loan_contracts array
  const contract =
    Array.isArray(loan.loan_contracts) && loan.loan_contracts.length > 0
      ? loan.loan_contracts[0]
      : null

  // Get brokerage fee from contract terms
  const brokerageFee = contract?.contract_terms?.fees?.brokerage_fee ?? 0

  const isContractSent =
    contract?.sent_at !== null && contract?.sent_at !== undefined
  const canSendContract =
    contract &&
    (contract.contract_status === 'generated' ||
      contract.contract_status === 'draft' ||
      isContractSent)

  const hasContract = contract !== null || loan.crmContractPath !== null

  // Use remaining_balance from database, with fallback calculation if null/0
  // The database value is the source of truth and reflects actual payments made
  const remainingBalance =
    loan.remaining_balance !== null && loan.remaining_balance !== undefined
      ? Number(loan.remaining_balance)
      : Number(loan.principal_amount || 0) + Number(brokerageFee)

  const handleSendContract = async () => {
    if (!contract || !loan.application_id) return

    try {
      const response = await fetch(
        `/api/admin/applications/${loan.application_id}/contract/send?contract_id=${contract.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ method: 'email' })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to send contract')
        return
      }

      alert(
        isContractSent
          ? 'Contract resent successfully!'
          : 'Contract sent successfully!'
      )
      // Optionally refresh the loan data
      window.location.reload()
    } catch (error: any) {
      console.error('Error sending contract:', error)
      alert('Failed to send contract. Please try again.')
    }
  }

  return (
    <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
      <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2'>
        <div className='flex items-center justify-between'>
          <h3 className='text-base font-semibold text-gray-900'>
            Loan Summary
          </h3>
          <div className='flex items-center gap-2'>
            {onModifyLoan && loan.status !== 'completed' && (
              <button
                onClick={onModifyLoan}
                className='flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700'
                title='Modify loan payment schedule'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                  />
                </svg>
                Modify Loan
              </button>
            )}
            {canSendContract && contract?.contract_status !== 'signed' && (
              <button
                onClick={handleSendContract}
                className='flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                  />
                </svg>
                {isContractSent ? 'Resend Contract' : 'Send Contract'}
              </button>
            )}
            {loan.crmContractPath && (
              <button
                onClick={handleOpenContract}
                className='flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                  />
                </svg>
                View Contract
              </button>
            )}
            {/* View Contract */}
            {hasContract && !loan.crmContractPath && (
              <button
                onClick={onViewContract}
                disabled={loadingContract}
                className='flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                  />
                </svg>
                {loadingContract ? 'Loading...' : 'View Contract'}
              </button>
            )}
            {/* Generate contract */}
            {!loan.crmContractPath &&
              contract?.contract_status !== 'signed' && (
                <button
                  className='flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700'
                  onClick={handleGenerateContract}
                >
                  {contract?.contract_status === 'generated'
                    ? 'Regenerate Contract'
                    : 'Generate Contract'}
                </button>
              )}
            {/* DEV ONLY: Delete Loan */}
            {isDevelopment && (
              <button
                onClick={handleDeleteLoan}
                className='flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700'
                title='DEV ONLY: Delete this loan'
              >
                <svg
                  className='h-3 w-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                  />
                </svg>
                Delete Loan (DEV)
              </button>
            )}
          </div>
        </div>
      </div>
      <div className='p-4'>
        <div className='grid gap-4 md:grid-cols-3'>
          {/* Column 1: Loan Overview */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold text-gray-700'>
              Loan Overview
            </h4>
            <div className='space-y-2 text-xs'>
              <div className='flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2'>
                <span className='font-medium text-gray-700'>
                  Remaining Balance:
                </span>
                <span className='text-sm font-bold text-blue-700'>
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Loan Number:</span>
                <span className='font-medium text-gray-900'>
                  {loan.loan_number
                    ? `LN-${String(loan.loan_number).padStart(6, '0')}`
                    : 'N/A'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Status:</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(
                    loan.status
                  )}`}
                >
                  {loan.status?.toUpperCase().replace('_', ' ') || 'N/A'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Principal Amount:</span>
                <span className='font-medium text-gray-900'>
                  {formatCurrency(Number(loan.principal_amount))}
                </span>
              </div>

              <div className='flex justify-between'>
                <span className='text-gray-500'>Brokerage Fees:</span>
                <span className='font-medium text-gray-900'>
                  {formatCurrency(Number(brokerageFee))}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Interest Rate:</span>
                <span className='font-medium text-gray-900'>
                  {loan.interest_rate}%
                </span>
              </div>
              {contract?.contract_terms?.payment_frequency && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Payment Frequency:</span>
                  <span className='font-medium text-gray-900'>
                    {formatPaymentFrequency(
                      contract.contract_terms.payment_frequency
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Financial Details & Payment Statistics */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold text-gray-700'>
              Financial Details
            </h4>
            <div className='space-y-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Total Interest:</span>
                <span className='font-medium text-gray-900'>
                  {formatCurrency(totalInterest)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Fees:</span>
                <span className='font-medium text-gray-900'>
                  {formatCurrency(cumulativeFees)}
                </span>
              </div>

              {/* Payment Statistics Section */}
              <div className='mt-4 border-t border-gray-200 pt-3'>
                <h5 className='mb-2 text-xs font-semibold text-gray-700'>
                  Payment Statistics
                </h5>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Failed Payments:</span>
                    <span
                      className={`font-medium ${failedPaymentCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}
                    >
                      {failedPaymentCount}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-500'>NSF Count:</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        nsfCount > 0
                          ? 'bg-red-100 text-red-800 ring-2 ring-red-300'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {nsfCount > 0 && (
                        <svg
                          className='mr-1 h-3 w-3'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                            clipRule='evenodd'
                          />
                        </svg>
                      )}
                      {nsfCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Borrower & Important Dates */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold text-gray-700'>
              Borrower & Dates
            </h4>
            <div className='space-y-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Borrower:</span>
                <span className='font-medium text-gray-900'>
                  {borrowerName}
                </span>
              </div>
              {loan.users?.email && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Email:</span>
                  <span className='break-all font-medium text-gray-900'>
                    {loan.users.email}
                  </span>
                </div>
              )}
              {loan.users?.phone && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Phone:</span>
                  <span className='font-medium text-gray-900'>
                    {loan.users.phone}
                  </span>
                </div>
              )}
              <div className='mt-3 border-t border-gray-200 pt-3'>
                <h5 className='mb-2 text-xs font-semibold text-gray-700'>
                  Important Dates
                </h5>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Disbursement:</span>
                    <span className='font-medium text-gray-900'>
                      {formatDate(loan.disbursement_date)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Due Date:</span>
                    <span className='font-medium text-gray-900'>
                      {formatDate(loan.due_date)}
                    </span>
                  </div>
                  {contract?.sent_at && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500'>Contract Sent:</span>
                      <span className='font-medium text-gray-900'>
                        {formatDate(contract.sent_at)}
                      </span>
                    </div>
                  )}
                  {loan.loan_applications && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500'>Application Status:</span>
                      <span className='font-medium text-gray-900'>
                        {loan.loan_applications.application_status || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
