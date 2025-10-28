'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'
import Button from '@/src/app/[locale]/components/Button'
import type { LoanApplication, ApplicationStatus } from '@/src/lib/supabase/types'

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
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
    switch(level) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getScoreColor = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
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
            <div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
            <p className='mt-4 text-gray-600'>Loading application details...</p>
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
            <span className='mb-4 block text-4xl'>⚠️</span>
            <p className='text-red-600'>{error || 'Application not found'}</p>
            <button
              onClick={() => router.push('/admin/applications')}
              className='mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
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
        <div className='flex items-center justify-between'>
          <div>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => router.push('/admin/applications')}
                className='flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50'
              >
                ←
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>
                  Application Details
                </h1>
                <p className='text-xs text-gray-600'>
                  Application #{application.id.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
          
          <div className='flex items-center gap-3'>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeColor(application.application_status)}`}
            >
              {application.application_status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Principal Client Information Row */}
        <div className='rounded-xl bg-gradient-to-br from-[#333366] via-[#2a2d5a] to-[#1f2147] shadow-xl overflow-hidden border border-white/10'>
          <div className='px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-6'>
                {/* Full Name */}
                <div className='flex items-center gap-3'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#097fa5] to-[#0a95c2] text-white shadow-lg'>
                    <span className='text-2xl'>👤</span>
                  </div>
                  <div>
                    <label className='text-xs font-bold text-white/60 uppercase'>Full Name</label>
                    <p className='text-xl font-black text-white mt-0.5'>
                      {application.users?.first_name} {application.users?.last_name}
                    </p>
                  </div>
                </div>

                {/* Age */}
                <div className='flex items-center gap-3 pl-6 border-l border-white/10'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#097fa5] to-[#0a95c2] text-white shadow-lg'>
                    <span className='text-2xl'>🎂</span>
                  </div>
                  <div>
                    <label className='text-xs font-bold text-white/60 uppercase'>Age</label>
                    <p className='text-xl font-black text-white mt-0.5'>
                      {application.users?.date_of_birth 
                        ? new Date().getFullYear() - new Date(application.users.date_of_birth).getFullYear()
                        : 'N/A'} years old
                    </p>
                  </div>
                </div>

                {/* KYC Status */}
                <div className='flex items-center gap-3 pl-6 border-l border-white/10'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#097fa5] to-[#0a95c2] text-white shadow-lg'>
                    <span className='text-2xl'>✅</span>
                  </div>
                  <div>
                    <label className='text-xs font-bold text-white/60 uppercase'>KYC Status</label>
                    <div className='mt-1'>
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-black uppercase ${
                        application.users?.kyc_status === 'verified' 
                          ? 'bg-[#097fa5] text-white shadow-lg' 
                          : 'bg-yellow-500 text-white shadow-lg'
                      }`}>
                        {application.users?.kyc_status || 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* IBV Verification & Loan Details - Side by Side */}
        <div className='grid gap-6 lg:grid-cols-2'>
          {/* IBV Verification - Left Side */}
          <div className='overflow-hidden rounded-xl bg-gradient-to-br from-[#333366] via-[#2a2d5a] to-[#1f2147] shadow-xl border border-white/10'>
            <div className='bg-gradient-to-r from-[#097fa5]/20 to-transparent px-5 py-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#097fa5] to-[#0a95c2] shadow-lg'>
                  <span className='text-3xl text-white'>🏦</span>
                </div>
                <div className='flex-1'>
                  <h2 className='text-xl font-black text-white'>IBV Verification</h2>
                  <p className='text-xs text-white/60'>Risk Assessment</p>
                </div>
              </div>
            </div>

            {ibvKpis && (
              <div className='bg-white p-5'>
                <div className='grid gap-3 mb-4'>
                  {/* Risk Score Header */}
                  <div className='rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-2 border-indigo-200'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <label className='text-xs font-bold text-gray-500 uppercase'>Overall Risk Score</label>
                        <p className={`text-3xl font-black ${
                          ibvKpis.overallRiskScore >= 70 ? 'text-green-600' : 
                          ibvKpis.overallRiskScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {Math.round(ibvKpis.overallRiskScore)}%
                        </p>
                      </div>
                      <div className='text-center'>
                        <div className='flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-lg border-2 border-indigo-200 text-3xl'>
                          {ibvKpis.overallRiskScore >= 70 ? '✅' : ibvKpis.overallRiskScore >= 50 ? '⚠️' : '❌'}
                        </div>
                        <p className={`mt-1 text-xs font-black ${
                          ibvKpis.overallRiskScore >= 70 ? 'text-green-600' : 
                          ibvKpis.overallRiskScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {ibvKpis.overallRiskScore >= 70 ? 'APPROVE' : ibvKpis.overallRiskScore >= 50 ? 'REVIEW' : 'REJECT'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Compact Metrics */}
                  <div className='grid grid-cols-2 gap-2'>
                    <div className='rounded-lg bg-green-50 p-3 border border-green-200'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm'>📊</span>
                        <label className='text-xs font-bold text-gray-600'>Verification</label>
                      </div>
                      <p className={`text-xl font-black ${getScoreColor(ibvKpis.bankVerificationScore)}`}>
                        {Math.round(ibvKpis.bankVerificationScore)}%
                      </p>
                    </div>

                    <div className='rounded-lg bg-blue-50 p-3 border border-blue-200'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm'>💳</span>
                        <label className='text-xs font-bold text-gray-600'>Balance</label>
                      </div>
                      <p className='text-lg font-black text-blue-600 truncate'>{formatCurrency(ibvKpis.averageAccountBalance)}</p>
                    </div>

                    <div className='rounded-lg bg-purple-50 p-3 border border-purple-200'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm'>💵</span>
                        <label className='text-xs font-bold text-gray-600'>Income</label>
                      </div>
                      <p className='text-lg font-black text-purple-600 truncate'>{formatCurrency(ibvKpis.monthlyIncomeVerified)}</p>
                    </div>

                    <div className='rounded-lg bg-orange-50 p-3 border border-orange-200'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm'>✅</span>
                        <label className='text-xs font-bold text-gray-600'>KYC</label>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-black uppercase ${getRiskColor(ibvKpis.kycRiskLevel)}`}>
                        {ibvKpis.kycRiskLevel}
                      </span>
                    </div>

                    <div className='rounded-lg bg-teal-50 p-3 border border-teal-200'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm'>⏰</span>
                        <label className='text-xs font-bold text-gray-600'>Age</label>
                      </div>
                      <p className='text-xl font-black text-teal-600'>{Math.round(ibvKpis.accountAge / 365)} yrs</p>
                    </div>

                    <div className='rounded-lg bg-violet-50 p-3 border border-violet-200'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm'>📈</span>
                        <label className='text-xs font-bold text-gray-600'>Transactions</label>
                      </div>
                      <p className='text-xl font-black text-violet-600'>{ibvKpis.transactionCount}</p>
                    </div>

                    <div className={`rounded-lg p-3 border col-span-2 ${
                      ibvKpis.overdraftOccurrences === 0 ? 'bg-green-50 border-green-200' : 
                      ibvKpis.overdraftOccurrences <= 2 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-sm'>⚠️</span>
                        <label className='text-xs font-bold text-gray-600'>Overdrafts</label>
                      </div>
                      <p className={`text-2xl font-black ${
                        ibvKpis.overdraftOccurrences === 0 ? 'text-green-600' : 
                        ibvKpis.overdraftOccurrences <= 2 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {ibvKpis.overdraftOccurrences} in last 90 days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loan Information - Right Side */}
          <div className='overflow-hidden rounded-xl bg-gradient-to-br from-[#097fa5] via-[#0a95c2] to-[#097fa5] shadow-xl border border-white/10'>
            <div className='bg-gradient-to-r from-[#333366]/20 to-transparent px-5 py-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#333366] to-[#2a2d5a] shadow-lg'>
                  <span className='text-3xl text-white'>💰</span>
                </div>
                <div className='flex-1'>
                  <h2 className='text-xl font-black text-white'>Loan Details</h2>
                  <p className='text-xs text-white/60'>Application Information</p>
                </div>
              </div>
            </div>

            <div className='bg-gray-50 p-5'>
              <div className='grid gap-4'>
                {/* Loan Amount - Large */}
                <div className='rounded-lg bg-gradient-to-br from-[#333366] to-[#097fa5] p-4 border-2 border-[#333366]/50 shadow-lg'>
                  <label className='text-xs font-bold text-white uppercase mb-1 block'>Loan Amount</label>
                  <p className='text-4xl font-black text-white drop-shadow-lg'>
                    {formatCurrency(application.loan_amount)}
                  </p>
                </div>

                {/* Income Source */}
                <div className='rounded-lg bg-white p-3 border border-gray-200 shadow-sm'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <label className='text-xs font-bold text-gray-500 uppercase'>Income Source</label>
                      <p className='text-lg font-black text-gray-900 capitalize mt-1'>
                        {application.income_source.replace(/-/g, ' ')}
                      </p>
                    </div>
                    <span className='text-2xl'>💼</span>
                  </div>
                </div>

                {/* Bankruptcy Plan */}
                <div className='rounded-lg bg-white p-3 border border-gray-200 shadow-sm'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <label className='text-xs font-bold text-gray-500 uppercase'>Bankruptcy Plan</label>
                      <p className='text-lg font-black text-gray-900 mt-1'>
                        {application.bankruptcy_plan ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <span className='text-2xl'>{application.bankruptcy_plan ? '⚠️' : '✅'}</span>
                  </div>
                </div>

                {/* Income Fields Summary */}
                {application.income_fields && Object.keys(application.income_fields).length > 0 && (
                  <div className='rounded-lg bg-white p-3 border border-gray-200 shadow-sm'>
                    <label className='text-xs font-bold text-gray-500 uppercase mb-2 block'>Income Details</label>
                    <div className='space-y-1 text-xs text-gray-700'>
                      {Object.entries(application.income_fields).slice(0, 3).map(([key, value]) => (
                        <p key={key}>
                          <span className='font-semibold capitalize'>{key.replace(/_/g, ' ')}:</span> {String(value)}
                        </p>
                      ))}
                      {Object.keys(application.income_fields).length > 3 && (
                        <p className='text-gray-500'>+{Object.keys(application.income_fields).length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Client Information - Compact */}
        <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
          <h3 className='mb-4 text-lg font-bold text-gray-900'>Additional Information</h3>
          
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

        {/* Income Details */}
        {application.income_fields && Object.keys(application.income_fields).length > 0 && (
          <div className='rounded-lg bg-white p-6 shadow-sm border border-gray-200'>
            <h3 className='mb-4 text-lg font-bold text-gray-900'>Income Details</h3>
            <div className='grid gap-2 text-sm'>
              {Object.entries(application.income_fields).map(([key, value]) => (
                <p key={key} className='text-gray-700'>
                  <span className='font-medium capitalize'>{key.replace(/_/g, ' ')}:</span> {String(value)}
                </p>
              ))}
            </div>
          </div>
        )}
        <div className='rounded-xl bg-gradient-to-br from-white to-blue-50 p-6 shadow-lg border-2 border-blue-100'>
          <div className='mb-6 flex items-center gap-3 border-b-2 border-blue-200 pb-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl text-white shadow-lg'>
              🏦
            </div>
            <div>
              <h2 className='text-xl font-bold text-gray-900'>IBV Verification & Risk Assessment</h2>
              <p className='text-sm text-gray-600'>Instant Bank Verification Analysis</p>
            </div>
          </div>

          {ibvKpis && (
            <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {/* Overall Risk Score */}
              <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
                <div className='mb-2 flex items-center justify-between'>
                  <label className='text-xs font-semibold text-gray-500 uppercase'>Risk Score</label>
                  <span className={`text-lg font-bold ${getScoreColor(ibvKpis.overallRiskScore)}`}>
                    {Math.round(ibvKpis.overallRiskScore)}%
                  </span>
                </div>
                <div className='h-2 w-full rounded-full bg-gray-100'>
                  <div 
                    className={`h-2 rounded-full ${
                      ibvKpis.overallRiskScore >= 70 ? 'bg-green-500' : 
                      ibvKpis.overallRiskScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${ibvKpis.overallRiskScore}%` }}
                  />
                </div>
              </div>

              {/* Bank Verification Score */}
              <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
                <div className='mb-2 flex items-center justify-between'>
                  <label className='text-xs font-semibold text-gray-500 uppercase'>Bank Verification</label>
                  <span className={`text-lg font-bold ${getScoreColor(ibvKpis.bankVerificationScore)}`}>
                    {Math.round(ibvKpis.bankVerificationScore)}%
                  </span>
                </div>
                <div className='h-2 w-full rounded-full bg-gray-100'>
                  <div 
                    className='h-2 rounded-full bg-green-500'
                    style={{ width: `${ibvKpis.bankVerificationScore}%` }}
                  />
                </div>
              </div>

              {/* KYC Risk Level */}
              <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
                <div className='mb-2 flex items-center justify-between'>
                  <label className='text-xs font-semibold text-gray-500 uppercase'>KYC Risk</label>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getRiskColor(ibvKpis.kycRiskLevel)}`}>
                    {ibvKpis.kycRiskLevel}
                  </span>
                </div>
                <p className='text-sm text-gray-600 mt-2'>Identity verification status</p>
              </div>

              {/* Average Account Balance */}
              <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
                <label className='text-xs font-semibold text-gray-500 uppercase mb-2 block'>Avg Balance</label>
                <p className='text-2xl font-bold text-blue-600'>{formatCurrency(ibvKpis.averageAccountBalance)}</p>
                <p className='text-xs text-gray-500 mt-1'>Last 90 days average</p>
              </div>

              {/* Monthly Income Verified */}
              <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
                <label className='text-xs font-semibold text-gray-500 uppercase mb-2 block'>Verified Income</label>
                <p className='text-2xl font-bold text-green-600'>{formatCurrency(ibvKpis.monthlyIncomeVerified)}</p>
                <p className='text-xs text-gray-500 mt-1'>Monthly verified</p>
              </div>

              {/* Account Age */}
              <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
                <label className='text-xs font-semibold text-gray-500 uppercase mb-2 block'>Account Age</label>
                <p className='text-2xl font-bold text-indigo-600'>{Math.round(ibvKpis.accountAge / 365)} yrs</p>
                <p className='text-xs text-gray-500 mt-1'>{Math.round(ibvKpis.accountAge)} days</p>
              </div>

              {/* Transaction Count */}
              <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
                <label className='text-xs font-semibold text-gray-500 uppercase mb-2 block'>Transactions</label>
                <p className='text-2xl font-bold text-purple-600'>{ibvKpis.transactionCount}</p>
                <p className='text-xs text-gray-500 mt-1'>Last 30 days</p>
              </div>

              {/* Overdraft Occurrences */}
              <div className='rounded-xl bg-white p-5 shadow-sm border border-gray-200'>
                <label className='text-xs font-semibold text-gray-500 uppercase mb-2 block'>Overdrafts</label>
                <p className={`text-2xl font-bold ${ibvKpis.overdraftOccurrences === 0 ? 'text-green-600' : ibvKpis.overdraftOccurrences <= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {ibvKpis.overdraftOccurrences}
                </p>
                <p className='text-xs text-gray-500 mt-1'>Last 90 days</p>
              </div>

              {/* Recommendation */}
              <div className='rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm border-2 border-blue-200 col-span-full'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md'>
                    {ibvKpis.overallRiskScore >= 70 ? '✅' : ibvKpis.overallRiskScore >= 50 ? '⚠️' : '❌'}
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-gray-700'>
                      {ibvKpis.overallRiskScore >= 70 
                        ? 'Recommendation: APPROVE' 
                        : ibvKpis.overallRiskScore >= 50 
                        ? 'Recommendation: MANUAL REVIEW REQUIRED'
                        : 'Recommendation: REJECT'}
                    </p>
                    <p className='text-xs text-gray-600 mt-1'>
                      Based on IBV analysis, account history, and risk assessment
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* References Card */}
        {application.references && application.references.length > 0 && (
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
              <span className='text-xl'>📋</span>
              <h2 className='text-lg font-semibold text-gray-900'>References</h2>
            </div>
            
            <div className='space-y-4'>
              {application.references.map((ref, index) => (
                <div key={ref.id} className='rounded-lg border border-gray-200 p-4'>
                  <div className='mb-2 flex items-center gap-2'>
                    <span className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600'>
                      {index + 1}
                    </span>
                    <h3 className='font-medium text-gray-900'>{ref.first_name} {ref.last_name}</h3>
                  </div>
                  <div className='grid gap-2 text-sm'>
                    <p className='text-gray-600'>Phone: {ref.phone}</p>
                    <p className='text-gray-600'>Relationship: {ref.relationship}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Card */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
            <span className='text-xl'>📅</span>
            <h2 className='text-lg font-semibold text-gray-900'>Timeline</h2>
          </div>
          
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
                <span className='font-medium text-green-600'>{formatDateTime(application.approved_at)}</span>
              </div>
            )}
            
            {application.rejected_at && (
              <div className='flex items-center gap-3'>
                <span className='text-gray-500'>Rejected:</span>
                <span className='font-medium text-red-600'>{formatDateTime(application.rejected_at)}</span>
              </div>
            )}
            
            <div className='flex items-center gap-3'>
              <span className='text-gray-500'>Last Updated:</span>
              <span className='font-medium text-gray-900'>{formatDateTime(application.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Staff Notes (if any) */}
        {application.staff_notes && (
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
              <span className='text-xl'>📝</span>
              <h2 className='text-lg font-semibold text-gray-900'>Staff Notes</h2>
            </div>
            <p className='text-sm text-gray-700'>{application.staff_notes}</p>
          </div>
        )}

        {/* Rejection Reason (if any) */}
        {application.rejection_reason && (
          <div className='rounded-lg bg-red-50 p-6 shadow-sm border border-red-200'>
            <div className='mb-4 flex items-center gap-2 border-b border-red-200 pb-3'>
              <span className='text-xl'>❌</span>
              <h2 className='text-lg font-semibold text-red-900'>Rejection Reason</h2>
            </div>
            <p className='text-sm text-red-700'>{application.rejection_reason}</p>
          </div>
        )}

        {/* Action Buttons - Modern Decision Interface */}
        <div className='rounded-xl bg-white p-6 shadow-sm border border-gray-200'>
          <div className='mb-4 flex items-center justify-between border-b border-gray-200 pb-4'>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>Decision</h3>
              <p className='text-sm text-gray-600'>Review all information and KPIs before making a decision</p>
            </div>
            <button
              onClick={() => router.push('/admin/applications')}
              className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
            >
              ← Back to Applications
            </button>
          </div>

          {application.application_status === 'pending' && (
            <div className='flex items-center justify-center gap-4'>
              <Button
                onClick={() => setShowRejectModal(true)}
                className='bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105'
              >
                ❌ Reject Application
              </Button>
              <Button
                onClick={() => setShowApproveModal(true)}
                className='bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105'
              >
                ✅ Approve Application
              </Button>
            </div>
          )}

          {application.application_status !== 'pending' && (
            <div className='text-center py-8'>
              <p className='text-gray-600'>This application has already been processed.</p>
              <button
                onClick={() => setShowApproveModal(true)}
                className='mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors'
              >
                View Details
              </button>
            </div>
          )}
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
            <div className='mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl'>
              <div className='mb-4 text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
                  <span className='text-3xl'>✅</span>
                </div>
                <h3 className='text-xl font-bold text-gray-900'>Approve Application</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Are you sure you want to approve this application?
                </p>
                {ibvKpis && (
                  <div className='mt-4 rounded-lg bg-green-50 p-3 text-left text-xs text-gray-700'>
                    <p className='font-semibold mb-1'>Based on IBV Analysis:</p>
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
                  className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className='flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50'
                >
                  {processing ? 'Processing...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
            <div className='mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl'>
              <div className='mb-4 text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
                  <span className='text-3xl'>❌</span>
                </div>
                <h3 className='text-xl font-bold text-gray-900'>Reject Application</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  Please provide a reason for rejection:
                </p>
                {ibvKpis && (
                  <div className='mt-4 rounded-lg bg-red-50 p-3 text-left text-xs text-gray-700'>
                    <p className='font-semibold mb-1'>Based on IBV Analysis:</p>
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
                  className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className='flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'
                >
                  {processing ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  )
}

