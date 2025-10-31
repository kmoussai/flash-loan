'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import IbvCard from '../../components/IbvCard'
import TransactionsModal from '../../components/TransactionsModal'
import DocumentsSection from '../../components/DocumentsSection'
import Select from '@/src/app/[locale]/components/Select'
import Button from '@/src/app/[locale]/components/Button'
import type {
  LoanApplication,
  ApplicationStatus,
  InveriteIbvData
} from '@/src/lib/supabase/types'

// IBV Results structure from ibv_results column
interface IbvResults {
  extracted_at?: string
  accounts_count?: number
  accounts_summary?: Array<{
    account_index?: number
    account_type?: string | null
    account_description?: string | null
    institution?: string | null
    quarter_all_time?: {
      number_of_deposits?: number | null
      amount_of_deposits?: number | null
      average_amount_of_deposits?: number | null
      number_of_withdrawals?: number | null
      amount_of_withdrawals?: number | null
      average_balance?: number | null
      highest_balance?: number | null
      lowest_balance?: number | null
      ending_balance?: number | null
      overdraft_count?: number | null
      negative_balance_count?: number | null
      negative_balance_days?: number | null
      total_transactions?: number | null
    } | null
    current_balance?: {
      available?: number | null
      current?: number | null
    } | null
    transaction_count?: number
  }>
  aggregates?: {
    total_deposits?: number | null
    total_withdrawals?: number | null
    total_accounts?: number
    accounts_with_statistics?: number
  }
}

