'use client'

import { fetcher } from '@/lib/utils'
import { useState } from 'react'
import useSWR from 'swr'
import { LoanPayment, LoanContract } from '@/src/lib/supabase/types'
import GenerateContractModal from '../../applications/[id]/components/GenerateContractModal'
import ContractViewer from '../../components/ContractViewer'
import { GenerateContractPayload } from '@/src/app/types/contract'
import ManualPaymentModal from './ManualPaymentModal'
import RebatePaymentModal from './RebatePaymentModal'
import ModifyLoanModal from './ModifyLoanModal'
import PaymentTable from './PaymentTable'
import LoanSummaryTable from './LoanSummaryTable'

interface LoanSummaryProps {
  loan?: any // Initial loan data (optional, will be fetched via useSWR)
  loanId?: string // Loan ID (required if loan prop is not provided)
  onLoanUpdate?: () => Promise<void> | void
}

export default function LoanSummary({
  loan: initialLoan,
  loanId: propLoanId,
  onLoanUpdate
}: LoanSummaryProps) {
  // Get loanId from prop or initial loan data
  const loanId = propLoanId || initialLoan?.id

  // Fetch loan data using useSWR
  const {
    data: loanResponse,
    error: loanError,
    isLoading: isLoadingLoan,
    mutate: mutateLoan
  } = useSWR(loanId ? `/api/admin/loans/${loanId}` : null, fetcher)

  // Extract loan from API response (response has { loan, payments, ... } structure)
  // or use initial loan prop if API hasn't loaded yet
  const loan = loanResponse?.loan || initialLoan
  const applicationId = loan?.application_id

  const [openGenerator, setOpenGenerator] = useState(false)
  const [submittingContract, setSubmittingContract] = useState(false)
  const [showContractViewer, setShowContractViewer] = useState(false)
  const [contract, setContract] = useState<LoanContract | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false)
  const [showRebatePaymentModal, setShowRebatePaymentModal] = useState(false)
  const [showModifyLoanModal, setShowModifyLoanModal] = useState(false)
  const { data, error, isLoading, mutate } = useSWR<LoanPayment[]>(
    loanId ? `/api/admin/loans/${loanId}/payments` : null,
    fetcher
  )

  // Revalidate both loan and payments when actions are performed
  const revalidateAll = async () => {
    await Promise.all([mutateLoan(), mutate()])
    if (onLoanUpdate) {
      await onLoanUpdate()
    }
  }

  const handleSubmit = async (payload: GenerateContractPayload) => {
    try {
      setSubmittingContract(true)
      const response = await fetch(
        `/api/admin/applications/${loan?.application_id}/contract/generate?loanId=${loanId}`,
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
      // Revalidate loan data after contract generation
      await revalidateAll()
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

  // Show loading if loan or payments are loading
  if (isLoadingLoan || isLoading) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent'></div>
        </div>
      </div>
    )
  }

  // Show error if loan or payments failed to load
  if (loanError || error) {
    return (
      <div>
        Error:{' '}
        {loanError?.message || error?.message || 'Failed to load loan data'}
      </div>
    )
  }

  // Don't render if loan data is not available
  if (!loan || !loanId) {
    return <div>Loan not found</div>
  }

  // Get the latest loan contract from loan_contracts array
  const loanContract =
    Array.isArray(loan.loan_contracts) && loan.loan_contracts.length > 0
      ? loan.loan_contracts[0]
      : null

  // Get brokerage fee from contract terms
  const brokerageFee = loanContract?.contract_terms?.fees?.brokerage_fee ?? 0

  // Use remaining_balance from database, with fallback calculation if null/0
  // The database value is the source of truth and reflects actual payments made
  const remainingBalance = loan.remaining_balance

  // Calculate total interest and cumulative fees from payments
  const payments = data ?? []
  const totalInterest = payments.reduce((sum, payment) => {
    return (
      sum +
      (payment.interest !== null && payment.interest !== undefined
        ? Number(payment.interest)
        : 0)
    )
  }, 0)

  // Calculate cumulative fees from payments
  // Fees can be:
  // 1. Processing fees (if contract has processing_fee > 0, charged per payment)
  // 2. Deferral fees (stored in notes - always counted when mentioned, even if not in payment amount)
  // 3. Failed payment fees (origination fee + interest from failed payments)
  const deferralFee = loanContract?.contract_terms?.fees?.other_fees ?? 0
  const cumulativeFees = payments.reduce((sum, payment) => {
    return payment.status === 'deferred' ? sum + Number(deferralFee) : sum
  }, 0)

  // Calculate payment statistics
  const failedPaymentCount = payments.filter(p => p.status === 'failed').length
  // NSF (Non-Sufficient Funds) - typically failed payments, but can also check error codes or notes
  const nsfCount = payments.filter(p => {
    if (p.status === 'failed') return true
    // Check if notes or error_code indicate NSF
    const notes = (p.notes || '').toLowerCase()
    const errorCode = (p.error_code || '').toLowerCase()
    return (
      notes.includes('nsf') ||
      notes.includes('non-sufficient') ||
      notes.includes('insufficient funds') ||
      errorCode.includes('nsf') ||
      errorCode.includes('r01')
    ) // R01 is common NSF error code for ACH
  }).length

  return (
    <div className='space-y-3 p-2'>
      <LoanSummaryTable
        loan={loan}
        openGenerator={openGenerator}
        setOpenGenerator={setOpenGenerator}
        onViewContract={handleViewContract}
        loadingContract={loadingContract}
        onModifyLoan={() => setShowModifyLoanModal(true)}
        totalInterest={totalInterest}
        cumulativeFees={cumulativeFees}
        failedPaymentCount={failedPaymentCount}
        nsfCount={nsfCount}
        onLoanDelete={onLoanUpdate}
      />
      <PaymentTable
        payments={data ?? []}
        loanId={loanId}
        applicationId={applicationId}
        loan={loan}
        onPaymentUpdate={mutate}
        onAddManualPayment={() => setShowManualPaymentModal(true)}
        onAddRebatePayment={() => setShowRebatePaymentModal(true)}
        onLoanUpdate={revalidateAll}
      />
      {showManualPaymentModal && (
        <ManualPaymentModal
          loanId={loanId}
          applicationId={applicationId}
          open={showManualPaymentModal}
          onClose={() => setShowManualPaymentModal(false)}
          onSuccess={revalidateAll}
          remainingBalance={remainingBalance}
        />
      )}
      {showRebatePaymentModal && (
        <RebatePaymentModal
          loanId={loanId}
          applicationId={applicationId}
          open={showRebatePaymentModal}
          onClose={() => setShowRebatePaymentModal(false)}
          onSuccess={revalidateAll}
          remainingBalance={remainingBalance}
        />
      )}
      {showModifyLoanModal && (
        <ModifyLoanModal
          loanId={loanId}
          open={showModifyLoanModal}
          onClose={() => setShowModifyLoanModal(false)}
          onSuccess={revalidateAll}
          loan={loan}
        />
      )}
      {openGenerator && (
        <GenerateContractModal
          applicationId={loan?.application_id}
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
