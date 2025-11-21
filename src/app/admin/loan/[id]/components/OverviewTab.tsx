'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Button from '@/src/app/[locale]/components/Button'
import GenerateContractModal from '../../../applications/[id]/components/GenerateContractModal'
import ContractViewer from '../../../components/ContractViewer'
import type { LoanContract, ApplicationStatus } from '@/src/lib/supabase/types'
import type { LoanDetail, LoanDetailsResponse } from '../types'
import { formatCurrency, formatDate, formatDateTime } from '../utils'

interface OverviewTabProps {
  loanId: string
  loan: LoanDetail
  applicationId: string | null
  applicationStatus: ApplicationStatus | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function OverviewTab({
  loanId,
  loan,
  applicationId,
  applicationStatus
}: OverviewTabProps) {
  const [showContractModal, setShowContractModal] = useState(false)
  const [loadingContract, setLoadingContract] = useState(false)
  const [showContractViewer, setShowContractViewer] = useState(false)
  const [contract, setContract] = useState<LoanContract | null>(null)
  const [hasContract, setHasContract] = useState<boolean>(false)
  const [contractStatus, setContractStatus] = useState<string | null>(null)

  // Fetch loan details with statistics (only when tab is active and applicationId exists)
  const { data: loanData, error } = useSWR<LoanDetailsResponse>(
    loanId && applicationId ? `/api/admin/loans/${loanId}` : null,
    fetcher
  )

  const statistics = loanData?.statistics

  // Check for contract
  useEffect(() => {
    if (!applicationId) return
    let isCancelled = false
    const checkContract = async () => {
      try {
        const response = await fetch(`/api/admin/applications/${applicationId}/contract`)
        if (isCancelled) return
        if (response.ok) {
          const data = await response.json()
          setHasContract(true)
          setContractStatus(data?.contract?.contract_status ?? null)
          setContract(data?.contract ?? null)
        } else if (response.status === 404) {
          setHasContract(false)
          setContractStatus(null)
        } else {
          setHasContract(false)
          setContractStatus(null)
        }
      } catch {
        if (!isCancelled) {
          setHasContract(false)
          setContractStatus(null)
        }
      }
    }
    checkContract()
    return () => {
      isCancelled = true
    }
  }, [applicationId])

  const handleViewContract = async () => {
    if (!applicationId) return
    setLoadingContract(true)
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/contract`)
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

  const handleDeleteContract = async () => {
    if (!contract || !applicationId) return

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return
    }

    try {
      setLoadingContract(true)
      const response = await fetch(
        `/api/admin/applications/${applicationId}/contract`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete contract')
      }

      // Clear contract and close viewer
      setContract(null)
      setHasContract(false)
      setContractStatus(null)
      setShowContractViewer(false)
      alert('Contract deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting contract:', error)
      alert(`Error: ${error.message || 'Failed to delete contract'}`)
    } finally {
      setLoadingContract(false)
    }
  }

  if (error) {
    return (
      <div className='rounded-xl border border-red-200 bg-red-50 p-6'>
        <p className='text-sm text-red-600'>Failed to load loan statistics</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Quick Stats */}
      <div className='grid gap-4 md:grid-cols-3'>
        <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5'>
          <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
            Principal
          </label>
          <p className='mt-2 text-3xl font-bold text-gray-900'>
            {formatCurrency(loan.principal)}
          </p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5'>
          <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
            Remaining Balance
          </label>
          <p className='mt-2 text-3xl font-bold text-gray-900'>
            {formatCurrency(loan.remaining_balance)}
          </p>
        </div>
        <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5'>
          <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
            Interest Rate
          </label>
          <p className='mt-2 text-3xl font-bold text-gray-900'>
            {loan.interest_rate}%
          </p>
        </div>
      </div>

      {/* Loan Info */}
      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4'>
            <h2 className='text-lg font-bold text-gray-900'>Loan Information</h2>
          </div>
          <div className='grid gap-4 p-6 text-sm md:grid-cols-2'>
            <p className='text-gray-700'>
              Loan Number: <span className='font-semibold'>{loan.loan_number}</span>
            </p>
            <p className='text-gray-700'>
              Term: <span className='font-semibold'>{loan.term_months} months</span>
            </p>
            <p className='text-gray-700'>
              Payment Frequency:{' '}
              <span className='font-semibold capitalize'>{loan.payment_frequency}</span>
            </p>
            <p className='text-gray-700'>
              Payment Amount:{' '}
              <span className='font-semibold'>{formatCurrency(loan.payment_amount)}</span>
            </p>
            <p className='text-gray-700'>
              Originated:{' '}
              <span className='font-semibold'>{formatDate(loan.origination_date)}</span>
            </p>
            {loan.disbursement_date && (
              <p className='text-gray-700'>
                Disbursed:{' '}
                <span className='font-semibold'>{formatDate(loan.disbursement_date)}</span>
              </p>
            )}
            <p className='text-gray-700'>
              Status: <span className='font-semibold capitalize'>{loan.status}</span>
            </p>
          </div>
        </div>

        <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4'>
            <h2 className='text-lg font-bold text-gray-900'>Payment Summary</h2>
          </div>
          <div className='grid gap-4 p-6 text-sm md:grid-cols-2'>
            <p className='text-gray-700'>
              Next Payment:{' '}
              <span className='font-semibold'>{formatDateTime(loan.next_payment_date)}</span>
            </p>
            <p className='text-gray-700'>
              Last Payment:{' '}
              <span className='font-semibold'>{formatDateTime(loan.last_payment_date)}</span>
            </p>
            <p className='text-gray-700'>
              Next Amount Due:{' '}
              <span className='font-semibold'>{formatCurrency(loan.payment_amount)}</span>
            </p>
            {statistics && (
              <>
                <p className='text-gray-700'>
                  Paid Payments:{' '}
                  <span className='font-semibold'>{statistics.confirmedPayments}</span>
                </p>
                <p className='text-gray-700'>
                  Total Paid:{' '}
                  <span className='font-semibold text-green-600'>
                    {formatCurrency(statistics.totalPaid)}
                  </span>
                </p>
                <p className='text-gray-700'>
                  Pending Amount:{' '}
                  <span className='font-semibold text-yellow-600'>
                    {formatCurrency(statistics.totalPending)}
                  </span>
                </p>
                <p className='text-gray-700'>
                  Failed Payments:{' '}
                  <span className='font-semibold text-red-600'>
                    {statistics.totalPayments - statistics.confirmedPayments}
                  </span>
                </p>
                <p className='text-gray-700'>
                  Total Payments:{' '}
                  <span className='font-semibold'>{statistics.totalPayments}</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className='rounded-xl border border-gray-200 bg-white p-6'>
        <div className='flex items-center justify-center gap-4'>
          {!hasContract && (
            <div className='flex flex-col items-center gap-2'>
              <Button
                onClick={() => {
                  if (applicationStatus !== 'pre_approved') {
                    return
                  }
                  setShowContractModal(true)
                }}
                disabled={
                  loadingContract ||
                  !applicationId ||
                  applicationStatus !== 'pre_approved'
                }
                className='rounded-lg border border-blue-600 bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
              >
                {loadingContract ? 'Generating...' : 'Generate Contract'}
              </Button>
              {applicationStatus !== 'pre_approved' && (
                <p className='text-xs text-gray-500'>
                  Application must be pre-approved before generating a contract.
                </p>
              )}
            </div>
          )}
          {hasContract && contractStatus !== 'signed' && (
            <div className='flex flex-col items-center gap-2'>
              <Button
                onClick={() => setShowContractModal(true)}
                disabled={loadingContract || !applicationId}
                className='rounded-lg border border-blue-600 bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
              >
                {loadingContract ? 'Regenerating...' : 'Regenerate Contract'}
              </Button>
            </div>
          )}
          <Button
            onClick={handleViewContract}
            disabled={loadingContract || !applicationId}
            className='rounded-lg border border-indigo-600 bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50'
          >
            {loadingContract ? 'Loading...' : 'View Contract'}
          </Button>
          <Button className='rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50'>
            Record Payment
          </Button>
          <Button className='rounded-lg border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-2.5 text-sm font-semibold text-white hover:shadow-lg'>
            Export Statement
          </Button>
        </div>
      </div>

      {/* Generate Contract Modal */}
      {showContractModal && applicationId && (
        <GenerateContractModal
          open={showContractModal}
          loadingContract={loadingContract}
          applicationId={applicationId}
          onSubmit={async payload => {
            if (!applicationId) return
            setLoadingContract(true)
            try {
              const response = await fetch(
                `/api/admin/applications/${applicationId}/contract/generate?loanId=${loanId}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                }
              )
              if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Failed to generate contract')
              }
              setShowContractModal(false)
              setHasContract(true)
              setContractStatus('generated')
            } catch (e: any) {
              console.error(e)
              alert(e.message || 'Failed to generate contract')
            } finally {
              setLoadingContract(false)
            }
          }}
          onClose={() => setShowContractModal(false)}
        />
      )}

      {/* View Contract Modal */}
      {showContractViewer && applicationId && (
        <ContractViewer
          contract={contract}
          applicationId={applicationId}
          onClose={() => {
            setShowContractViewer(false)
            setContract(null)
          }}
          onGenerate={() => setShowContractModal(true)}
          onSend={async () => {
            if (!applicationId) return
            try {
              setLoadingContract(true)
              const response = await fetch(
                `/api/admin/applications/${applicationId}/contract/send`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ method: 'email' })
                }
              )
              if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Failed to send contract')
              }
              alert('Contract sent successfully!')
            } catch (e: any) {
              console.error('Error sending contract:', e)
              alert(e.message || 'Failed to send contract')
            } finally {
              setLoadingContract(false)
            }
          }}
          onDelete={handleDeleteContract}
        />
      )}
    </div>
  )
}

