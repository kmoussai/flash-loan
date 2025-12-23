'use client'

import { Fragment, useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'
import LoanSummary from './components/LoanSummary'
import { fetcher } from '@/lib/utils'
import useSWR from 'swr'

// Loan status type matching database enum
type LoanStatusDB =
  | 'pending_disbursement'
  | 'active'
  | 'completed'
  | 'defaulted'
  | 'cancelled'
type LoanStatusUI = 'active' | 'paid' | 'defaulted' | 'pending' | 'cancelled'

// API response interface
interface LoanFromAPI {
  id: string
  loan_number?: number
  application_id: string
  user_id: string
  principal_amount: number
  interest_rate: number
  term_months: number
  disbursement_date: string | null
  due_date: string | null
  remaining_balance: number
  status: LoanStatusDB
  created_at: string
  updated_at: string
  loan_applications: {
    id: string
    loan_amount: number
    application_status: string
  } | null
  users?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
  } | null
}

// UI loan interface
interface Loan {
  id: string
  loan_number: string
  borrower_name: string
  borrower_email: string
  borrower_phone: string
  loan_amount: number
  remaining_balance: number
  interest_rate: number
  term_months: number
  status: LoanStatusUI
  origination_date: string
  next_payment_date: string | null
  last_payment_date: string | null
  total_payments: number
  province: string
}

// Extended API loan interface
interface LoanFromAPIWithPayments extends LoanFromAPI {
  next_payment_date?: string | null
}

interface StatusCounts {
  active: number
  paid: number
  defaulted: number
  pending: number
  cancelled: number
}

// Map database status to UI status
const mapStatusToUI = (status: LoanStatusDB): LoanStatusUI => {
  switch (status) {
    case 'pending_disbursement':
      return 'pending'
    case 'completed':
      return 'paid'
    default:
      return status as LoanStatusUI
  }
}

// Map UI status to database status for filtering
const mapStatusToDB = (status: LoanStatusUI | 'all'): LoanStatusDB | 'all' => {
  if (status === 'all') return 'all'
  switch (status) {
    case 'pending':
      return 'pending_disbursement'
    case 'paid':
      return 'completed'
    default:
      return status as LoanStatusDB
  }
}

// Transform API loan to UI loan
const transformLoan = (apiLoan: LoanFromAPIWithPayments, index: number): Loan => {
  const firstName = apiLoan.users?.first_name || ''
  const lastName = apiLoan.users?.last_name || ''
  const borrowerName = `${firstName} ${lastName}`.trim() || 'N/A'

  // For paid loans, balance should always be 0
  const balance = apiLoan.status === 'completed' ? 0 : Number(apiLoan.remaining_balance || 0)

  // Use next_payment_date from API (calculated from pending payments) for "Next Payment" column
  const displayPaymentDate = apiLoan.next_payment_date || apiLoan.due_date

  return {
    id: apiLoan.id,
    loan_number:
      apiLoan.loan_number !== undefined && apiLoan.loan_number !== null
        ? `LN-${String(apiLoan.loan_number).padStart(6, '0')}`
        : `LN-${String(index + 1).padStart(6, '0')}`,
    borrower_name: borrowerName,
    borrower_email: apiLoan.users?.email || 'N/A',
    borrower_phone: apiLoan.users?.phone || 'N/A',
    loan_amount: Number(apiLoan.principal_amount),
    remaining_balance: balance,
    interest_rate: Number(apiLoan.interest_rate),
    term_months: apiLoan.term_months,
    status: mapStatusToUI(apiLoan.status),
    origination_date: apiLoan.disbursement_date || apiLoan.created_at,
    next_payment_date: displayPaymentDate,
    last_payment_date: null, // Not needed for display, but kept for interface compatibility
    total_payments: 0, // Will be calculated from payments if needed
    province: 'N/A' // Not in loan table, could be fetched from address if needed
  }
}

