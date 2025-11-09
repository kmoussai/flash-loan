'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import TransactionsModal from '../../components/TransactionsModal'
import ContractViewer from '../../components/ContractViewer'
import OverviewTab from './components/OverviewTab'
import IbvTab from './components/IbvTab'
import DocumentsTab from './components/DocumentsTab'
import DetailsTab from './components/DetailsTab'
import TimelineTab from './components/TimelineTab'
import type { ApplicationStatus, InveriteIbvData, LoanContract, PaymentFrequency } from '@/src/lib/supabase/types'
import type { ApplicationWithDetails, IbvResults } from './types'

export default function ApplicationDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const applicationId = params.id as string

  const [application, setApplication] = useState<ApplicationWithDetails | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [preApproveAmount, setPreApproveAmount] = useState<number | ''>('')
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<
    number | undefined
  >(undefined)
  const [fetchingInveriteData, setFetchingInveriteData] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'ibv' | 'documents' | 'details' | 'timeline'>('overview')
  const [showContractViewer, setShowContractViewer] = useState(false)
  const [contract, setContract] = useState<LoanContract | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)

  // Get transactions from Inverite data
  // Transactions are nested inside accounts[].transactions array
  // This is used only for displaying the count in the UI
  const getTransactions = () => {
    if (!application?.ibv_provider_data) return []
    if (application.ibv_provider !== 'inverite') return []

    const inveriteData = application.ibv_provider_data as any

    // Primary path: Check accounts array for transactions
    if (inveriteData?.accounts && Array.isArray(inveriteData.accounts)) {
      const allTransactions: any[] = []

      inveriteData.accounts.forEach((account: any, accountIndex: number) => {
        // Check if this account has transactions
        if (
          account?.transactions &&
          Array.isArray(account.transactions) &&
          account.transactions.length > 0
        ) {
          account.transactions.forEach((tx: any) => {
            if (!tx) return // Skip null/undefined transactions

            // Map Inverite transaction fields to our expected format
            allTransactions.push({
              description: tx.details || tx.description || 'No description',
              date: tx.date || '',
              // Convert string amounts to numbers (handle empty strings)
              credit:
                tx.credit && tx.credit !== ''
                  ? parseFloat(String(tx.credit))
                  : null,
              debit:
                tx.debit && tx.debit !== ''
                  ? parseFloat(String(tx.debit))
                  : null,
              balance:
                tx.balance && tx.balance !== ''
                  ? parseFloat(String(tx.balance))
                  : null,
              // Include additional Inverite fields
              category: tx.category || null,
              flags: Array.isArray(tx.flags) ? tx.flags : [],
              // Include account information for context
              account_index: accountIndex,
              account_type: account.type || null,
              account_description: account.account_description || null,
              account_number: account.account || null,
              institution: account.institution || null,
              // Keep original transaction for reference
              _original: tx
            })
          })
        }
      })

      if (allTransactions.length > 0) {
        // Sort by date (newest first), handle invalid dates
        const sorted = allTransactions.sort((a, b) => {
          try {
            const dateA = a.date ? new Date(a.date).getTime() : 0
            const dateB = b.date ? new Date(b.date).getTime() : 0
            if (isNaN(dateA) || isNaN(dateB)) return 0
            return dateB - dateA
          } catch {
            return 0
          }
        })

        return sorted
      }
    }

    // Fallback 1: Check account_info.transactions (if account_info is a single object)
    if (
      inveriteData?.account_info?.transactions &&
      Array.isArray(inveriteData.account_info.transactions)
    ) {
      const transactions = inveriteData.account_info.transactions.map(
        (tx: any) => ({
          description: tx.details || tx.description || 'No description',
          date: tx.date || '',
          credit:
            tx.credit && tx.credit !== ''
              ? parseFloat(String(tx.credit))
              : null,
          debit:
            tx.debit && tx.debit !== '' ? parseFloat(String(tx.debit)) : null,
          balance:
            tx.balance && tx.balance !== ''
              ? parseFloat(String(tx.balance))
              : null,
          category: tx.category || null,
          flags: Array.isArray(tx.flags) ? tx.flags : [],
          _original: tx
        })
      )

      return transactions.sort((a: any, b: any) => {
        try {
          const dateA = a.date ? new Date(a.date).getTime() : 0
          const dateB = b.date ? new Date(b.date).getTime() : 0
          if (isNaN(dateA) || isNaN(dateB)) return 0
          return dateB - dateA
        } catch {
          return 0
        }
      })
    }

    // Fallback 2: Legacy account_statement format
    if (
      inveriteData?.account_statement &&
      Array.isArray(inveriteData.account_statement) &&
      inveriteData.account_statement.length > 0
    ) {
      return inveriteData.account_statement
    }

    return []
  }

  // Calculate risk score from IBV results data
  const calculateRiskScore = (
    results: IbvResults | null | undefined
  ): number => {
    if (!results) return 0
    const summary = results // Keep using 'summary' variable name for clarity in the function
    if (!summary?.accounts_summary || summary.accounts_summary.length === 0) {
      return 0 // Unknown risk if no data
    }

    let riskScore = 50 // Start with neutral score

    const accountsWithData = summary.accounts_summary.filter(
      acc => acc.quarter_all_time
    )

    if (accountsWithData.length === 0) return 0

    // Calculate average metrics across all accounts
    let totalOverdrafts = 0
    let totalNegativeDays = 0
    let totalNegativeCount = 0
    let avgBalance = 0
    let hasNegativeBalance = false
    let totalDeposits = 0
    let depositCount = 0

    accountsWithData.forEach(acc => {
      const qat = acc.quarter_all_time
      if (qat) {
        totalOverdrafts += qat.overdraft_count || 0
        totalNegativeDays += qat.negative_balance_days || 0
        totalNegativeCount += qat.negative_balance_count || 0
        if (qat.average_balance !== null && qat.average_balance !== undefined) {
          avgBalance += qat.average_balance
        }
        if (
          qat.lowest_balance !== null &&
          qat.lowest_balance !== undefined &&
          qat.lowest_balance < 0
        ) {
          hasNegativeBalance = true
        }
        if (
          qat.amount_of_deposits !== null &&
          qat.amount_of_deposits !== undefined
        ) {
          totalDeposits += qat.amount_of_deposits
          depositCount++
        }
      }
    })

    const avgOverdrafts = totalOverdrafts / accountsWithData.length
    const avgNegativeDays = totalNegativeDays / accountsWithData.length
    const avgNegativeCount = totalNegativeCount / accountsWithData.length
    avgBalance = avgBalance / accountsWithData.length

    // Adjust risk score based on factors
    // Overdrafts: -10 per overdraft (max -30)
    riskScore -= Math.min(avgOverdrafts * 10, 30)

    // Negative balance days: -5 per day (max -20)
    riskScore -= Math.min(avgNegativeDays * 5, 20)

    // Negative balance occurrences: -3 per occurrence (max -15)
    riskScore -= Math.min(avgNegativeCount * 3, 15)

    // Low average balance: -1 per $100 below $1000 (max -10)
    if (avgBalance < 1000) {
      riskScore -= Math.min((1000 - avgBalance) / 100, 10)
    }

    // No deposits or very low deposits: -15
    const avgDeposits = depositCount > 0 ? totalDeposits / depositCount : 0
    if (avgDeposits < 500) {
      riskScore -= 15
    }

    // Positive factors
    // Good average balance: +10 if above $2000
    if (avgBalance > 2000) {
      riskScore += 10
    }

    // High deposit amounts: +5 if average deposits > $2000
    if (avgDeposits > 2000) {
      riskScore += 5
    }

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(riskScore)))
  }

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails()
    }
  }, [applicationId])

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/applications/${applicationId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || 'Failed to fetch application details'
        )
      }

      const data = await response.json()
      setApplication(data.application)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching application:', err)
      setError(err.message || 'Failed to load application details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'pre_approved':
        return 'bg-green-50 text-green-700 border border-green-200'
      case 'contract_pending':
        return 'bg-purple-50 text-purple-700 border border-purple-200'
      case 'contract_signed':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'rejected':
        return 'bg-red-50 text-red-700 border border-red-200'
      case 'cancelled':
        return 'bg-gray-50 text-gray-600 border border-gray-200'
      default:
        return 'bg-gray-50 text-gray-900 border border-gray-200'
    }
  }

  const getStatusLabel = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'processing':
        return 'Processing'
      case 'pre_approved':
        return 'Pre-Approved'
      case 'contract_pending':
        return 'Contract Pending'
      case 'contract_signed':
        return 'Contract Signed'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const getRiskColor = (level: string) => {
    return 'text-gray-700 bg-gray-50 border border-gray-200'
  }

  const getScoreColor = (score: number, maxScore: number = 100) => {
    return 'text-gray-900'
  }

  const handleApprove = async () => {
    if (!applicationId) return
    
    setProcessing(true)
    try {
      const payload: { loanAmount?: number } = {}
      const numericAmount =
        typeof preApproveAmount === 'string' ? Number(preApproveAmount) : preApproveAmount
      if (Number.isFinite(numericAmount) && numericAmount! > 0) {
        payload.loanAmount = Math.round((numericAmount as number) * 100) / 100
      }
      const response = await fetch(`/api/admin/applications/${applicationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve application')
      }

      const data = await response.json()
      setProcessing(false)
      setShowApproveModal(false)
      alert('Application pre-approved and pending loan created.')
      
      // Navigate to the newly created loan if present
      if (data?.loan?.id) {
        router.push(`/admin/loan/${data.loan.id}`)
        return
      }
      
      // Refresh application details to show updated status
      await fetchApplicationDetails()
    } catch (err: any) {
      console.error('Error approving application:', err)
      setProcessing(false)
      alert(`Error: ${err.message || 'Failed to approve application'}`)
    }
  }

  const handleReject = async () => {
    setProcessing(true)
    // TODO: Implement reject API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setProcessing(false)
    setShowRejectModal(false)
    alert('Application rejected.')
    router.push('/admin/applications')
  }

  const handleFetchInveriteData = async () => {
    if (!application) return

    const inveriteData = application.ibv_provider_data as InveriteIbvData
    const requestGuid = inveriteData?.request_guid

    if (!requestGuid) {
      alert('No request GUID found for this application')
      return
    }

    try {
      setFetchingInveriteData(true)

      // Pass application_id as query parameter for faster lookup
      const response = await fetch(
        `/api/inverite/fetch/${requestGuid}?application_id=${applicationId}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch Inverite data')
      }

      const result = await response.json()

      // Refresh application details
      await fetchApplicationDetails()

      // Show success message
    } catch (error: any) {
      console.error('Error fetching Inverite data:', error)
      alert(`Error: ${error.message || 'Failed to fetch data from Inverite'}`)
    } finally {
      setFetchingInveriteData(false)
    }
  }

  type ContractGenerationOptions = {
    termMonths?: number
    paymentFrequency?: PaymentFrequency
    numberOfPayments?: number
    loanAmount?: number
    nextPaymentDate?: string
  }

  type ContractGenerationPayload = {
    termMonths?: number
    paymentFrequency?: PaymentFrequency
    numberOfPayments?: number
    loanAmount?: number
    firstPaymentDate?: string
  }

  const handleGenerateContract = async (options?: ContractGenerationOptions) => {
    if (!applicationId) return

    setLoadingContract(true)
    try {
      const payload: ContractGenerationPayload = {}
      if (options?.termMonths && Number.isFinite(options.termMonths)) {
        payload.termMonths = options.termMonths
      }
      if (options?.paymentFrequency) {
        payload.paymentFrequency = options.paymentFrequency
      }
      if (options?.numberOfPayments && Number.isFinite(options.numberOfPayments)) {
        payload.numberOfPayments = Math.max(1, Math.round(options.numberOfPayments))
      }
      if (options?.loanAmount && Number.isFinite(options.loanAmount)) {
        payload.loanAmount = Math.max(0, Math.round(options.loanAmount * 100) / 100)
      }
      if (options?.nextPaymentDate) {
        const parsedDate = new Date(options.nextPaymentDate)
        if (!Number.isNaN(parsedDate.getTime())) {
          payload.firstPaymentDate = parsedDate.toISOString().split('T')[0]
        }
      }

      const response = await fetch(`/api/admin/applications/${applicationId}/contract/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate contract')
      }

      const result = await response.json()
      setContract(result.contract)
      setShowContractViewer(true)
      
      // Refresh application details
      await fetchApplicationDetails()
    } catch (error: any) {
      console.error('Error generating contract:', error)
      alert(`Error: ${error.message || 'Failed to generate contract'}`)
    } finally {
      setLoadingContract(false)
    }
  }

  const handleViewContract = async () => {
    if (!applicationId) return

    setLoadingContract(true)
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/contract`)

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 404) {
          // No contract exists, show generate option
          setContract(null)
          setShowContractViewer(true)
          return
        }
        throw new Error(errorData.error || 'Failed to fetch contract')
      }

      const result = await response.json()
      setContract(result.contract)
      setShowContractViewer(true)
    } catch (error: any) {
      console.error('Error fetching contract:', error)
      alert(`Error: ${error.message || 'Failed to fetch contract'}`)
    } finally {
      setLoadingContract(false)
    }
  }

  const handleSendContract = async () => {
    if (!applicationId) return

    setLoadingContract(true)
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/contract/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method: 'email' })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send contract')
      }

      const result = await response.json()
      setContract(result.contract)
      
      // Refresh application details
      await fetchApplicationDetails()
      
      alert('Contract sent successfully!')
    } catch (error: any) {
      console.error('Error sending contract:', error)
      alert(`Error: ${error.message || 'Failed to send contract'}`)
    } finally {
      setLoadingContract(false)
    }
  }

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className='flex h-96 items-center justify-center'>
          <div className='text-center'>
            <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900'></div>
            <p className='mt-4 text-sm text-gray-600'>
              Loading application details...
            </p>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  if (error || !application) {
    return (
      <AdminDashboardLayout>
        <div className='flex h-96 items-center justify-center'>
          <div className='text-center'>
            <p className='text-gray-600'>{error || 'Application not found'}</p>
            <button
              onClick={() => router.push('/admin/applications')}
              className='mt-4 rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'
            >
              Back to Applications
            </button>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'ibv' as const, label: 'IBV Verification', icon: '🔐' },
    { id: 'documents' as const, label: 'Documents', icon: '📄' },
    { id: 'details' as const, label: 'Details', icon: 'ℹ️' },
    { id: 'timeline' as const, label: 'Timeline', icon: '⏱️' },
  ]

  return (
    <AdminDashboardLayout>
      <div className='flex h-[calc(100vh-80px)] flex-col'>
        {/* Header - Compact */}
        <div className='flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => router.push('/admin/applications')}
              className='flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700'
              title='Back to Applications'
            >
              <svg
                className='h-3.5 w-3.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
            </button>
            <div className='flex items-center gap-2'>
              <h1 className='text-base font-medium text-gray-700'>
                Application Details
              </h1>
              <span className='text-xs text-gray-400'>•</span>
              <span className='text-xs font-mono text-gray-500'>
                {application.id.slice(0, 8)}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            {/* Client Info - Compact */}
            <div className='flex items-center gap-2'>
              <svg className='h-4 w-4 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
              {application.users?.id ? (
                <button
                  onClick={() => router.push(`/admin/clients/${application.users?.id}`)}
                  className='text-sm font-semibold text-gray-900 transition-colors hover:text-blue-600'
                >
                  {application.users?.first_name} {application.users?.last_name}
                </button>
              ) : (
                <span className='text-sm font-semibold text-gray-900'>
                  {application.users?.first_name} {application.users?.last_name}
                </span>
              )}
            </div>
            <span
              className={`inline-flex rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${getStatusBadgeColor(application.application_status)}`}
            >
              {getStatusLabel(application.application_status)}
            </span>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className='border-b border-gray-200 bg-white px-6'>
          <div className='flex items-center gap-1'>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <span className='absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600'></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - Scrollable */}
        <div className='flex-1 overflow-y-auto bg-gray-50'>
          <div className='mx-auto max-w-7xl px-6 py-6'>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <OverviewTab
                application={application}
                loadingContract={loadingContract}
                onGenerateContract={options => handleGenerateContract(options)}
                onViewContract={handleViewContract}
                onOpenApproveModal={() => {
                  setPreApproveAmount(application.loan_amount)
                  setShowApproveModal(true)
                }}
                onOpenRejectModal={() => setShowRejectModal(true)}
              />
            )}

            {/* Tab: IBV Verification */}
            {activeTab === 'ibv' && (
              <IbvTab
                  applicationId={applicationId}
                  onViewTransactions={accountIndex => {
                    setSelectedAccountIndex(accountIndex)
                    setShowTransactionsModal(true)
                  }}
                />
            )}

            {/* Tab: Documents */}
            {activeTab === 'documents' && (
              <DocumentsTab
                  clientId={application.users?.id || ''}
                  applicationId={applicationId}
                />
            )}

            {/* Tab: Details */}
            {activeTab === 'details' && (
              <DetailsTab application={application} />
            )}

            {/* Tab: Timeline */}
            {activeTab === 'timeline' && (
              <TimelineTab application={application} />
            )}
                          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6'>
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Pre-Approve Application
                </h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Set the pre-approved amount. A pending loan will be created.
                </p>
                <div className='mt-4'>
                  <label className='mb-1 block text-xs font-medium text-gray-700'>Amount (CAD)</label>
                  <input
                    type='number'
                    min={1}
                    step='0.01'
                    value={preApproveAmount === '' ? '' : preApproveAmount}
                    onChange={(e) => {
                      const v = e.target.value
                      setPreApproveAmount(v === '' ? '' : Number(v))
                    }}
                    className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
                  />
                  <p className='mt-1 text-[10px] text-gray-500'>
                    Defaults to requested amount: {application ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(application.loan_amount) : '-'}
                  </p>
                </div>
                {application?.ibv_results && (
                  <div className='mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-left text-xs text-gray-700'>
                    <p className='mb-1 font-medium'>Based on IBV Analysis:</p>
                    <ul className='space-y-1'>
                      <li>
                        • Risk Score:{' '}
                        {calculateRiskScore(application.ibv_results)}%
                      </li>
                      <li>
                        • Accounts:{' '}
                        {application.ibv_results.accounts_count || 0}
                      </li>
                      <li>
                        • Total Deposits:{' '}
                        {application.ibv_results.aggregates?.total_deposits
                          ? formatCurrency(
                              application.ibv_results.aggregates.total_deposits
                            )
                          : 'N/A'}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <div className='flex gap-3'>
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={processing}
                  className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className='flex-1 rounded border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50'
                >
                  {processing ? 'Processing...' : 'Confirm Pre-Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6'>
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Reject Application
                </h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Please provide a reason for rejection:
                </p>
                {application?.ibv_results && (
                  <div className='mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-left text-xs text-gray-700'>
                    <p className='mb-1 font-medium'>Based on IBV Analysis:</p>
                    <ul className='space-y-1'>
                      <li>
                        • Risk Score:{' '}
                        {calculateRiskScore(application.ibv_results)}%
                      </li>
                      <li>
                        • Accounts:{' '}
                        {application.ibv_results.accounts_count || 0}
                      </li>
                      <li>
                        • Total Deposits:{' '}
                        {application.ibv_results.aggregates?.total_deposits
                          ? formatCurrency(
                              application.ibv_results.aggregates.total_deposits
                            )
                          : 'N/A'}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <div className='flex gap-3'>
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={processing}
                  className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
                >
                  {processing ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        <TransactionsModal
          open={showTransactionsModal}
          onClose={() => {
            setShowTransactionsModal(false)
            setSelectedAccountIndex(undefined)
          }}
          applicationId={applicationId}
          accountIndex={selectedAccountIndex}
        />

        {showContractViewer && (
          <ContractViewer
            contract={contract}
            applicationId={applicationId}
            onClose={() => {
              setShowContractViewer(false)
              setContract(null)
            }}
            onGenerate={handleGenerateContract}
            onSend={handleSendContract}
          />
        )}
      </div>
    </AdminDashboardLayout>
  )
}
