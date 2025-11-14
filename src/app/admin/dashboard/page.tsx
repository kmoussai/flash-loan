'use client'

import { useEffect, useState } from 'react'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Link from 'next/link'
import type { ApplicationStatus } from '@/src/lib/supabase/types'

interface DashboardStats {
  applications: {
    total: number
    thisWeek: number
    thisMonth: number
    statusCounts: {
      pending: number
      processing: number
      pre_approved: number
      contract_pending: number
      contract_signed: number
      approved: number
      rejected: number
      cancelled: number
    }
    totalAmount: number
  }
  users: {
    total: number
    verified: number
    pendingKyc: number
  }
  staff: {
    total: number
    admins: number
    support: number
    interns: number
  }
  loans: {
    total: number
    active: number
    completed: number
    pendingDisbursement: number
    totalAmount: number
  }
  recentApplications: Array<{
    id: string
    loan_amount: number
    status: ApplicationStatus
    created_at: string
  }>
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const getStatusBadgeColor = (status: ApplicationStatus) => {
  const colors: Record<ApplicationStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    pre_approved: 'bg-purple-100 text-purple-800',
    contract_pending: 'bg-indigo-100 text-indigo-800',
    contract_signed: 'bg-cyan-100 text-cyan-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status: ApplicationStatus) => {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard/stats')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch dashboard stats')
      }

      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err)
      setError(err.message || 'Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const pendingCount =
    (stats?.applications.statusCounts.pending || 0) +
    (stats?.applications.statusCounts.processing || 0)

  const approvedCount = stats?.applications.statusCounts.approved || 0
  const totalUsers = stats?.users.total || 0
  const totalApplications = stats?.applications.total || 0
  const totalLoans = stats?.loans.total || 0
  const totalLoanAmount = stats?.loans.totalAmount || 0
  const activeLoans = stats?.loans.active || 0
  const processingCount = stats?.applications.statusCounts.processing || 0

  return (
    <AdminDashboardLayout>
      <div className='space-y-6'>
    

        {error && (
          <div className='rounded-lg bg-red-50 p-4 text-red-800'>
            <p className='font-medium'>Error loading dashboard</p>
            <p className='text-sm'>{error}</p>
          </div>
        )}

        {/* Stats Grid with Modern Cards */}
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {/* Total Applications */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
                {stats && stats.applications.thisWeek > 0 && (
                  <span className='rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600'>
                    +{stats.applications.thisWeek} this week
                  </span>
                )}
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Total Applications
              </h3>
              <p className='text-3xl font-bold text-gray-900'>
                {loading ? '...' : totalApplications}
              </p>
              <p className='mt-2 text-xs text-gray-500'>
                {stats?.applications.thisMonth || 0} this month
              </p>
            </div>
          </div>

          {/* Pending Review */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                {pendingCount > 0 && (
                  <span className='rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600'>
                    Live
                  </span>
                )}
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Pending Review
              </h3>
              <p className='text-3xl font-bold text-gray-900'>
                {loading ? '...' : pendingCount}
              </p>
              <p className='mt-2 text-xs text-gray-500'>
                {processingCount} processing
              </p>
            </div>
          </div>

          {/* Approved */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                {stats && totalApplications > 0 && (
                  <span className='rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600'>
                    {Math.round((approvedCount / totalApplications) * 100)}%
                  </span>
                )}
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Approved
              </h3>
              <p className='text-3xl font-bold text-gray-900'>
                {loading ? '...' : approvedCount}
              </p>
              <p className='mt-2 text-xs text-gray-500'>Successfully approved</p>
            </div>
          </div>

          {/* Active Users */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' />
                  </svg>
                </div>
                {stats && stats.users.verified > 0 && (
                  <span className='rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600'>
                    {stats.users.verified} verified
                  </span>
                )}
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Active Users
              </h3>
              <p className='text-3xl font-bold text-gray-900'>
                {loading ? '...' : totalUsers}
              </p>
              <p className='mt-2 text-xs text-gray-500'>Registered users</p>
            </div>
          </div>
        </div>

        {/* Additional Stats Grid */}
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {/* Total Loans */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                {activeLoans > 0 && (
                  <span className='rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600'>
                    {activeLoans} active
                  </span>
                )}
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Total Loans
              </h3>
              <p className='text-3xl font-bold text-gray-900'>
                {loading ? '...' : totalLoans}
              </p>
              <p className='mt-2 text-xs text-gray-500'>
                {stats?.loans.completed || 0} completed
              </p>
            </div>
          </div>

          {/* Total Loan Amount */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' />
                  </svg>
                </div>
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Total Loan Amount
              </h3>
              <p className='text-3xl font-bold text-gray-900'>
                {loading ? '...' : formatCurrency(totalLoanAmount)}
              </p>
              <p className='mt-2 text-xs text-gray-500'>
                {formatCurrency(stats?.applications.totalAmount || 0)} in applications
              </p>
            </div>
          </div>

          {/* Processing Applications */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                  </svg>
                </div>
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Processing
              </h3>
              <p className='text-3xl font-bold text-gray-900'>
                {loading ? '...' : processingCount}
              </p>
              <p className='mt-2 text-xs text-gray-500'>
                {stats?.applications.statusCounts.pre_approved || 0} pre-approved
              </p>
            </div>
          </div>

          {/* Staff Members */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                  </svg>
                </div>
                {stats && stats.staff.admins > 0 && (
                  <span className='rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-600'>
                    {stats.staff.admins} admins
                  </span>
                )}
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Staff Members
              </h3>
              <p className='text-3xl font-bold text-gray-900'>
                {loading ? '...' : stats?.staff.total || 0}
              </p>
              <p className='mt-2 text-xs text-gray-500'>
                {stats?.staff.support || 0} support, {stats?.staff.interns || 0} interns
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className='grid gap-6 lg:grid-cols-2'>
          {/* Recent Activity */}
          <div className='rounded-2xl bg-white p-6 shadow-md'>
            <div className='mb-6 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-gray-900'>
                Recent Activity
              </h2>
              <Link
                href='/admin/applications'
                className='text-sm font-medium text-[#097fa5] hover:text-[#333366] transition-colors'
              >
                View All →
              </Link>
            </div>
            {loading ? (
              <div className='flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-12'>
                <div className='mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#097fa5]'></div>
                <p className='text-sm text-gray-600'>Loading recent activity...</p>
              </div>
            ) : stats && stats.recentApplications.length > 0 ? (
              <div className='space-y-3'>
                {stats.recentApplications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/admin/applications/${app.id}`}
                    className='group flex items-center justify-between rounded-xl border-2 border-gray-100 p-4 transition-all duration-300 hover:border-[#097fa5] hover:bg-gradient-to-r hover:from-[#097fa5]/5 hover:to-transparent'
                  >
                    <div className='flex-1'>
                      <div className='mb-1 flex items-center gap-2'>
                        <span className='font-medium text-gray-900'>
                          {formatCurrency(parseFloat(app.loan_amount.toString()))}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadgeColor(app.status)}`}
                        >
                          {getStatusLabel(app.status)}
                        </span>
                      </div>
                      <p className='text-xs text-gray-500'>{formatDate(app.created_at)}</p>
                    </div>
                    <svg
                      className='h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-12'>
                <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200'>
                  <svg className='h-8 w-8 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                  </svg>
                </div>
                <p className='mb-2 text-sm font-medium text-gray-900'>No recent activity</p>
                <p className='text-center text-xs text-gray-500'>
                  Activities will appear here once users start applying for loans
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className='rounded-2xl bg-white p-6 shadow-md'>
            <h2 className='mb-6 text-xl font-bold text-gray-900'>
              Quick Actions
            </h2>
            <div className='space-y-3'>
              <Link
                href='/admin/applications'
                className='group flex items-center justify-between rounded-xl border-2 border-gray-100 p-4 transition-all duration-300 hover:border-[#097fa5] hover:bg-gradient-to-r hover:from-[#097fa5]/5 hover:to-transparent'
              >
                <div className='flex items-center space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white'>
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                    </svg>
                  </div>
                  <span className='font-medium text-gray-700'>View Applications</span>
                </div>
                <svg className='h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </Link>

              <Link
                href='/admin/clients'
                className='group flex items-center justify-between rounded-xl border-2 border-gray-100 p-4 transition-all duration-300 hover:border-[#097fa5] hover:bg-gradient-to-r hover:from-[#097fa5]/5 hover:to-transparent'
              >
                <div className='flex items-center space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white'>
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' />
                    </svg>
                  </div>
                  <span className='font-medium text-gray-700'>Manage Clients</span>
                </div>
                <svg className='h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </Link>

              <Link
                href='/admin/staff'
                className='group flex items-center justify-between rounded-xl border-2 border-gray-100 p-4 transition-all duration-300 hover:border-[#097fa5] hover:bg-gradient-to-r hover:from-[#097fa5]/5 hover:to-transparent'
              >
                <div className='flex items-center space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white'>
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                    </svg>
                  </div>
                  <span className='font-medium text-gray-700'>Manage Staff</span>
                </div>
                <svg className='h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