export default function LoansPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<LoanStatusUI | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)
  const limit = 50 // Items per page

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setPage(1) // Reset to first page on new search
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset page when status filter changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  // Build API URL with query params
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') {
      const dbStatus = mapStatusToDB(statusFilter)
      if (dbStatus !== 'all') {
        params.append('status', dbStatus)
      }
    }
    if (debouncedSearchTerm) {
      params.append('search', debouncedSearchTerm)
    }
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    return `/api/admin/loans?${params.toString()}`
  }, [statusFilter, debouncedSearchTerm, page, limit])

  const {
    data,
    isLoading: loading,
    error,
    mutate: fetchLoans,
    isValidating: validating
  } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false
  })

  const [loans, statusCounts, pagination] = useMemo(() => {
    const apiLoans: LoanFromAPI[] = data?.loans || []
    const apiCounts = data?.statusCounts || {}
    const apiPagination = data?.pagination || {
      page: 1,
      limit,
      total: 0,
      totalPages: 0
    }
    const counts: StatusCounts = {
      active: apiCounts.active || 0,
      paid: apiCounts.completed || 0,
      defaulted: apiCounts.defaulted || 0,
      pending: apiCounts.pending_disbursement || 0,
      cancelled: apiCounts.cancelled || 0
    }
    return [apiLoans, counts, apiPagination]
  }, [data?.loans, data?.statusCounts, data?.pagination, limit])

  const getStatusBadgeColor = (status: LoanStatusUI) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'defaulted':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
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
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-2'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-lg font-bold text-gray-900'>Loans</h1>
            <p className='text-[10px] text-gray-600'>
              Manage and track all active and historical loans
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={fetchLoans}
              disabled={loading}
              className='flex items-center gap-1.5 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50'
            >
              <svg
                className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}
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
              {loading || validating ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className='rounded-md bg-white px-3 py-1.5 shadow-sm'>
              <div className='flex items-center gap-1.5'>
                <span className='text-sm'>💰</span>
                <span className='text-lg font-bold text-gray-900'>
                  {pagination?.total || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid gap-2 md:grid-cols-5'>
          <div
            className='cursor-pointer rounded-md bg-blue-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => setStatusFilter('active')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-blue-800'>Active</h3>
              <span className='text-xs'>📊</span>
            </div>
            <p className='text-lg font-bold text-blue-900'>
              {statusCounts.active}
            </p>
          </div>

          <div
            className='cursor-pointer rounded-md bg-green-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => setStatusFilter('paid')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-green-800'>Paid</h3>
              <span className='text-xs'>✅</span>
            </div>
            <p className='text-lg font-bold text-green-900'>
              {statusCounts.paid}
            </p>
          </div>

          <div
            className='cursor-pointer rounded-md bg-red-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => setStatusFilter('defaulted')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-red-800'>
                Defaulted
              </h3>
              <span className='text-xs'>⚠️</span>
            </div>
            <p className='text-lg font-bold text-red-900'>
              {statusCounts.defaulted}
            </p>
          </div>

          <div
            className='cursor-pointer rounded-md bg-yellow-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => setStatusFilter('pending')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-yellow-800'>
                Pending
              </h3>
              <span className='text-xs'>⏳</span>
            </div>
            <p className='text-lg font-bold text-yellow-900'>
              {statusCounts.pending}
            </p>
          </div>

          <div
            className='cursor-pointer rounded-md bg-gray-50 p-2 shadow-sm transition-all hover:shadow-md'
            onClick={() => setStatusFilter('cancelled')}
          >
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-gray-800'>
                Cancelled
              </h3>
              <span className='text-xs'>🚫</span>
            </div>
            <p className='text-lg font-bold text-gray-900'>
              {statusCounts.cancelled}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className='rounded-md bg-white p-2 shadow-sm'>
          <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-2'>
              <label className='text-[10px] font-medium text-gray-700'>
                Status:
              </label>
              <div className='w-40'>
                <Select
                  value={statusFilter}
                  onValueChange={value =>
                    setStatusFilter(value as LoanStatusUI | 'all')
                  }
                  options={[
                    { value: 'all', label: 'All Loans' },
                    { value: 'active', label: 'Active' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'defaulted', label: 'Defaulted' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                  placeholder='Select status'
                  className='!px-2 !py-1.5 !text-xs'
                />
              </div>
            </div>

            <div className='flex items-center gap-1.5'>
              <input
                type='text'
                placeholder='Search by name, email, phone, or loan number...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-56'
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className='text-xs text-gray-400 hover:text-gray-600'
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loans Table */}
        <div className='rounded-md bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-2 py-1.5'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xs font-semibold text-gray-900'>
                {statusFilter === 'all'
                  ? 'All Loans'
                  : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Loans`}
              </h2>
              <span className='text-[10px] text-gray-500'>
                {pagination?.total || 0}{' '}
                {(pagination?.total || 0) === 1 ? 'result' : 'results'}
                {pagination && pagination.totalPages > 1 && (
                  <span className='ml-1'>
                    (Page {pagination.page} of {pagination.totalPages})
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Loan #
                  </th>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Borrower
                  </th>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Amount
                  </th>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Balance
                  </th>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Rate
                  </th>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Status
                  </th>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Next Payment
                  </th>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Originated
                  </th>
                  <th className='px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white'>
                {loans.map((l, index) => {
                  const loan = transformLoan(l, index)
                  return (
                    <Fragment key={loan.id}>
                      <tr
                        key={loan.id}
                        className='cursor-pointer transition-colors hover:bg-gray-50'
                        onClick={() =>
                          selectedLoanId === loan.id
                            ? setSelectedLoanId(null)
                            : setSelectedLoanId(loan.id)
                        }
                        // onClick={() => router.push(`/admin/loan/${loan.id}`)}
                      >
                        <td className='whitespace-nowrap px-2 py-1.5'>
                          <div className='text-xs font-semibold text-gray-900'>
                            {loan.loan_number}
                          </div>
                          <div className='text-[10px] text-gray-500'>
                            {loan.province}
                          </div>
                        </td>
                        <td className='px-2 py-1.5'>
                          <div className='flex items-center'>
                            <div className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-medium text-purple-600'>
                              {loan.borrower_name &&
                              loan.borrower_name !== 'N/A'
                                ? loan.borrower_name[0]
                                : '?'}
                            </div>
                            <div className='ml-2'>
                              <div className='text-xs font-medium text-gray-900'>
                                {loan.borrower_name}
                              </div>
                              <div className='text-[10px] text-gray-500'>
                                {loan.borrower_email}
                              </div>
                              <div className='text-[10px] text-gray-400'>
                                {loan.borrower_phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-2 py-1.5'>
                          <div className='text-xs font-semibold text-gray-900'>
                            {formatCurrency(loan.loan_amount)}
                          </div>
                          <div className='text-[10px] text-gray-500'>
                            {loan.term_months}m
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-2 py-1.5'>
                          <div className='text-xs font-semibold text-gray-900'>
                            {formatCurrency(loan.remaining_balance)}
                          </div>
                          <div className='text-[10px] text-gray-500'>
                            {loan.total_payments} paid
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-2 py-1.5 text-xs text-gray-900'>
                          {loan.interest_rate}%
                        </td>
                        <td className='whitespace-nowrap px-2 py-1.5'>
                          <span
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadgeColor(loan.status)}`}
                          >
                            {loan.status.toUpperCase()}
                          </span>
                        </td>
                        <td className='whitespace-nowrap px-2 py-1.5 text-[10px] text-gray-500'>
                          {formatDate(loan.next_payment_date)}
                        </td>
                        <td className='whitespace-nowrap px-2 py-1.5 text-[10px] text-gray-500'>
                          {formatDate(loan.origination_date)}
                        </td>
                        <td
                          className='whitespace-nowrap px-2 py-1.5 text-xs'
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            className='mr-1.5 text-[10px] text-blue-600 hover:text-blue-800'
                            onClick={() =>
                              router.push(`/admin/loan/${loan.id}`)
                            }
                          >
                            View
                          </button>
                          <button
                            className='text-[10px] text-green-600 hover:text-green-800'
                            onClick={() =>
                              router.push(`/admin/loan/${loan.id}`)
                            }
                          >
                            Details
                          </button>
                        </td>
                      </tr>

                      {selectedLoanId === loan.id && (
                        <tr>
                          <td colSpan={10}>
                            <LoanSummary loan={l} onLoanUpdate={fetchLoans} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            {!loading && !validating && loans.length === 0 && (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>💰</span>
                <p className='text-xs text-gray-600'>No loans found</p>
                <p className='mt-1 text-[10px] text-gray-400'>
                  {debouncedSearchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Loans will appear here once they are created'}
                </p>
              </div>
            )}
            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className='border-t border-gray-200 px-2 py-2'>
                <div className='flex items-center justify-between'>
                  <div className='text-[10px] text-gray-500'>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{' '}
                    of {pagination.total} results
                  </div>
                  <div className='flex items-center gap-1'>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={pagination.page === 1 || loading}
                      className='rounded-md border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      Previous
                    </button>
                    <span className='px-2 text-[10px] text-gray-500'>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage(p => Math.min(pagination.totalPages, p + 1))
                      }
                      disabled={
                        pagination.page === pagination.totalPages || loading
                      }
                      className='rounded-md border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
            {loading && (
              <div className='p-8 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                <p className='mt-2 text-xs text-gray-600'>Loading loans...</p>
              </div>
            )}
            {error && error.message && (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>⚠️</span>
                <p className='text-xs text-red-600'>{error.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}
