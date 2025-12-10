'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'
import { parseLocalDate } from '@/src/lib/utils/date'
import type {
  LoanApplication,
  ApplicationStatus
} from '@/src/lib/supabase/types'

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
  } | null
  addresses: {
    id: string
    street_number: string | null
    street_name: string | null
    apartment_number: string | null
    city: string
    province: string
    postal_code: string
  } | null
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

interface StatusCounts {
  pending: number
  processing: number
  pre_approved: number
  contract_pending: number
  contract_signed: number
  approved: number
  rejected: number
  cancelled: number
}

export default function ApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>(
    'all'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(100) // Default limit per page
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    processing: 0,
    pre_approved: 0,
    contract_pending: 0,
    contract_signed: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  })

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to page 1 when search changes
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchApplications = async (page: number = currentPage) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      // Add search term if provided
      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim())
      }

      const response = await fetch(`/api/admin/applications?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch applications')
      }

      const data = await response.json()
      setApplications(data.applications || [])
      setStatusCounts(
        data.statusCounts || {
          pending: 0,
          processing: 0,
          pre_approved: 0,
          contract_pending: 0,
          contract_signed: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0
        }
      )
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1)
        setTotal(data.pagination.total || 0)
        setCurrentPage(data.pagination.page || 1)
      }
      setError(null)
    } catch (err: any) {
      console.error('Error fetching applications:', err)
      setError(err.message || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, debouncedSearchTerm])

  // Fetch applications when page or filters change
  useEffect(() => {
    fetchApplications(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, debouncedSearchTerm])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleStatusFilterChange = (newStatus: ApplicationStatus | 'all') => {
    setStatusFilter(newStatus)
    setCurrentPage(1) // Reset to page 1 when filter changes
  }

  const getStatusBadgeColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pre_approved':
        return 'bg-green-100 text-green-800'
      case 'contract_pending':
        return 'bg-purple-100 text-purple-800'
      case 'contract_signed':
        return 'bg-indigo-100 text-indigo-800'
      case 'approved':
        return 'bg-emerald-100 text-emerald-800'
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
    const { parseLocalDate } = require('@/src/lib/utils/date')
    return parseLocalDate(dateString).toLocaleDateString('en-US', {
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

  const getClientName = (app: ApplicationWithDetails) => {
    const firstName = app.users?.first_name || ''
    const lastName = app.users?.last_name || ''
    return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'N/A'
  }

  const formatIncomeSource = (source?: string | null) => {
    if (!source) return 'N/A'

    const labels: Record<string, string> = {
      employed: 'Employed',
      'employment-insurance': 'Employment Insurance',
      'self-employed': 'Self-Employed',
      'csst-saaq': 'CSST/SAAQ',
      'parental-insurance': 'Parental Insurance',
      'retirement-plan': 'Retirement Plan'
    }

    return labels[source] || source
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-3'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-lg font-bold text-gray-900'>
              Loan Applications
            </h1>
            <p className='text-[10px] text-gray-600'>
              Review and manage all loan applications
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => fetchApplications()}
              disabled={loading}
              className='flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
            >
              <svg
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className='rounded-lg bg-white px-3 py-1.5 shadow-sm'>
              <div className='flex items-center gap-1.5'>
                <span className='text-sm'>📝</span>
                <span className='text-lg font-bold text-gray-900'>
                  {total}
                </span>
                <span className='text-[10px] text-gray-500'>total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid gap-2 md:grid-cols-5'>
          <div
            className='cursor-pointer rounded-lg bg-yellow-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => handleStatusFilterChange('pending')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-yellow-800'>Pending</h3>
              <span className='text-sm'>⏳</span>
            </div>
            <p className='text-xl font-bold text-yellow-900'>
              {statusCounts.pending}
            </p>
          </div>

          <div
            className='cursor-pointer rounded-lg bg-blue-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => handleStatusFilterChange('processing')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-blue-800'>Processing</h3>
              <span className='text-sm'>🔄</span>
            </div>
            <p className='text-xl font-bold text-blue-900'>
              {statusCounts.processing}
            </p>
          </div>

          <div
            className='cursor-pointer rounded-lg bg-green-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => handleStatusFilterChange('approved')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-green-800'>Approved</h3>
              <span className='text-sm'>✅</span>
            </div>
            <p className='text-xl font-bold text-green-900'>
              {statusCounts.approved}
            </p>
          </div>

          <div
            className='cursor-pointer rounded-lg bg-red-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => handleStatusFilterChange('rejected')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-red-800'>Rejected</h3>
              <span className='text-sm'>❌</span>
            </div>
            <p className='text-xl font-bold text-red-900'>
              {statusCounts.rejected}
            </p>
          </div>

          <div
            className='cursor-pointer rounded-lg bg-gray-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => handleStatusFilterChange('cancelled')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-gray-800'>Cancelled</h3>
              <span className='text-sm'>🚫</span>
            </div>
            <p className='text-xl font-bold text-gray-900'>
              {statusCounts.cancelled}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className='rounded-lg bg-white p-2.5 shadow-sm'>
          <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-3'>
              <label className='text-xs font-medium text-gray-700'>
                Status:
              </label>
              <div className='w-48'>
                <Select
                  value={statusFilter}
                  onValueChange={value =>
                    handleStatusFilterChange(value as ApplicationStatus | 'all')
                  }
                  options={[
                    { value: 'all', label: 'All Applications' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                  placeholder='Select status'
                  className='!px-3 !py-2 !text-sm'
                />
              </div>
            </div>

            <div className='relative flex items-center gap-2'>
              <div className='relative flex-1 md:w-64'>
                <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
                  <svg
                    className='h-4 w-4 text-gray-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                    />
                  </svg>
                </div>
                <input
                  type='text'
                  placeholder='Search by name, email, or phone...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 pl-9 pr-8 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className='absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 transition-colors'
                    aria-label='Clear search'
                  >
                    <svg
                      className='h-4 w-4'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className='rounded-lg bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-3 py-1.5'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xs font-semibold text-gray-900'>
                {statusFilter === 'all'
                  ? 'All Applications'
                  : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Applications`}
              </h2>
              <span className='text-[10px] text-gray-500'>
                Showing {(currentPage - 1) * limit + 1}-
                {Math.min(currentPage * limit, total)} of {total}{' '}
                {total === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600'></div>
                <p className='mt-3 text-xs text-gray-600'>Loading applications...</p>
              </div>
            ) : error ? (
              <div className='p-8 text-center'>
                <span className='mb-3 block text-2xl'>⚠️</span>
                <p className='text-sm text-red-600'>{error}</p>
              </div>
            ) : applications.length === 0 ? (
              <div className='p-8 text-center'>
                <span className='mb-3 block text-2xl'>📝</span>
                <p className='text-sm text-gray-600'>No applications found</p>
                <p className='mt-1 text-xs text-gray-400'>
                  {debouncedSearchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Applications will appear here once they are submitted'}
                </p>
              </div>
            ) : (
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                      Applicant
                    </th>
                    <th className='px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                      Amount
                    </th>
                    <th className='px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                      Income Source
                    </th>
                    <th className='px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                      Status
                    </th>
                    <th className='px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                      Province
                    </th>
                    <th className='px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                      IBV Status
                    </th>
                    <th className='px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                      Submitted
                    </th>
                    <th className='px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 bg-white'>
                  {applications.map(app => (
                    <tr
                      key={app.id}
                      className='transition-colors hover:bg-gray-50'
                    >
                      <td className='px-3 py-1.5'>
                        <div className='flex items-center'>
                          <div className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-blue-600'>
                            {app.users?.first_name?.[0] || '?'}
                          </div>
                          <div className='ml-2'>
                            <div className='text-xs font-medium text-gray-900'>
                              {getClientName(app)}
                            </div>
                            <div className='text-[10px] text-gray-500'>
                              {app.users?.email || 'No email'}
                            </div>
                            <div className='text-[10px] text-gray-400'>
                              {app.users?.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-3 py-1.5'>
                        <div className='text-xs font-semibold text-gray-900'>
                          {formatCurrency(app.loan_amount)}
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-3 py-1.5'>
                        <span className='text-[10px] text-gray-600'>
                          {formatIncomeSource(app.income_source)}
                        </span>
                      </td>
                      <td className='px-3 py-1.5'>
                        <div className='flex flex-col gap-0.5'>
                          <span
                            className={`inline-flex w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadgeColor(app.application_status)}`}
                          >
                            {app.application_status.toUpperCase()}
                          </span>
                          {app.application_status === 'rejected' && app.rejection_reason && (
                            <div className='group relative'>
                              <div className='flex items-start gap-1 text-[10px] text-red-700 cursor-help'>
                                <svg
                                  className='h-3 w-3 flex-shrink-0 mt-0.5'
                                  fill='none'
                                  stroke='currentColor'
                                  viewBox='0 0 24 24'
                                >
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                  />
                                </svg>
                                <span className='truncate max-w-[150px] leading-tight'>
                                  {app.rejection_reason}
                                </span>
                              </div>
                              {/* Tooltip on hover for full reason */}
                              <div className='pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-w-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] text-gray-700 shadow-xl group-hover:block'>
                                <p className='whitespace-normal font-medium text-gray-900 mb-0.5'>
                                  Rejection Reason:
                                </p>
                                <p className='whitespace-normal'>{app.rejection_reason}</p>
                                <div className='absolute -top-1 left-3 h-2 w-2 rotate-45 border-l border-t border-gray-200 bg-white'></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-3 py-1.5 text-xs text-gray-900'>
                        {app.addresses ? app.addresses.province : 'N/A'}
                      </td>
                      <td className='whitespace-nowrap px-3 py-1.5'>
                        <span
                          className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            app.ibv_status === 'verified'
                              ? 'bg-green-100 text-green-800'
                              : app.ibv_status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : app.ibv_status === 'cancelled'
                                  ? 'bg-gray-100 text-gray-800'
                                  : app.ibv_status === 'processing'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {app.ibv_status?.toUpperCase() || 'PENDING'}{' '}
                          {app.ibv_provider ? `(${app.ibv_provider})` : ''}
                        </span>
                      </td>
                      <td className='whitespace-nowrap px-3 py-1.5 text-[10px] text-gray-500'>
                        {formatDate(app.created_at)}
                      </td>
                      <td className='whitespace-nowrap px-3 py-1.5 text-xs'>
                        <button
                          onClick={() =>
                            router.push(`/admin/applications/${app.id}`)
                          }
                          className='mr-1.5 text-blue-600 hover:text-blue-800 text-[10px]'
                        >
                          View
                        </button>
                        <button className='text-green-600 hover:text-green-800 text-[10px]'>
                          Process
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && !error && totalPages > 1 && (
            <div className='border-t border-gray-200 px-3 py-2'>
              <div className='flex items-center justify-between'>
                <div className='text-xs text-gray-700'>
                  Page {currentPage} of {totalPages}
                </div>
                <div className='flex items-center gap-1.5'>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className='rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    Previous
                  </button>
                  <div className='flex items-center gap-1'>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className='rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminDashboardLayout>
  )
}