// Extended type for application with client details
interface ApplicationWithDetails extends LoanApplication {
  ibv_results?: IbvResults | null
  users: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    preferred_language: string | null
    kyc_status: string
    date_of_birth: string | null
    residence_status: string | null
    gross_salary: number | null
    rent_or_mortgage_cost: number | null
    heating_electricity_cost: number | null
    car_loan: number | null
    furniture_loan: number | null
  } | null
  addresses:
    | {
        id: string
        street_number: string | null
        street_name: string | null
        apartment_number: string | null
        city: string
        province: string
        postal_code: string
        moving_date: string | null
      }[]
    | null
  references:
    | {
        id: string
        first_name: string
        last_name: string
        phone: string
        relationship: string
      }[]
    | null
}

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
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<
    number | undefined
  >(undefined)
  const [fetchingInveriteData, setFetchingInveriteData] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'ibv' | 'documents' | 'details' | 'timeline'>('overview')

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
      case 'approved':
        return 'bg-gray-50 text-gray-900 border border-gray-200'
      case 'pending':
        return 'bg-gray-50 text-gray-900 border border-gray-200'
      case 'processing':
        return 'bg-gray-50 text-gray-900 border border-gray-200'
      case 'rejected':
        return 'bg-gray-50 text-gray-900 border border-gray-200'
      case 'cancelled':
        return 'bg-gray-50 text-gray-900 border border-gray-200'
      default:
        return 'bg-gray-50 text-gray-900 border border-gray-200'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatCurrencyShort = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      notation: 'compact'
    }).format(amount)
  }

  const getRiskColor = (level: string) => {
    return 'text-gray-700 bg-gray-50 border border-gray-200'
  }

  const getScoreColor = (score: number, maxScore: number = 100) => {
    return 'text-gray-900'
  }

  const handleApprove = async () => {
    setProcessing(true)
    // TODO: Implement approve API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setProcessing(false)
    setShowApproveModal(false)
    alert('Application approved successfully!')
    router.push('/admin/applications')
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

  const getAddressString = () => {
    if (!application?.addresses || application.addresses.length === 0)
      return 'N/A'
    const addr = application.addresses[0]
    return `${addr.street_number || ''} ${addr.street_name || ''}${addr.apartment_number ? `, Apt ${addr.apartment_number}` : ''}, ${addr.city}, ${addr.province} ${addr.postal_code}`.trim()
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
              {application.application_status}
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
              <div className='space-y-6'>
                {/* Quick Stats Grid */}
                <div className='grid gap-4 md:grid-cols-3'>
                  <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Loan Amount
                    </label>
                    <p className='mt-2 text-3xl font-bold text-gray-900'>
                      {formatCurrency(application.loan_amount)}
                    </p>
                  </div>
                  <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Income Source
                    </label>
                    <p className='mt-2 text-lg font-bold capitalize text-gray-900'>
                      {application.income_source.replace(/-/g, ' ')}
                    </p>
                  </div>
                  <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Status
                    </label>
                    <p className='mt-2 text-lg font-bold capitalize text-gray-900'>
                      {application.application_status}
                    </p>
                  </div>
                </div>

                {/* Loan & Client Info Side by Side */}
                <div className='grid gap-6 lg:grid-cols-2'>
                  {/* Loan Information */}
                  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <div className='border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4'>
                      <h2 className='text-lg font-bold text-gray-900'>
                        Loan Information
                      </h2>
                    </div>
                    <div className='p-6'>
                      <div className='space-y-4'>
                        <div>
                          <label className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                            Income Source
                          </label>
                          <p className='mt-1 text-base font-medium capitalize text-gray-900'>
                            {application.income_source.replace(/-/g, ' ')}
                          </p>
                        </div>
                        <div>
                          <label className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                            Bankruptcy Plan
                          </label>
                          <p className='mt-1 text-base font-medium text-gray-900'>
                            {application.bankruptcy_plan ? 'Yes' : 'No'}
                          </p>
                        </div>
                        {application.income_fields &&
                          Object.keys(application.income_fields).length > 0 && (
                            <div>
                              <label className='mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500'>
                                Income Details
                              </label>
                              <div className='space-y-1 text-sm text-gray-700'>
                                {Object.entries(application.income_fields)
                                  .slice(0, 3)
                                  .map(([key, value]) => (
                                    <p key={key}>
                                      <span className='font-medium capitalize'>
                                        {key.replace(/_/g, ' ')}:
                                      </span>{' '}
                                      {String(value)}
                                    </p>
                                  ))}
                                {Object.keys(application.income_fields).length > 3 && (
                                  <p className='text-xs text-gray-500'>
                                    +{Object.keys(application.income_fields).length - 3} more
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Client Quick Info */}
                  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <div className='border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4'>
                      <h2 className='text-lg font-bold text-gray-900'>
                        Client Information
                      </h2>
                    </div>
                    <div className='p-6'>
                      <div className='space-y-4'>
                        <div>
                          <label className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                            Email
                          </label>
                          <p className='mt-1 text-sm font-medium text-gray-900'>
                            {application.users?.email || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                            Phone
                          </label>
                          <p className='mt-1 text-sm font-medium text-gray-900'>
                            {application.users?.phone || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                            Language
                          </label>
                          <p className='mt-1 text-sm font-medium text-gray-900'>
                            {application.users?.preferred_language || 'N/A'}
                          </p>
                        </div>
                        {application.addresses && application.addresses.length > 0 && (
                          <div>
                            <label className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                              Address
                            </label>
                            <p className='mt-1 text-sm text-gray-900'>
                              {getAddressString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {application.application_status === 'pending' && (
                  <div className='rounded-xl border border-gray-200 bg-white p-6'>
                    <div className='flex items-center justify-center gap-4'>
                      <Button
                        onClick={() => setShowRejectModal(true)}
                        className='rounded-lg border border-red-300 bg-white px-6 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50'
                      >
                        Reject Application
                      </Button>
                      <Button
                        onClick={() => setShowApproveModal(true)}
                        className='rounded-lg border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg'
                      >
                        Approve Application
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: IBV Verification */}
            {activeTab === 'ibv' && (
              <div className='space-y-6'>
                <IbvCard
                  applicationId={applicationId}
                  onViewTransactions={accountIndex => {
                    setSelectedAccountIndex(accountIndex)
                    setShowTransactionsModal(true)
                  }}
                />
              </div>
            )}

            {/* Tab: Documents */}
            {activeTab === 'documents' && (
              <div>
                <DocumentsSection
                  clientId={application.users?.id || ''}
                  applicationId={applicationId}
                />
              </div>
            )}

            {/* Tab: Details */}
            {activeTab === 'details' && (
              <div className='space-y-6'>
                {/* Additional Client Information */}
                <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                  <div className='border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4'>
                    <h3 className='text-lg font-bold text-gray-900'>
                      Additional Information
                    </h3>
                  </div>
                  <div className='p-6'>
                    <div className='grid gap-6 md:grid-cols-2'>
                      <div>
                        <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Email
                        </label>
                        <p className='mt-1 text-sm font-medium text-gray-900'>
                          {application.users?.email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Phone
                        </label>
                        <p className='mt-1 text-sm font-medium text-gray-900'>
                          {application.users?.phone || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Language
                        </label>
                        <p className='mt-1 text-sm font-medium text-gray-900'>
                          {application.users?.preferred_language || 'N/A'}
                        </p>
                      </div>
                      {application.addresses && application.addresses.length > 0 && (
                        <div>
                          <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                            Address
                          </label>
                          <p className='mt-1 text-sm text-gray-900'>
                            {getAddressString()}
                          </p>
                          {application.addresses[0].moving_date && (
                            <p className='mt-1 text-xs text-gray-500'>
                              Moved in: {formatDate(application.addresses[0].moving_date)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Financial Obligations */}
                    {(application.users?.residence_status ||
                      application.users?.gross_salary) && (
                      <div className='mt-6 border-t border-gray-200 pt-6'>
                        <h4 className='mb-4 text-sm font-bold text-gray-900'>
                          Financial Information
                        </h4>
                        <div className='grid gap-4 md:grid-cols-2'>
                          {application.users?.residence_status && (
                            <div>
                              <label className='text-xs font-medium text-gray-500'>
                                Residence Status
                              </label>
                              <p className='mt-1 text-sm font-semibold text-gray-900'>
                                {application.users.residence_status}
                              </p>
                            </div>
                          )}
                          {application.users?.gross_salary && (
                            <div>
                              <label className='text-xs font-medium text-gray-500'>
                                Gross Salary
                              </label>
                              <p className='mt-1 text-sm font-semibold text-gray-900'>
                                {formatCurrency(application.users.gross_salary)}
                              </p>
                            </div>
                          )}
                          {application.users?.rent_or_mortgage_cost && (
                            <div>
                              <label className='text-xs font-medium text-gray-500'>
                                Rent/Mortgage
                              </label>
                              <p className='mt-1 text-sm font-semibold text-gray-900'>
                                {formatCurrency(application.users.rent_or_mortgage_cost)}
                              </p>
                            </div>
                          )}
                          {application.users?.heating_electricity_cost && (
                            <div>
                              <label className='text-xs font-medium text-gray-500'>
                                Heating/Electricity
                              </label>
                              <p className='mt-1 text-sm font-semibold text-gray-900'>
                                {formatCurrency(application.users.heating_electricity_cost)}
                              </p>
                            </div>
                          )}
                          {application.users?.car_loan && (
                            <div>
                              <label className='text-xs font-medium text-gray-500'>
                                Car Loan
                              </label>
                              <p className='mt-1 text-sm font-semibold text-gray-900'>
                                {formatCurrency(application.users.car_loan)}
                              </p>
                            </div>
                          )}
                          {application.users?.furniture_loan && (
                            <div>
                              <label className='text-xs font-medium text-gray-500'>
                                Furniture Loan
                              </label>
                              <p className='mt-1 text-sm font-semibold text-gray-900'>
                                {formatCurrency(application.users.furniture_loan)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Income Details */}
                {application.income_fields &&
                  Object.keys(application.income_fields).length > 0 && (
                    <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                      <div className='border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4'>
                        <h3 className='text-lg font-bold text-gray-900'>
                          Income Details
                        </h3>
                      </div>
                      <div className='p-6'>
                        <div className='grid gap-3 md:grid-cols-2'>
                          {Object.entries(application.income_fields).map(
                            ([key, value]) => (
                              <div key={key} className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
                                <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                                  {key.replace(/_/g, ' ')}
                                </label>
                                <p className='mt-1 text-sm font-medium text-gray-900'>
                                  {String(value)}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* References */}
                {application.references && application.references.length > 0 && (
                  <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <div className='border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4'>
                      <h3 className='text-lg font-bold text-gray-900'>
                        References
                      </h3>
                    </div>
                    <div className='p-6'>
                      <div className='grid gap-4 md:grid-cols-2'>
                        {application.references.map((ref) => (
                          <div
                            key={ref.id}
                            className='rounded-lg border border-gray-200 bg-gray-50 p-4'
                          >
                            <h4 className='mb-2 font-semibold text-gray-900'>
                              {ref.first_name} {ref.last_name}
                            </h4>
                            <div className='space-y-1 text-sm text-gray-600'>
                              <p>Phone: {ref.phone}</p>
                              <p>Relationship: {ref.relationship}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Timeline */}
            {activeTab === 'timeline' && (
              <div className='space-y-6'>
                <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                  <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4'>
                    <h3 className='text-lg font-bold text-gray-900'>Timeline</h3>
                  </div>
                  <div className='p-6'>
                    <div className='space-y-4'>
                      <div className='flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100'>
                          <svg className='h-5 w-5 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                          </svg>
                        </div>
                        <div className='flex-1'>
                          <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Created</p>
                          <p className='mt-1 text-sm font-medium text-gray-900'>
                            {formatDateTime(application.created_at)}
                          </p>
                        </div>
                      </div>

                      {application.submitted_at && (
                        <div className='flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
                          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                            <svg className='h-5 w-5 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                            </svg>
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Submitted</p>
                            <p className='mt-1 text-sm font-medium text-gray-900'>
                              {formatDateTime(application.submitted_at)}
                            </p>
                          </div>
                        </div>
                      )}

                      {application.approved_at && (
                        <div className='flex items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4'>
                          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100'>
                            <svg className='h-5 w-5 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                            </svg>
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Approved</p>
                            <p className='mt-1 text-sm font-medium text-gray-900'>
                              {formatDateTime(application.approved_at)}
                            </p>
                          </div>
                        </div>
                      )}

                      {application.rejected_at && (
                        <div className='flex items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-4'>
                          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-100'>
                            <svg className='h-5 w-5 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                            </svg>
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Rejected</p>
                            <p className='mt-1 text-sm font-medium text-gray-900'>
                              {formatDateTime(application.rejected_at)}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className='flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-100'>
                          <svg className='h-5 w-5 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                          </svg>
                        </div>
                        <div className='flex-1'>
                          <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Last Updated</p>
                          <p className='mt-1 text-sm font-medium text-gray-900'>
                            {formatDateTime(application.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staff Notes */}
                {application.staff_notes && (
                  <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <div className='border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4'>
                      <h3 className='text-lg font-bold text-gray-900'>
                        Staff Notes
                      </h3>
                    </div>
                    <div className='p-6'>
                      <p className='text-sm text-gray-700 leading-relaxed'>{application.staff_notes}</p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {application.rejection_reason && (
                  <div className='rounded-xl border border-red-200 bg-red-50 shadow-sm'>
                    <div className='border-b border-red-200 bg-red-100 px-6 py-4'>
                      <h3 className='text-lg font-bold text-gray-900'>
                        Rejection Reason
                      </h3>
                    </div>
                    <div className='p-6'>
                      <p className='text-sm text-gray-700 leading-relaxed'>
                        {application.rejection_reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6'>
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Approve Application
                </h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Are you sure you want to approve this application?
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
                  {processing ? 'Processing...' : 'Confirm Approval'}
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
      </div>
    </AdminDashboardLayout>
  )
}
