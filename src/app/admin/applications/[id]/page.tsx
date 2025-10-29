'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'
import Button from '@/src/app/[locale]/components/Button'
import type { LoanApplication, ApplicationStatus, InveriteIbvData } from '@/src/lib/supabase/types'

// Mock IBV KPI data
interface IBVKPIs {
  bankVerificationScore: number
  averageAccountBalance: number
  monthlyIncomeVerified: number
  accountAge: number // in days
  transactionCount: number
  overdraftOccurrences: number
  kycRiskLevel: 'low' | 'medium' | 'high'
  overallRiskScore: number
}

// Extended type for application with client details
interface ApplicationWithDetails extends LoanApplication {
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
  addresses: {
    id: string
    street_number: string | null
    street_name: string | null
    apartment_number: string | null
    city: string
    province: string
    postal_code: string
    moving_date: string | null
  }[] | null
  references: {
    id: string
    first_name: string
    last_name: string
    phone: string
    relationship: string
  }[] | null
}

export default function ApplicationDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const applicationId = params.id as string
  
  const [application, setApplication] = useState<ApplicationWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ibvKpis, setIbvKpis] = useState<IBVKPIs | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [transactionSearch, setTransactionSearch] = useState('')
  const [fetchingInveriteData, setFetchingInveriteData] = useState(false)
  const [fetchedTransactions, setFetchedTransactions] = useState<any[] | null>(null)
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  // Get transactions from Inverite data
  // Transactions are nested inside accounts[].transactions array
  const getTransactions = () => {
    // Prefer on-demand fetched transactions to avoid heavy JSONB in main payload
    if (Array.isArray(fetchedTransactions)) return fetchedTransactions
    if (!application?.ibv_provider_data) return []
    if (application.ibv_provider !== 'inverite') return []
    
    const inveriteData = application.ibv_provider_data as any
    
    // Primary path: Check accounts array for transactions
    if (inveriteData?.accounts && Array.isArray(inveriteData.accounts)) {
      const allTransactions: any[] = []
      
      inveriteData.accounts.forEach((account: any, accountIndex: number) => {
        // Check if this account has transactions
        if (account?.transactions && Array.isArray(account.transactions) && account.transactions.length > 0) {
          account.transactions.forEach((tx: any) => {
            if (!tx) return // Skip null/undefined transactions
            
            // Map Inverite transaction fields to our expected format
            allTransactions.push({
              description: tx.details || tx.description || 'No description',
              date: tx.date || '',
              // Convert string amounts to numbers (handle empty strings)
              credit: tx.credit && tx.credit !== '' ? parseFloat(String(tx.credit)) : null,
              debit: tx.debit && tx.debit !== '' ? parseFloat(String(tx.debit)) : null,
              balance: tx.balance && tx.balance !== '' ? parseFloat(String(tx.balance)) : null,
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
    if (inveriteData?.account_info?.transactions && Array.isArray(inveriteData.account_info.transactions)) {
      const transactions = inveriteData.account_info.transactions.map((tx: any) => ({
        description: tx.details || tx.description || 'No description',
        date: tx.date || '',
        credit: tx.credit && tx.credit !== '' ? parseFloat(String(tx.credit)) : null,
        debit: tx.debit && tx.debit !== '' ? parseFloat(String(tx.debit)) : null,
        balance: tx.balance && tx.balance !== '' ? parseFloat(String(tx.balance)) : null,
        category: tx.category || null,
        flags: Array.isArray(tx.flags) ? tx.flags : [],
        _original: tx
      }))
      
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
    if (inveriteData?.account_statement && Array.isArray(inveriteData.account_statement) && inveriteData.account_statement.length > 0) {
      return inveriteData.account_statement
    }
    
    return []
  }

  // Filter transactions based on search
  const getFilteredTransactions = () => {
    const transactions = getTransactions()
    if (!transactionSearch) return transactions
    
    const searchLower = transactionSearch.toLowerCase()
    return transactions.filter((tx: any) =>
      (tx.description && tx.description.toLowerCase().includes(searchLower)) ||
      (tx.date && tx.date.includes(searchLower)) ||
      (tx.category && tx.category.toLowerCase().includes(searchLower)) ||
      (tx.account_description && tx.account_description.toLowerCase().includes(searchLower))
    )
  }

  // Generate mock IBV KPIs
  const generateMockIBVKPIs = (): IBVKPIs => {
    const riskLevels = ['low', 'medium', 'high'] as const
    return {
      bankVerificationScore: Math.random() * 40 + 60, // 60-100
      averageAccountBalance: Math.random() * 5000 + 1000, // $1,000 - $6,000
      monthlyIncomeVerified: Math.random() * 2000 + 1500, // $1,500 - $3,500
      accountAge: Math.random() * 1800 + 365, // 1-5 years in days
      transactionCount: Math.floor(Math.random() * 50 + 10), // 10-60 transactions
      overdraftOccurrences: Math.floor(Math.random() * 5), // 0-5 overdrafts
      kycRiskLevel: riskLevels[Math.floor(Math.random() * 3)],
      overallRiskScore: Math.random() * 50 + 30 // 30-80
    }
  }

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails()
      // Generate mock IBV KPIs
      setIbvKpis(generateMockIBVKPIs())
    }
  }, [applicationId])

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/applications/${applicationId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch application details')
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
      
      const response = await fetch(`/api/inverite/fetch/${requestGuid}`)
      
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
    if (!application?.addresses || application.addresses.length === 0) return 'N/A'
    const addr = application.addresses[0]
    return `${addr.street_number || ''} ${addr.street_name || ''}${addr.apartment_number ? `, Apt ${addr.apartment_number}` : ''}, ${addr.city}, ${addr.province} ${addr.postal_code}`.trim()
  }

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className='flex h-96 items-center justify-center'>
          <div className='text-center'>
            <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900'></div>
            <p className='mt-4 text-sm text-gray-600'>Loading application details...</p>
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

  return (
    <AdminDashboardLayout>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 pb-6'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => router.push('/admin/applications')}
              className='flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors'
            >
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
            <div>
              <h1 className='text-2xl font-semibold text-gray-900'>
                Application Details
              </h1>
              <p className='text-sm text-gray-500 mt-1'>
                ID: {application.id.slice(0, 8)}
              </p>
            </div>
          </div>
          
          <div className='flex items-center gap-3'>
            <span
              className={`inline-flex rounded px-3 py-1 text-xs font-medium uppercase tracking-wide ${getStatusBadgeColor(application.application_status)}`}
            >
              {application.application_status}
            </span>
          </div>
        </div>

        {/* Client Information */}
        <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
          <div className='bg-blue-50 border-b border-gray-200 px-6 py-4'>
            <h3 className='text-lg font-semibold text-gray-900'>Client Information</h3>
          </div>
          <div className='p-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div>
              <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Full Name</label>
              <p className='text-lg font-medium text-gray-900 mt-1'>
                {application.users?.first_name} {application.users?.last_name}
              </p>
            </div>

            <div>
              <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Age</label>
              <p className='text-lg font-medium text-gray-900 mt-1'>
                {application.users?.date_of_birth 
                  ? new Date().getFullYear() - new Date(application.users.date_of_birth).getFullYear()
                  : 'N/A'} years
              </p>
            </div>

            <div>
              <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>KYC Status</label>
              <div className='mt-1'>
                <span className={`inline-flex rounded px-2 py-1 text-xs font-medium uppercase tracking-wide bg-gray-50 text-gray-700 border border-gray-200`}>
                  {application.users?.kyc_status || 'PENDING'}
                </span>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* IBV Verification & Loan Details - Side by Side */}
        <div className='grid gap-6 lg:grid-cols-2'>
          {/* IBV Verification - Left Side */}
          <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
            <div className='bg-purple-50 border-b border-gray-200 px-6 py-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-lg font-semibold text-gray-900'>IBV Verification</h2>
                  <p className='text-sm text-gray-500 mt-0.5'>Risk Assessment</p>
                </div>
                {application.ibv_provider === 'inverite' && 
                 (application.ibv_provider_data as any)?.request_guid && (
                  <button
                    onClick={handleFetchInveriteData}
                    disabled={fetchingInveriteData}
                    className='rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    {fetchingInveriteData ? (
                      <span className='flex items-center gap-2'>
                        <svg className='h-3 w-3 animate-spin' fill='none' viewBox='0 0 24 24'>
                          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                        </svg>
                        Fetching...
                      </span>
                    ) : (
                      'Fetch Data'
                    )}
                  </button>
                )}
              </div>
            </div>

            {ibvKpis && (
              <div className='p-6'>
                <div className='space-y-4'>
                  {/* Risk Score */}
                  <div className='rounded border border-gray-200 bg-gray-50 p-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Overall Risk Score</label>
                        <p className={`text-2xl font-semibold text-gray-900 mt-1`}>
                          {Math.round(ibvKpis.overallRiskScore)}%
                        </p>
                      </div>
                      <div className='text-sm font-medium text-gray-600 capitalize'>
                        {ibvKpis.overallRiskScore >= 70 ? 'Approve' : ibvKpis.overallRiskScore >= 50 ? 'Review' : 'Reject'}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Verification</label>
                      <p className={`text-lg font-semibold ${getScoreColor(ibvKpis.bankVerificationScore)} mt-1`}>
                        {Math.round(ibvKpis.bankVerificationScore)}%
                      </p>
                    </div>

                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Balance</label>
                      <p className='text-lg font-semibold text-gray-900 truncate mt-1'>{formatCurrency(ibvKpis.averageAccountBalance)}</p>
                    </div>

                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Income</label>
                      <p className='text-lg font-semibold text-gray-900 truncate mt-1'>{formatCurrency(ibvKpis.monthlyIncomeVerified)}</p>
                    </div>

                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>KYC</label>
                      <span className={`inline-flex rounded px-2 py-1 text-xs font-medium uppercase tracking-wide mt-1 ${getRiskColor(ibvKpis.kycRiskLevel)}`}>
                        {ibvKpis.kycRiskLevel}
                      </span>
                    </div>

                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Account Age</label>
                      <p className='text-lg font-semibold text-gray-900 mt-1'>{Math.round(ibvKpis.accountAge / 365)} yrs</p>
                    </div>

                    <button 
                      onClick={async () => {
                        setShowTransactionsModal(true)
                        try {
                          setLoadingTransactions(true)
                          const res = await fetch(`/api/admin/applications/${applicationId}/transactions`)
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}))
                            throw new Error(err.error || 'Failed to load transactions')
                          }
                          const data = await res.json()
                          setFetchedTransactions(Array.isArray(data.transactions) ? data.transactions : [])
                        } catch (e: any) {
                          console.error('Failed to fetch transactions:', e)
                          setFetchedTransactions([])
                        } finally {
                          setLoadingTransactions(false)
                        }
                      }}
                      className='rounded border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors text-left'
                    >
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Transactions</label>
                      <p className='text-lg font-semibold text-gray-900 mt-1'>
                        {Array.isArray(fetchedTransactions) ? fetchedTransactions.length : getTransactions().length || 0}
                      </p>
                      <p className='text-xs text-gray-500 mt-1'>
                        {getTransactions().length > 0 ? 'Click to view' : 'No transactions'}
                      </p>
                    </button>

                    <div className={`rounded border border-gray-200 bg-white p-3 col-span-2`}>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Overdrafts</label>
                      <p className={`text-xl font-semibold mt-1 text-gray-900`}>
                        {ibvKpis.overdraftOccurrences} in last 90 days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loan Information - Right Side */}
          <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
            <div className='bg-teal-50 border-b border-gray-200 px-6 py-4'>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Loan Details</h2>
                <p className='text-sm text-gray-500 mt-0.5'>Application Information</p>
              </div>
            </div>

            <div className='p-6'>
              <div className='space-y-4'>
                {/* Loan Amount */}
                <div className='rounded border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Loan Amount</label>
                  <p className='text-3xl font-semibold text-gray-900 mt-1'>
                    {formatCurrency(application.loan_amount)}
                  </p>
                </div>

                {/* Income Source */}
                <div className='rounded border border-gray-200 bg-white p-3'>
                  <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Income Source</label>
                  <p className='text-base font-medium text-gray-900 capitalize mt-1'>
                    {application.income_source.replace(/-/g, ' ')}
                  </p>
                </div>

                {/* Bankruptcy Plan */}
                <div className='rounded border border-gray-200 bg-white p-3'>
                  <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Bankruptcy Plan</label>
                  <p className='text-base font-medium text-gray-900 mt-1'>
                    {application.bankruptcy_plan ? 'Yes' : 'No'}
                  </p>
                </div>

                {/* Income Fields Summary */}
                {application.income_fields && Object.keys(application.income_fields).length > 0 && (
                  <div className='rounded border border-gray-200 bg-white p-3'>
                    <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block'>Income Details</label>
                    <div className='space-y-1 text-sm text-gray-700'>
                      {Object.entries(application.income_fields).slice(0, 3).map(([key, value]) => (
                        <p key={key}>
                          <span className='font-medium capitalize'>{key.replace(/_/g, ' ')}:</span> {String(value)}
                        </p>
                      ))}
                      {Object.keys(application.income_fields).length > 3 && (
                        <p className='text-gray-500 text-xs'>+{Object.keys(application.income_fields).length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Client Information */}
        <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
          <div className='bg-gray-50 border-b border-gray-200 px-6 py-4'>
            <h3 className='text-lg font-semibold text-gray-900'>Additional Information</h3>
          </div>
          <div className='p-6'>
            <div className='grid gap-4 md:grid-cols-3'>
            {/* Email */}
            <div>
              <label className='text-xs font-medium text-gray-500'>Email</label>
              <p className='mt-1 text-sm font-medium text-gray-900'>{application.users?.email || 'N/A'}</p>
            </div>
            
            {/* Phone */}
            <div>
              <label className='text-xs font-medium text-gray-500'>Phone</label>
              <p className='mt-1 text-sm font-medium text-gray-900'>{application.users?.phone || 'N/A'}</p>
            </div>
            
            {/* Language */}
            <div>
              <label className='text-xs font-medium text-gray-500'>Language</label>
              <p className='mt-1 text-sm font-medium text-gray-900'>{application.users?.preferred_language || 'N/A'}</p>
            </div>
          </div>

          {/* Address */}
          {application.addresses && application.addresses.length > 0 && (
            <div className='mt-4 pt-4 border-t border-gray-200'>
              <label className='text-xs font-medium text-gray-500'>Address</label>
              <p className='mt-1 text-sm text-gray-900'>{getAddressString()}</p>
              {application.addresses[0].moving_date && (
                <p className='mt-1 text-xs text-gray-500'>
                  Moved in: {formatDate(application.addresses[0].moving_date)}
                </p>
              )}
            </div>
          )}

          {/* Financial Obligations - Compact */}
          {(application.users?.residence_status || application.users?.gross_salary) && (
            <div className='mt-4 pt-4 border-t border-gray-200'>
              <label className='text-xs font-medium text-gray-500'>Financial Information</label>
              <div className='mt-2 grid gap-2 text-sm'>
                {application.users?.residence_status && (
                  <p className='text-gray-700'>Residence: <span className='font-medium'>{application.users.residence_status}</span></p>
                )}
                {application.users?.gross_salary && (
                  <p className='text-gray-700'>Gross Salary: <span className='font-medium'>{formatCurrency(application.users.gross_salary)}</span></p>
                )}
                {application.users?.rent_or_mortgage_cost && (
                  <p className='text-gray-700'>Rent/Mortgage: <span className='font-medium'>{formatCurrency(application.users.rent_or_mortgage_cost)}</span></p>
                )}
                {application.users?.heating_electricity_cost && (
                  <p className='text-gray-700'>Heating/Electricity: <span className='font-medium'>{formatCurrency(application.users.heating_electricity_cost)}</span></p>
                )}
                {application.users?.car_loan && (
                  <p className='text-gray-700'>Car Loan: <span className='font-medium'>{formatCurrency(application.users.car_loan)}</span></p>
                )}
                {application.users?.furniture_loan && (
                  <p className='text-gray-700'>Furniture Loan: <span className='font-medium'>{formatCurrency(application.users.furniture_loan)}</span></p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Income Details */}
        {application.income_fields && Object.keys(application.income_fields).length > 0 && (
          <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
            <div className='bg-emerald-50 border-b border-gray-200 px-6 py-4'>
              <h3 className='text-lg font-semibold text-gray-900'>Income Details</h3>
            </div>
            <div className='p-6'>
              <div className='grid gap-2 text-sm'>
                {Object.entries(application.income_fields).map(([key, value]) => (
                  <p key={key} className='text-gray-700'>
                    <span className='font-medium capitalize'>{key.replace(/_/g, ' ')}:</span> {String(value)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
     
        {/* References */}
        {application.references && application.references.length > 0 && (
          <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
            <div className='bg-amber-50 border-b border-gray-200 px-6 py-4'>
              <h3 className='text-lg font-semibold text-gray-900'>References</h3>
            </div>
            <div className='p-6'>
              <div className='space-y-4'>
              {application.references.map((ref, index) => (
                <div key={ref.id} className='rounded border border-gray-200 p-4'>
                  <div className='mb-3'>
                    <h4 className='font-medium text-gray-900'>{ref.first_name} {ref.last_name}</h4>
                  </div>
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

        {/* Timeline */}
        <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
          <div className='bg-indigo-50 border-b border-gray-200 px-6 py-4'>
            <h3 className='text-lg font-semibold text-gray-900'>Timeline</h3>
          </div>
          <div className='p-6'>
            <div className='space-y-3 text-sm'>
            <div className='flex items-center gap-3'>
              <span className='text-gray-500'>Created:</span>
              <span className='font-medium text-gray-900'>{formatDateTime(application.created_at)}</span>
            </div>
            
            {application.submitted_at && (
              <div className='flex items-center gap-3'>
                <span className='text-gray-500'>Submitted:</span>
                <span className='font-medium text-gray-900'>{formatDateTime(application.submitted_at)}</span>
              </div>
            )}
            
            {application.approved_at && (
              <div className='flex items-center gap-3'>
                <span className='text-gray-500'>Approved:</span>
                <span className='font-medium text-gray-900'>{formatDateTime(application.approved_at)}</span>
              </div>
            )}
            
            {application.rejected_at && (
              <div className='flex items-center gap-3'>
                <span className='text-gray-500'>Rejected:</span>
                <span className='font-medium text-gray-900'>{formatDateTime(application.rejected_at)}</span>
              </div>
            )}
            
            <div className='flex items-center gap-3'>
              <span className='text-gray-500'>Last Updated:</span>
              <span className='font-medium text-gray-900'>{formatDateTime(application.updated_at)}</span>
            </div>
          </div>
          </div>
        </div>

        {/* Staff Notes */}
        {application.staff_notes && (
          <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
            <div className='bg-slate-50 border-b border-gray-200 px-6 py-4'>
              <h3 className='text-lg font-semibold text-gray-900'>Staff Notes</h3>
            </div>
            <div className='p-6'>
              <p className='text-sm text-gray-700'>{application.staff_notes}</p>
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {application.rejection_reason && (
          <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
            <div className='bg-red-50 border-b border-gray-200 px-6 py-4'>
              <h3 className='text-lg font-semibold text-gray-900'>Rejection Reason</h3>
            </div>
            <div className='p-6'>
              <p className='text-sm text-gray-700'>{application.rejection_reason}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
          <div className='bg-green-50 border-b border-gray-200 px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-gray-900'>Decision</h3>
                <p className='text-sm text-gray-500 mt-0.5'>Review all information and KPIs before making a decision</p>
              </div>
              <button
                onClick={() => router.push('/admin/applications')}
                className='rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
              >
                Back to Applications
              </button>
            </div>
          </div>
          <div className='p-6'>
            {application.application_status === 'pending' && (
            <div className='flex items-center justify-center gap-4'>
              <Button
                onClick={() => setShowRejectModal(true)}
                className='rounded border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
              >
                Reject Application
              </Button>
              <Button
                onClick={() => setShowApproveModal(true)}
                className='rounded border border-gray-900 bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors'
              >
                Approve Application
              </Button>
            </div>
          )}

            {application.application_status !== 'pending' && (
              <div className='text-center py-8'>
                <p className='text-gray-600'>This application has already been processed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='mx-4 w-full max-w-md rounded-lg bg-white p-6 border border-gray-200'>
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-900'>Approve Application</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Are you sure you want to approve this application?
                </p>
                {ibvKpis && (
                  <div className='mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-left text-xs text-gray-700'>
                    <p className='font-medium mb-1'>Based on IBV Analysis:</p>
                    <ul className='space-y-1'>
                      <li>• Risk Score: {Math.round(ibvKpis.overallRiskScore)}%</li>
                      <li>• Bank Verification: {Math.round(ibvKpis.bankVerificationScore)}%</li>
                      <li>• KYC Level: {ibvKpis.kycRiskLevel.toUpperCase()}</li>
                    </ul>
                  </div>
                )}
              </div>
              <div className='flex gap-3'>
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={processing}
                  className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className='flex-1 rounded border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors'
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
            <div className='mx-4 w-full max-w-md rounded-lg bg-white p-6 border border-gray-200'>
              <div className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-900'>Reject Application</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Please provide a reason for rejection:
                </p>
                {ibvKpis && (
                  <div className='mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-left text-xs text-gray-700'>
                    <p className='font-medium mb-1'>Based on IBV Analysis:</p>
                    <ul className='space-y-1'>
                      <li>• Risk Score: {Math.round(ibvKpis.overallRiskScore)}%</li>
                      <li>• Bank Verification: {Math.round(ibvKpis.bankVerificationScore)}%</li>
                      <li>• KYC Level: {ibvKpis.kycRiskLevel.toUpperCase()}</li>
                    </ul>
                  </div>
                )}
              </div>
              <div className='flex gap-3'>
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={processing}
                  className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors'
                >
                  {processing ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Modal */}
        {showTransactionsModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={() => setShowTransactionsModal(false)}>
            <div className='mx-4 w-full max-w-4xl h-[700px] rounded-lg bg-white border border-gray-200 flex flex-col' onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className='border-b border-gray-200 px-6 py-4 flex-shrink-0'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900'>Transaction History</h3>
                    <p className='text-sm text-gray-500 mt-0.5'>
                      {loadingTransactions ? 'Loading transactions…' : `${getTransactions().length} transactions found`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTransactionsModal(false)}
                    className='flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 transition-colors'
                  >
                    <svg className='h-5 w-5 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className='border-b border-gray-200 px-6 py-4 flex-shrink-0'>
                <input
                  type='text'
                  placeholder='Search transactions...'
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400'
                />
              </div>

              {/* Transaction List */}
              <div className='flex-1 overflow-y-auto px-6 py-4'>
                {loadingTransactions ? (
                  <div className='py-12 text-center'>
                    <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900'></div>
                    <p className='mt-4 text-sm text-gray-600'>Loading transactions…</p>
                  </div>
                ) : getFilteredTransactions().length === 0 ? (
                  <div className='py-12 text-center'>
                    <p className='text-gray-600'>No transactions found</p>
                    {transactionSearch && (
                      <p className='mt-2 text-sm text-gray-500'>Try a different search term</p>
                    )}
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {getFilteredTransactions().map((tx: any, index: number) => {
                      // Calculate amount from debit/credit
                      const amount = tx.credit || -(tx.debit || 0)
                      const isCredit = amount > 0
                      
                      return (
                        <div 
                          key={index} 
                          className='rounded border border-gray-200 p-4 hover:bg-gray-50 transition-colors'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex-1'>
                              <p className='font-medium text-gray-900'>{tx.description}</p>
                              <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                                <span>{tx.date}</span>
                                {tx.account_description && (
                                  <>
                                    <span className='text-gray-400'>•</span>
                                    <span className='rounded px-1.5 py-0.5 bg-gray-100 text-gray-700'>
                                      {tx.account_description}
                                    </span>
                                  </>
                                )}
                                {tx.category && (
                                  <>
                                    <span className='text-gray-400'>•</span>
                                    <span className='text-gray-500 capitalize'>
                                      {tx.category.split('/').pop()}
                                    </span>
                                  </>
                                )}
                              </div>
                              {tx.flags && tx.flags.length > 0 && (
                                <div className='mt-1 flex flex-wrap gap-1'>
                                  {tx.flags.map((flag: string, flagIndex: number) => (
                                    <span
                                      key={flagIndex}
                                      className='rounded px-1.5 py-0.5 bg-gray-100 text-xs text-gray-700'
                                    >
                                      {flag.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className='text-right ml-4'>
                              <p className='text-lg font-semibold text-gray-900'>
                                {formatCurrency(amount)}
                              </p>
                              {tx.balance !== null && tx.balance !== undefined && (
                                <p className='text-xs text-gray-500'>
                                  Balance: {formatCurrency(tx.balance)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className='border-t border-gray-200 px-6 py-4 flex-shrink-0'>
                <button
                  onClick={() => setShowTransactionsModal(false)}
                  className='w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  )
}

