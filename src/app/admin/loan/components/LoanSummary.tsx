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
import PaymentTable from './PaymentTable'
import LoanSummaryTable from './LoanSummaryTable'

interface LoanSummaryProps {
  loan: any
  onLoanUpdate?: () => Promise<void> | void
}

export default function LoanSummary({ loan, onLoanUpdate }: LoanSummaryProps) {
  const loanId = loan.id
  const applicationId = loan.application_id
  const [openGenerator, setOpenGenerator] = useState(false)
  const [submittingContract, setSubmittingContract] = useState(false)
  const [showContractViewer, setShowContractViewer] = useState(false)
  const [contract, setContract] = useState<LoanContract | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false)
  const [showRebatePaymentModal, setShowRebatePaymentModal] = useState(false)
  const { data, error, isLoading, mutate } = useSWR<LoanPayment[]>(
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
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent'></div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return <div>Error: {error.message}</div>
  }

  // Get the latest loan contract from loan_contracts array
  const loanContract =
    Array.isArray(loan.loan_contracts) && loan.loan_contracts.length > 0
      ? loan.loan_contracts[0]
      : null

  // Get brokerage fee from contract terms
  const brokerageFee =
    loanContract?.contract_terms?.fees?.brokerage_fee ?? 0

  // Calculate remaining balance as principal_amount + brokerage fees
  const calculatedRemainingBalance = 
    Number(loan.principal_amount || 0) + Number(brokerageFee)
  
  return (
    <div className='space-y-3 p-2'>
      <LoanSummaryTable
        loan={loan}
        openGenerator={openGenerator}
        setOpenGenerator={setOpenGenerator}
        onViewContract={handleViewContract}
        loadingContract={loadingContract}
      />
      <PaymentTable 
        payments={data ?? []} 
        loanId={loanId} 
        applicationId={applicationId}
        loan={loan}
        onPaymentUpdate={mutate}
        onAddManualPayment={() => setShowManualPaymentModal(true)}
        onAddRebatePayment={() => setShowRebatePaymentModal(true)}
        onLoanUpdate={onLoanUpdate}
      />
      {showManualPaymentModal && (
        <ManualPaymentModal
          loanId={loanId}
          applicationId={applicationId}
          open={showManualPaymentModal}
          onClose={() => setShowManualPaymentModal(false)}
          onSuccess={async () => {
            await mutate()
            if (onLoanUpdate) {
              await onLoanUpdate()
            }
          }}
          remainingBalance={calculatedRemainingBalance}
        />
      )}
      {showRebatePaymentModal && (
        <RebatePaymentModal
          loanId={loanId}
          applicationId={applicationId}
          open={showRebatePaymentModal}
          onClose={() => setShowRebatePaymentModal(false)}
          onSuccess={async () => {
            await mutate()
            if (onLoanUpdate) {
              await onLoanUpdate()
            }
          }}
          remainingBalance={calculatedRemainingBalance}
        />
      )}
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
