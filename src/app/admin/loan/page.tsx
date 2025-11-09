'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'

// Loan status type matching database enum
type LoanStatusDB = 'pending_disbursement' | 'active' | 'completed' | 'defaulted' | 'cancelled'
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
const transformLoan = (apiLoan: LoanFromAPI, index: number): Loan => {
  const firstName = apiLoan.users?.first_name || ''
  const lastName = apiLoan.users?.last_name || ''
  const borrowerName = `${firstName} ${lastName}`.trim() || 'N/A'
  
  return {
    id: apiLoan.id,
    loan_number: apiLoan.loan_number !== undefined && apiLoan.loan_number !== null
      ? `LN-${String(apiLoan.loan_number).padStart(6, '0')}`
      : `LN-${String(index + 1).padStart(6, '0')}`,
    borrower_name: borrowerName,
    borrower_email: apiLoan.users?.email || 'N/A',
    borrower_phone: apiLoan.users?.phone || 'N/A',
    loan_amount: Number(apiLoan.principal_amount),
    remaining_balance: Number(apiLoan.remaining_balance),
    interest_rate: Number(apiLoan.interest_rate),
    term_months: apiLoan.term_months,
    status: mapStatusToUI(apiLoan.status),
    origination_date: apiLoan.disbursement_date || apiLoan.created_at,
    next_payment_date: apiLoan.due_date,
    last_payment_date: null, // Will be calculated from payments if needed
    total_payments: 0, // Will be calculated from payments if needed
    province: 'N/A' // Not in loan table, could be fetched from address if needed
  }
}

export default function LoansPage() {
  const router = useRouter()
  const [loans, setLoans] = useState<Loan[]>([])
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<LoanStatusUI | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    active: 0,
    paid: 0,
    defaulted: 0,
    pending: 0,
    cancelled: 0
  })

  const fetchLoans = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/loans')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch loans')
      }
      
      const data = await response.json()
      const apiLoans: LoanFromAPI[] = data.loans || []
      
      // Transform API loans to UI format
      const transformedLoans = apiLoans.map((loan, index) => transformLoan(loan, index))
      
      setLoans(transformedLoans)
      
      // Map status counts from API to UI format
      const apiCounts = data.statusCounts || {}
      const counts: StatusCounts = {
        active: apiCounts.active || 0,
        paid: apiCounts.completed || 0,
        defaulted: apiCounts.defaulted || 0,
        pending: apiCounts.pending_disbursement || 0,
        cancelled: apiCounts.cancelled || 0
      }
      setStatusCounts(counts)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching loans:', err)
      setError(err.message || 'Failed to load loans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoans()
  }, [])

  useEffect(() => {
    let filtered = loans

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(loan => loan.status === statusFilter)
    }

    // Filter by search term (name, email, phone, loan number)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(loan => {
        const name = loan.borrower_name.toLowerCase()
        const email = loan.borrower_email.toLowerCase()
        const phone = loan.borrower_phone.toLowerCase()
        const loanNumber = loan.loan_number.toLowerCase()
        
        return name.includes(term) || 
               email.includes(term) || 
               phone.includes(term) ||
               loanNumber.includes(term)
      })
    }

    setFilteredLoans(filtered)
  }, [statusFilter, searchTerm, loans])

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
            <h1 className='text-lg font-bold text-gray-900'>
              Loans
            </h1>
            <p className='text-[10px] text-gray-600'>
              Manage and track all active and historical loans
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={fetchLoans}
              disabled={loading}
              className='flex items-center gap-1.5 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <svg 
                className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} 
                fill='none' 
                viewBox='0 0 24 24' 
                stroke='currentColor'
              >
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className='rounded-md bg-white px-3 py-1.5 shadow-sm'>
              <div className='flex items-center gap-1.5'>
                <span className='text-sm'>💰</span>
                <span className='text-lg font-bold text-gray-900'>
                  {loans.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid gap-2 md:grid-cols-5'>
          <div className='cursor-pointer rounded-md bg-blue-50 p-2 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('active')}>
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-blue-800'>Active</h3>
              <span className='text-xs'>📊</span>
            </div>
            <p className='text-lg font-bold text-blue-900'>
              {statusCounts.active}
            </p>
          </div>

          <div className='cursor-pointer rounded-md bg-green-50 p-2 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('paid')}>
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-green-800'>Paid</h3>
              <span className='text-xs'>✅</span>
            </div>
            <p className='text-lg font-bold text-green-900'>
              {statusCounts.paid}
            </p>
          </div>

          <div className='cursor-pointer rounded-md bg-red-50 p-2 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('defaulted')}>
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-red-800'>Defaulted</h3>
              <span className='text-xs'>⚠️</span>
            </div>
            <p className='text-lg font-bold text-red-900'>
              {statusCounts.defaulted}
            </p>
          </div>

          <div className='cursor-pointer rounded-md bg-yellow-50 p-2 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('pending')}>
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-yellow-800'>Pending</h3>
              <span className='text-xs'>⏳</span>
            </div>
            <p className='text-lg font-bold text-yellow-900'>
              {statusCounts.pending}
            </p>
          </div>

          <div className='cursor-pointer rounded-md bg-gray-50 p-2 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('cancelled')}>
            <div className='mb-0.5 flex items-center justify-between'>
              <h3 className='text-[10px] font-medium text-gray-800'>Cancelled</h3>
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
                  onValueChange={(value) => setStatusFilter(value as LoanStatusUI | 'all')}
                  options={[
                    { value: 'all', label: 'All Loans' },
                    { value: 'active', label: 'Active' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'defaulted', label: 'Defaulted' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                  placeholder='Select status'
                  className='!py-1.5 !px-2 !text-xs'
                />
              </div>
            </div>
            
            <div className='flex items-center gap-1.5'>
              <input
                type='text'
                placeholder='Search by name, email, phone, or loan number...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs md:w-56 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className='text-gray-400 hover:text-gray-600 text-xs'
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
                {statusFilter === 'all' ? 'All Loans' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Loans`}
              </h2>
              <span className='text-[10px] text-gray-500'>
                {filteredLoans.length} {filteredLoans.length === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                <p className='mt-2 text-xs text-gray-600'>Loading loans...</p>
              </div>
            ) : error ? (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>⚠️</span>
                <p className='text-xs text-red-600'>{error}</p>
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>💰</span>
                <p className='text-xs text-gray-600'>No loans found</p>
                <p className='mt-1 text-[10px] text-gray-400'>
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Loans will appear here once they are created'}
                </p>
              </div>
            ) : (
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
                  {filteredLoans.map(loan => (
                    <tr
                      key={loan.id}
                      className='transition-colors hover:bg-gray-50 cursor-pointer'
                      onClick={() => router.push(`/admin/loan/${loan.id}`)}
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
                            {loan.borrower_name && loan.borrower_name !== 'N/A' ? loan.borrower_name[0] : '?'}
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
                      <td className='whitespace-nowrap px-2 py-1.5 text-xs' onClick={(e) => e.stopPropagation()}>
                        <button 
                          className='mr-1.5 text-blue-600 hover:text-blue-800 text-[10px]'
                          onClick={() => router.push(`/admin/loan/${loan.id}`)}
                        >
                          View
                        </button>
                        <button 
                          className='text-green-600 hover:text-green-800 text-[10px]'
                          onClick={() => router.push(`/admin/loan/${loan.id}`)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

