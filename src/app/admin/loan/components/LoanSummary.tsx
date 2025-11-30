import { fetcher } from '@/lib/utils'
import React, { useState } from 'react'
import useSWR from 'swr'
import { LoanPayment, LoanContract } from '@/src/lib/supabase/types'
import { formatCurrency, formatDate } from '../[id]/utils'
import { Loan } from '@/src/lib/supabase'
import Select from '@/src/app/[locale]/components/Select'
import GenerateContractModal from '../../applications/[id]/components/GenerateContractModal'
import ContractViewer from '../../components/ContractViewer'
import { GenerateContractPayload } from '@/src/app/types/contract'

interface LoanSummaryProps {
  loan: any
}
function LoanSummary({ loan }: LoanSummaryProps) {
  const loanId = loan.id
  const applicationId = loan.application_id
  const [openGenerator, setOpenGenerator] = useState(false)
  const [submittingContract, setSubmittingContract] = useState(false)
  const [showContractViewer, setShowContractViewer] = useState(false)
  const [contract, setContract] = useState<LoanContract | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)
  const { data, error, isLoading } = useSWR<LoanPayment[]>(
    `/api/admin/loans/${loanId}/payments`,
    fetcher
  )

  const handleSubmit = async (payload: GenerateContractPayload) => {
    try {
      setSubmittingContract(true)
      const response = await fetch(
        `/api/admin/applications/${loan.application_id}/contract/generate?loanId=${loanId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit contract')
      }
      alert('Contract submitted successfully')
      setOpenGenerator(false)
      setSubmittingContract(false)
    } catch (error) {
      setSubmittingContract(false)
      console.error('Error submitting contract:', error)
    }
  }

  const handleViewContract = async () => {
    if (!applicationId) return
    setLoadingContract(true)
    try {
      const response = await fetch(
        `/api/admin/applications/${applicationId}/contract`
      )
      if (!response.ok) {
        if (response.status === 404) {
          setContract(null)
          setShowContractViewer(true)
          return
        }
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch contract')
      }
      const result = await response.json()
      setContract(result.contract as LoanContract)
      setShowContractViewer(true)
    } catch (e: any) {
      console.error('Error fetching contract:', e)
      alert(e.message || 'Failed to fetch contract')
    } finally {
      setLoadingContract(false)
    }
  }
  if (isLoading) {
    return <div>Loading...</div>
  }
  if (error) {
    return <div>Error: {error.message}</div>
  }
  return (
    <div className='space-y-3 p-2'>
      <LoanSummaryTable
        loan={loan}
        openGenerator={openGenerator}
        setOpenGenerator={setOpenGenerator}
        onViewContract={handleViewContract}
        loadingContract={loadingContract}
      />
      <PaymentTable payments={data ?? []} />
      {openGenerator && (
        <GenerateContractModal
          applicationId={loan.application_id}
          open={openGenerator}
          loadingContract={submittingContract}
          onSubmit={handleSubmit}
          onClose={() => setOpenGenerator(false)}
        />
      )}
      {showContractViewer && applicationId && (
        <ContractViewer
          contract={contract}
          applicationId={applicationId}
          onClose={() => {
            setShowContractViewer(false)
            setContract(null)
          }}
        />
      )}
    </div>
  )
}

export default LoanSummary

function PaymentTable({ payments }: { payments: LoanPayment[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'paid':
        return 'bg-emerald-100 text-emerald-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className='space-y-3 p-2'>
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2'>
          <h3 className='text-base font-semibold text-gray-900'>
            Payment History
          </h3>
        </div>
        <div className='max-h-[300px] overflow-x-auto overflow-y-auto'>
          {payments.length === 0 ? (
            <div className='p-4 text-center'>
              <p className='text-xs text-gray-500'>No payments recorded yet</p>
            </div>
          ) : (
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Payment Date
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Amount
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Method
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Status
                  </th>
                  <th className='px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white'>
                {payments.map((payment: LoanPayment) => (
                  <tr
                    key={payment.id}
                    className='transition-colors hover:bg-gray-50'
                  >
                    <td className='whitespace-nowrap px-3 py-1.5 text-xs text-gray-900'>
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5 text-xs font-semibold text-gray-900'>
                      {formatCurrency(parseFloat(payment.amount.toString()))}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5 text-xs text-gray-500'>
                      {payment.method || 'N/A'}
                    </td>
                    <td className='whitespace-nowrap px-3 py-1.5'>
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(
                          payment.status
                        )}`}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className='px-3 py-1.5 text-xs text-gray-500'>
                      {payment.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function LoanSummaryTable({
  loan,
  openGenerator,
  setOpenGenerator,
  onViewContract,
  loadingContract
}: {
  loan: any
  openGenerator: boolean
  setOpenGenerator: (open: boolean) => void
  onViewContract: () => void
  loadingContract: boolean
}) {
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

  const isContractSent =
    contract?.sent_at !== null && contract?.sent_at !== undefined
  const canSendContract =
    contract &&
    (contract.contract_status === 'generated' ||
      contract.contract_status === 'draft' ||
      isContractSent)

  const hasContract = contract !== null || loan.crmContractPath !== null

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
            {canSendContract && (
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
            {!loan.crmContractPath && contract.contract_status !== 'signed' && (
              <button
                className='flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700'
                onClick={handleGenerateContract}
              >
                {contract.contract_status === 'generated'
                  ? 'Regenerate Contract'
                  : 'Generate Contract'}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className='p-4'>
        {/* <pre>{JSON.stringify(loan.loan_contracts, null, 2)}</pre> */}
        <div className='grid gap-4 md:grid-cols-2'>
          {/* Loan Information */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold text-gray-700'>
              Loan Information
            </h4>
            <div className='space-y-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Loan Number:</span>
                <span className='font-medium text-gray-900'>
                  {loan.loan_number
                    ? `LN-${String(loan.loan_number).padStart(6, '0')}`
                    : 'N/A'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Principal Amount:</span>
                <span className='font-medium text-gray-900'>
                  {formatCurrency(Number(loan.principal_amount))}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Remaining Balance:</span>
                <span className='font-medium text-gray-900'>
                  {formatCurrency(Number(loan.remaining_balance))}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Interest Rate:</span>
                <span className='font-medium text-gray-900'>
                  {loan.interest_rate}%
                </span>
              </div>
              {/* Contract sent at */}
              {contract?.sent_at && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Contract Sent At:</span>
                  <span className='font-medium text-gray-900'>
                    {formatDate(contract.sent_at)}
                  </span>
                </div>
              )}

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
            </div>
          </div>

          {/* Borrower & Dates */}
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
                  <span className='font-medium text-gray-900'>
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
              <div className='flex justify-between'>
                <span className='text-gray-500'>Disbursement Date:</span>
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
  )
}
