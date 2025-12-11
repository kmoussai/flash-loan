'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'

interface PaymentTransaction {
  id: string
  provider: 'zumrails' | 'accept_pay' | string
  transaction_type: 'disbursement' | 'collection'
  loan_id: string | null
  loan_payment_id: string | null
  amount: number
  status: 'initiated' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed'
  created_at: string
  updated_at: string | null
  provider_data: any
  // Extracted fields
  provider_transaction_id?: string | null
  provider_client_transaction_id?: string | null
  provider_status?: string | null
  borrower_name?: string | null
  borrower_email?: string | null
  borrower_phone?: string | null
  loan_number?: number | null
  loan_status?: string | null
  payment_number?: number | null
  payment_date?: string | null
  payment_status?: string | null
}

interface StatusCounts {
  initiated: number
  pending: number
  processing: number
  completed: number
  failed: number
  cancelled: number
  reversed: number
}

interface ProviderCounts {
  [key: string]: number
}

interface TypeCounts {
  disbursement: number
  collection: number
}

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(50)
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    initiated: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    reversed: 0
  })
  const [providerCounts, setProviderCounts] = useState<ProviderCounts>({})
  const [typeCounts, setTypeCounts] = useState<TypeCounts>({
    disbursement: 0,
    collection: 0
  })
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    message: string
    result?: any
  } | null>(null)

  const fetchTransactions = async (page: number = currentPage) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (providerFilter !== 'all') {
        params.append('provider', providerFilter)
      }
      if (typeFilter !== 'all') {
        params.append('transaction_type', typeFilter)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/transactions?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch transactions')
      }
      
      const data = await response.json()
      setTransactions(data.transactions || [])
      setFilteredTransactions(data.transactions || [])
      setStatusCounts(data.counts?.status || statusCounts)
      setProviderCounts(data.counts?.provider || {})
      setTypeCounts(data.counts?.type || typeCounts)
      setCurrentPage(data.pagination?.page || page)
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching transactions:', err)
      setError(err.message || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions(1)
  }, [statusFilter, providerFilter, typeFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions(1)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'initiated':
        return 'bg-yellow-100 text-yellow-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-orange-100 text-orange-800'
      case 'reversed':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    return type === 'disbursement'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-indigo-100 text-indigo-800'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
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

  const handleViewDetails = (transaction: PaymentTransaction) => {
    // Navigate to transaction details or open modal
    if (transaction.loan_id) {
      router.push(`/admin/loan/${transaction.loan_id}`)
    }
  }

  const handleSyncLoanPayments = async () => {
    try {
      setSyncing(true)
      setSyncResult(null)

      const response = await fetch('/api/admin/transactions/sync-loan-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 50 })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync loan payments')
      }

      setSyncResult({
        success: data.success,
        message: data.message,
        result: data.result
      })

      // Refresh transactions after sync
      setTimeout(() => {
        fetchTransactions(currentPage)
      }, 1000)
    } catch (err: any) {
      console.error('Error syncing loan payments:', err)
      setSyncResult({
        success: false,
        message: err.message || 'Failed to sync loan payments'
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-4'>
        {/* Sync Result Alert */}
        {syncResult && (
          <div
            className={`rounded-lg border p-4 ${
              syncResult.success
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className='flex items-start justify-between'>
              <div className='flex items-start gap-3'>
                <span className='text-xl'>
                  {syncResult.success ? '✅' : '❌'}
                </span>
                <div>
                  <h3
                    className={`font-medium ${
                      syncResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {syncResult.success ? 'Sync Completed' : 'Sync Failed'}
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      syncResult.success ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {syncResult.message}
                  </p>
                  {syncResult.result && (
                    <div className='mt-2 text-xs text-gray-600'>
                      <p>
                        Processed: {syncResult.result.processed} | Created:{' '}
                        {syncResult.result.created} | Failed:{' '}
                        {syncResult.result.failed}
                      </p>
                      {syncResult.result.errors &&
                        syncResult.result.errors.length > 0 && (
                          <details className='mt-2'>
                            <summary className='cursor-pointer text-red-600 hover:text-red-800'>
                              View Errors ({syncResult.result.errors.length})
                            </summary>
                            <ul className='ml-4 mt-1 list-disc space-y-1'>
                              {syncResult.result.errors
                                .slice(0, 5)
                                .map((err: any, idx: number) => (
                                  <li key={idx} className='text-red-600'>
                                    Payment {err.loanPaymentId?.slice(0, 8)}:{' '}
                                    {err.error}
                                  </li>
                                ))}
                            </ul>
                          </details>
                        )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSyncResult(null)}
                className='text-gray-400 hover:text-gray-600'
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Payment Transactions
            </h1>
            <p className='text-xs text-gray-600'>
              View and manage all payment provider transactions
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={handleSyncLoanPayments}
              disabled={syncing || loading}
              className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-green-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
            >
              <svg 
                className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} 
                fill='none' 
                viewBox='0 0 24 24' 
                stroke='currentColor'
              >
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
              </svg>
              {syncing ? 'Syncing...' : 'Sync Loan Payments'}
            </button>
            <button
              onClick={() => fetchTransactions(currentPage)}
              disabled={loading}
              className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
            >
              <svg 
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} 
                fill='none' 
                viewBox='0 0 24 24' 
                stroke='currentColor'
              >
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className='rounded-lg bg-white px-4 py-2 shadow-sm'>
              <div className='flex items-center gap-2'>
                <span className='text-xl'>💳</span>
                <span className='text-2xl font-bold text-gray-900'>
                  {total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid gap-3 md:grid-cols-7'>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className='cursor-pointer rounded-lg bg-gray-50 p-3 shadow-sm transition-all hover:shadow-md'
              onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}
            >
              <div className='mb-1 flex items-center justify-between'>
                <h3 className='text-xs font-medium text-gray-800 capitalize'>{status}</h3>
                <span className='text-lg'>
                  {status === 'completed' ? '✓' : status === 'failed' ? '❌' : status === 'processing' ? '🔄' : '⏳'}
                </span>
              </div>
              <p className='text-2xl font-bold text-gray-900'>{count}</p>
            </div>
          ))}
        </div>

        {/* Provider & Type Stats */}
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='rounded-lg bg-white p-3 shadow-sm'>
            <h3 className='mb-2 text-xs font-medium text-gray-700'>By Provider</h3>
            <div className='flex flex-wrap gap-2'>
              {Object.entries(providerCounts).map(([provider, count]) => (
                <span
                  key={provider}
                  className='inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800'
                >
                  {provider}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className='rounded-lg bg-white p-3 shadow-sm'>
            <h3 className='mb-2 text-xs font-medium text-gray-700'>By Type</h3>
            <div className='flex gap-2'>
              <span className='inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800'>
                Disbursement: {typeCounts.disbursement}
              </span>
              <span className='inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800'>
                Collection: {typeCounts.collection}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className='rounded-lg bg-white p-3 shadow-sm'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex flex-wrap items-center gap-2'>
              <label className='text-xs font-medium text-gray-700'>Status:</label>
              <div className='w-40'>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'initiated', label: 'Initiated' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'failed', label: 'Failed' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'reversed', label: 'Reversed' }
                  ]}
                  placeholder='Select status'
                />
              </div>

              <label className='text-xs font-medium text-gray-700'>Provider:</label>
              <div className='w-40'>
                <Select
                  value={providerFilter}
                  onValueChange={setProviderFilter}
                  options={[
                    { value: 'all', label: 'All Providers' },
                    { value: 'zumrails', label: 'Zum Rails' },
                    { value: 'accept_pay', label: 'Accept Pay' }
                  ]}
                  placeholder='Select provider'
                />
              </div>

              <label className='text-xs font-medium text-gray-700'>Type:</label>
              <div className='w-40'>
                <Select
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'disbursement', label: 'Disbursement' },
                    { value: 'collection', label: 'Collection' }
                  ]}
                  placeholder='Select type'
                />
              </div>
            </div>
            
            <div className='flex items-center gap-2'>
              <input
                type='text'
                placeholder='Search by transaction ID, loan number, borrower...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm md:w-64 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className='text-gray-400 hover:text-gray-600'
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className='rounded-lg bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-4 py-3'>
            <div className='flex items-center justify-between'>
              <h2 className='text-sm font-semibold text-gray-900'>
                {statusFilter === 'all' && providerFilter === 'all' && typeFilter === 'all'
                  ? 'All Transactions'
                  : 'Filtered Transactions'}
              </h2>
              <span className='text-xs text-gray-500'>
                {filteredTransactions.length} of {total} {total === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                <p className='mt-2 text-sm text-gray-600'>Loading transactions...</p>
              </div>
            ) : error ? (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>⚠️</span>
                <p className='text-sm text-red-600'>{error}</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>💳</span>
                <p className='text-sm text-gray-600'>No transactions found</p>
                <p className='mt-1 text-xs text-gray-400'>
                  {searchTerm || statusFilter !== 'all' || providerFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters' 
                    : 'Transactions will appear here once payment operations are performed'}
                </p>
              </div>
            ) : (
              <>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Transaction ID
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Provider
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Type
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Borrower
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Loan #
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Amount
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Status
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Created
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 bg-white'>
                    {filteredTransactions.map(transaction => (
                      <tr
                        key={transaction.id}
                        className='transition-colors hover:bg-gray-50'
                      >
                        <td className='whitespace-nowrap px-4 py-3'>
                          <div className='text-sm font-mono text-gray-900'>
                            {transaction.provider_transaction_id || transaction.id.slice(0, 8)}
                          </div>
                          {transaction.provider_client_transaction_id && (
                            <div className='text-xs text-gray-500'>
                              Client: {transaction.provider_client_transaction_id.slice(0, 8)}
                            </div>
                          )}
                        </td>
                        <td className='whitespace-nowrap px-4 py-3'>
                          <span className='inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 capitalize'>
                            {transaction.provider}
                          </span>
                        </td>
                        <td className='whitespace-nowrap px-4 py-3'>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTypeBadgeColor(transaction.transaction_type)}`}
                          >
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center'>
                            <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-600'>
                              {transaction.borrower_name && transaction.borrower_name !== 'N/A' ? transaction.borrower_name[0] : '?'}
                            </div>
                            <div className='ml-3'>
                              <div className='text-sm font-medium text-gray-900'>
                                {transaction.borrower_name || 'N/A'}
                              </div>
                              {transaction.borrower_email && (
                                <div className='text-xs text-gray-500'>
                                  {transaction.borrower_email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-4 py-3'>
                          {transaction.loan_number ? (
                            <div className='text-sm font-semibold text-gray-900'>
                              LN-{String(transaction.loan_number).padStart(6, '0')}
                            </div>
                          ) : (
                            <span className='text-sm text-gray-400'>N/A</span>
                          )}
                        </td>
                        <td className='whitespace-nowrap px-4 py-3'>
                          <div className='text-sm font-semibold text-gray-900'>
                            {formatCurrency(transaction.amount)}
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-4 py-3'>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeColor(transaction.status)}`}
                          >
                            {transaction.status}
                          </span>
                          {transaction.provider_status && transaction.provider_status !== transaction.status && (
                            <div className='mt-1 text-xs text-gray-500'>
                              Provider: {transaction.provider_status}
                            </div>
                          )}
                        </td>
                        <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-500'>
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className='whitespace-nowrap px-4 py-3 text-sm' onClick={(e) => e.stopPropagation()}>
                          {transaction.loan_id && (
                            <button
                              onClick={() => handleViewDetails(transaction)}
                              className='text-blue-600 hover:text-blue-800 text-xs'
                            >
                              View Loan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='border-t border-gray-200 px-4 py-3'>
                    <div className='flex items-center justify-between'>
                      <div className='text-xs text-gray-500'>
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => fetchTransactions(currentPage - 1)}
                          disabled={currentPage === 1 || loading}
                          className='rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => fetchTransactions(currentPage + 1)}
                          disabled={currentPage === totalPages || loading}
                          className='rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}
