'use client'

import { Fragment, useState } from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { fetcher } from '@/lib/utils'
import type {
  ContractStatus,
  ContractTerms,
  ApplicationStatus,
  LoanContract
} from '@/src/lib/supabase/types'
import {
  formatCurrency,
  formatDate,
  getApplicationStatusBadgeClass,
  getContractStatusBadgeClass
} from '../../utils/formatters'
import ContractViewer from '@/src/app/admin/components/ContractViewer'
import ContractSigningModal from '../ContractSigningModal'

interface LoanPayment {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  status: string
  interest: number | null
  principal: number | null
  payment_number: number | null
  method: string | null
  created_at: string
}

interface ClientContract {
  contract: LoanContract
  application: {
    id: string
    status: ApplicationStatus
    loanAmount: number | null
  } | null
  loan: {
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
  payments: LoanPayment[]
}

interface ContractsResponse {
  contracts: ClientContract[]
}

interface ContractsSectionProps {
  locale: string
}

function getContractStatusLabel(
  t: ReturnType<typeof useTranslations<'Client_Dashboard'>>,
  status: ContractStatus
) {
  return t(`Contract_Status_${status}` as const)
}

function getFrequencyLabel(
  t: ReturnType<typeof useTranslations<'Client_Dashboard'>>,
  frequency?: string | null
) {
  if (!frequency) return null
  return t(`Contract_Frequency_${frequency}` as const)
}

export default function ContractsSection({ locale }: ContractsSectionProps) {
  const t = useTranslations('Client_Dashboard')
  const { data, error, isLoading, mutate } = useSWR<ContractsResponse>(
    '/api/user/contracts',
    fetcher,
    {
      revalidateOnFocus: false
    }
  )

  const [expandedContractId, setExpandedContractId] = useState<string | null>(
    null
  )
  const [viewerContract, setViewerContract] = useState<LoanContract | null>(
    null
  )
  const [signingId, setSigningId] = useState<string | null>(null)
  const [signingContract, setSigningContract] = useState<LoanContract | null>(
    null
  )
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const contracts = data?.contracts ?? []

  const handleToggle = (contractId: string) => {
    setExpandedContractId(prev => (prev === contractId ? null : contractId))
  }

  const handleCloseViewer = () => {
    setViewerContract(null)
  }

  const handleSignClick = (contract: LoanContract) => {
    setSigningContract(contract)
  }

  const handleDownload = async (contractId: string) => {
    if (downloadingId === contractId) return

    setDownloadingId(contractId)
    try {
      const response = await fetch(`/api/user/contracts/${contractId}/download`)
      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }
      const data = await response.json()
      if (data.signed_url) {
        // Open the signed URL in a new tab to download
        window.open(data.signed_url, '_blank', 'noopener,noreferrer')
      } else {
        throw new Error('No download URL received')
      }
    } catch (error) {
      console.error('Error downloading contract:', error)
      alert(
        t('Contract_Download_Error') ||
          'Failed to download contract. Please try again.'
      )
    } finally {
      setDownloadingId(null)
    }
  }

  const handleSign = async (signatureName: string) => {
    if (!signingContract) return

    setSigningId(signingContract.id)
    try {
      const response = await fetch(
        `/api/user/contracts/${signingContract.id}/sign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            signatureMethod: 'click_to_sign',
            signatureName: signatureName
          })
        }
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        console.error('[ContractsSection] Failed to sign contract', payload)
        throw new Error(payload.error || 'Failed to sign contract')
      }

      // Close modal and refresh
      setSigningContract(null)
      await mutate()
    } catch (err) {
      console.error('[ContractsSection] Unexpected error signing contract', err)
      throw err
    } finally {
      setSigningId(null)
    }
  }

  const handleCloseSigningModal = () => {
    if (!signingId) {
      setSigningContract(null)
    }
  }

  const renderContractCard = ({
    contract,
    application,
    loan,
    payments
  }: ClientContract) => {
    const isExpanded = expandedContractId === contract.id
    const terms = contract.contract_terms as ContractTerms | null
    const frequencyLabel = getFrequencyLabel(t, terms?.payment_frequency)
    const canSign =
      contract.contract_status === 'sent' ||
      contract.contract_status === 'pending_signature'
    const isSigned = Boolean(contract.client_signed_at)

    // Calculate payment statistics
    const totalPaid = payments
      .filter(p => p.status === 'confirmed' || p.status === 'paid')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const nextPayment = payments
      .filter(p => p.status === 'pending')
      .sort(
        (a, b) =>
          new Date(a.payment_date).getTime() -
          new Date(b.payment_date).getTime()
      )[0]

    const confirmedPayments = payments.filter(
      p => p.status === 'confirmed' || p.status === 'paid'
    ).length
    const pendingPayments = payments.filter(p => p.status === 'pending').length

    return (
      <li
        key={contract.id}
        className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'
      >
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-semibold text-gray-900'>
                {contract.contract_number
                  ? t('Contract_Number', { number: contract.contract_number })
                  : t('Contract_Number_Generic')}
              </span>
              <span
                className={getContractStatusBadgeClass(
                  contract.contract_status
                )}
              >
                {getContractStatusLabel(t, contract.contract_status)}
              </span>
            </div>
            {application && (
              <div className='flex flex-wrap items-center gap-3 text-sm text-gray-600'>
                <span>
                  {t('Contracts_Linked_Application', {
                    id: application.id.slice(0, 8).toUpperCase()
                  })}
                </span>
                <span
                  className={getApplicationStatusBadgeClass(application.status)}
                >
                  {t(`Status_${application.status}` as const)}
                </span>
              </div>
            )}
          </div>
          <div className='flex flex-col items-start gap-3 sm:items-end'>
            <div className='flex flex-col items-start gap-1 text-sm text-gray-600 sm:items-end'>
              <span>
                {contract.sent_at
                  ? t('Contract_Sent_On', {
                      date: formatDate(locale, contract.sent_at)
                    })
                  : t('Contract_No_Sent_Date')}
              </span>
              <span>
                {contract.client_signed_at
                  ? t('Contract_Signed_On', {
                      date: formatDate(locale, contract.client_signed_at)
                    })
                  : t('Contract_Not_Signed')}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='button'
                onClick={() => setViewerContract(contract)}
                className='rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900'
              >
                {t('Contract_View_Button')}
              </button>
              {contract.contract_document_path && (
                <button
                  type='button'
                  onClick={() => handleDownload(contract.id)}
                  disabled={downloadingId === contract.id}
                  className='rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {downloadingId === contract.id
                    ? t('Contract_Downloading') || 'Downloading...'
                    : t('Contract_Download_Button')}
                </button>
              )}
              {canSign && !isSigned && (
                <button
                  type='button'
                  onClick={() => handleSignClick(contract)}
                  disabled={signingId === contract.id}
                  className='border-primary/30 rounded-lg border px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {signingId === contract.id
                    ? t('Contract_Signing_In_Progress')
                    : t('Contract_Sign_Button')}
                </button>
              )}
              <button
                type='button'
                onClick={() => handleToggle(contract.id)}
                className='rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900'
              >
                {isExpanded
                  ? t('Contract_Hide_Terms')
                  : t('Contract_View_Terms')}
              </button>
            </div>
          </div>
        </div>

        <div className='mt-4 grid gap-4 border-t border-gray-100 pt-4 text-sm text-gray-600 sm:grid-cols-2'>
          <div className='space-y-1'>
            <p className='font-medium text-gray-800'>
              {t('Contract_Loan_Amount')}
            </p>
            <p>{formatCurrency(locale, application?.loanAmount)}</p>
          </div>
          <div className='space-y-1'>
            <p className='font-medium text-gray-800'>
              {t('Contract_Total_Amount')}
            </p>
            <p>{formatCurrency(locale, terms?.total_amount)}</p>
          </div>
          <div className='space-y-1'>
            <p className='font-medium text-gray-800'>
              {t('Contract_Payment_Amount')}
            </p>
            <p>{formatCurrency(locale, terms?.payment_amount)}</p>
          </div>
          <div className='space-y-1'>
            <p className='font-medium text-gray-800'>{t('Contract_Term')}</p>
            <p>
              {terms?.term_months
                ? t('Contract_Term_Value', { months: terms.term_months })
                : t('Contracts_Not_Available')}
              {terms?.number_of_payments
                ? ` · ${terms.number_of_payments} ${t('Contract_Payments_Label')}`
                : ''}
              {frequencyLabel ? ` · ${frequencyLabel}` : ''}
            </p>
          </div>
          {loan && (
            <>
              <div className='space-y-1'>
                <p className='font-medium text-gray-800'>Loan Number</p>
                <p>#{loan.loan_number}</p>
              </div>
              <div className='space-y-1'>
                <p className='font-medium text-gray-800'>Remaining Balance</p>
                <p>{formatCurrency(locale, loan.remaining_balance)}</p>
              </div>
              <div className='space-y-1'>
                <p className='font-medium text-gray-800'>Principal Amount</p>
                <p>{formatCurrency(locale, loan.principal_amount)}</p>
              </div>
              <div className='space-y-1'>
                <p className='font-medium text-gray-800'>Interest Rate</p>
                <p>{loan.interest_rate}%</p>
              </div>
            </>
          )}
          {payments.length > 0 && (
            <>
              <div className='space-y-1'>
                <p className='font-medium text-gray-800'>Total Paid</p>
                <p>{formatCurrency(locale, totalPaid)}</p>
              </div>
              <div className='space-y-1'>
                <p className='font-medium text-gray-800'>Pending Payments</p>
                <p>
                  {formatCurrency(locale, totalPending)} ({pendingPayments}{' '}
                  {pendingPayments === 1 ? 'payment' : 'payments'})
                </p>
              </div>
              {nextPayment && (
                <div className='space-y-1'>
                  <p className='font-medium text-gray-800'>Next Payment Due</p>
                  <p>
                    {formatCurrency(locale, nextPayment.amount)} on{' '}
                    {formatDate(locale, nextPayment.payment_date)}
                  </p>
                </div>
              )}
              <div className='space-y-1'>
                <p className='font-medium text-gray-800'>Payment Progress</p>
                <p>
                  {confirmedPayments} of {payments.length} payments completed
                </p>
              </div>
            </>
          )}
        </div>

        {isExpanded && (
          <div className='mt-6 space-y-6'>
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold text-gray-900'>
                {t('Contract_Terms_Title')}
              </h3>
              <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700'>
                {terms?.terms_and_conditions
                  ? terms.terms_and_conditions
                  : t('Contract_Terms_Empty')}
              </div>
            </div>
            {payments.length > 0 && (
              <div className='space-y-2'>
                <h3 className='text-sm font-semibold text-gray-900'>
                  Payment History
                </h3>
                <div className='overflow-hidden rounded-lg border border-gray-200'>
                  <table className='min-w-full divide-y divide-gray-200'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Date
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Amount
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Principal
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Interest
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Status
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Method
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100 bg-white'>
                      {payments.map(payment => (
                        <tr key={payment.id}>
                          <td className='px-4 py-2 text-sm text-gray-700'>
                            {formatDate(locale, payment.payment_date)}
                          </td>
                          <td className='px-4 py-2 text-sm text-gray-700'>
                            {formatCurrency(locale, payment.amount)}
                          </td>
                          <td className='px-4 py-2 text-sm text-gray-700'>
                            {formatCurrency(locale, payment.principal, '-')}
                          </td>
                          <td className='px-4 py-2 text-sm text-gray-700'>
                            {formatCurrency(locale, payment.interest, '-')}
                          </td>
                          <td className='px-4 py-2 text-sm'>
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                payment.status === 'confirmed' ||
                                payment.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : payment.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : payment.status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                          <td className='px-4 py-2 text-sm text-gray-700'>
                            {payment.method || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <Fragment>
      <section className='space-y-6'>
        <div className='space-y-2'>
          <h2 className='text-xl font-semibold text-gray-900'>
            {t('Contracts_Title')}
          </h2>
          <p className='text-sm text-gray-600'>{t('Contracts_Subtitle')}</p>
        </div>

        {isLoading ? (
          <div className='rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm'>
            {t('Contracts_Loading')}
          </div>
        ) : error ? (
          <div className='space-y-4 rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700 shadow-sm'>
            <div>
              <p className='font-semibold text-red-800'>
                {t('Contracts_Error')}
              </p>
            </div>
            <button
              type='button'
              onClick={() => mutate()}
              className='rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800'
            >
              {t('Contracts_Retry')}
            </button>
          </div>
        ) : contracts.length === 0 ? (
          <div className='rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                className='h-6 w-6'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 6v6l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <h3 className='mt-4 text-base font-semibold text-gray-900'>
              {t('Contracts_Empty')}
            </h3>
            <p className='mt-2 text-sm text-gray-600'>
              {t('Contracts_Empty_Description')}
            </p>
          </div>
        ) : (
          <ul className='space-y-4'>{contracts.map(renderContractCard)}</ul>
        )}
      </section>

      {viewerContract && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10'>
          <div className='relative h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl'>
            <button
              type='button'
              onClick={handleCloseViewer}
              className='absolute right-4 top-4 z-10 rounded-full border border-gray-200 bg-white/80 p-2 text-gray-600 transition hover:border-gray-300 hover:text-gray-900'
              aria-label={t('Contract_Close_Viewer')}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                className='h-5 w-5'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
            <ContractViewer
              contract={viewerContract}
              applicationId={viewerContract.loan_application_id}
              onClose={handleCloseViewer}
            />
          </div>
        </div>
      )}
      {signingContract && (
        <ContractSigningModal
          contract={signingContract}
          applicationId={signingContract.loan_application_id}
          locale={locale}
          onClose={handleCloseSigningModal}
          onSign={handleSign}
          isSigning={signingId === signingContract.id}
        />
      )}
    </Fragment>
  )
}
