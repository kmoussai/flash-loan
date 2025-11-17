'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'

interface Collection {
  id: string
  loan_id: string
  loan_number: number | null
  scheduled_date: string
  amount: number
  payment_number: number
  status: string
  accept_pay_transaction_id: number | null
  loan_payment_id: string | null
  created_at: string
  updated_at: string
  borrower_name: string
  borrower_email: string
  borrower_phone: string
  accept_pay_customer_id: number | null
  accept_pay_customer_status: string | null
  accept_pay_status: string | null
  process_date: string | null
  error_code: string | null
  retry_count: number
  collection_initiated_at: string | null
  collection_completed_at: string | null
}

interface StatusCounts {
  pending: number
  scheduled: number
  authorized: number
  failed: number
}

export default function CollectionsPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    scheduled: 0,
    authorized: 0,
    failed: 0
  })

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/collections')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch collections')
      }
      
      const data = await response.json()
      setCollections(data.collections || [])
      setFilteredCollections(data.collections || [])
      setStatusCounts(data.statusCounts || {
        pending: 0,
        scheduled: 0,
        authorized: 0,
        failed: 0
      })
      setError(null)
    } catch (err: any) {
      console.error('Error fetching collections:', err)
      setError(err.message || 'Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  useEffect(() => {
    let filtered = collections

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(collection => {
        if (statusFilter === 'pending') {
          return collection.status === 'pending'
        } else if (statusFilter === 'scheduled') {
          return collection.status === 'scheduled' && collection.accept_pay_status !== 'AA'
        } else if (statusFilter === 'authorized') {
          return collection.accept_pay_status === 'AA'
        } else if (statusFilter === 'failed') {
          return collection.error_code !== null
        }
        return true
      })
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(collection => {
        const name = collection.borrower_name.toLowerCase()
        const email = collection.borrower_email.toLowerCase()
        const phone = collection.borrower_phone.toLowerCase()
        const loanNumber = collection.loan_number?.toString() || ''
        
        return name.includes(term) || 
               email.includes(term) || 
               phone.includes(term) ||
               loanNumber.includes(term)
      })
    }

    setFilteredCollections(filtered)
  }, [statusFilter, searchTerm, collections])

  const getStatusBadgeColor = (collection: Collection) => {
    if (collection.error_code) {
      return 'bg-red-100 text-red-800'
    }
    if (collection.collection_completed_at) {
      return 'bg-green-100 text-green-800'
    }
    if (collection.accept_pay_status === 'AA') {
      return 'bg-blue-100 text-blue-800'
    }
    if (collection.status === 'scheduled') {
      return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (collection: Collection) => {
    if (collection.error_code) {
      return 'Failed'
    }
    if (collection.collection_completed_at) {
      return 'Collected'
    }
    if (collection.accept_pay_status === 'AA') {
      return 'Authorized'
    }
    if (collection.status === 'scheduled') {
      return 'Scheduled'
    }
    return 'Pending'
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

  const handleInitiateCollection = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/accept-pay/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate collection')
      }

      await fetchCollections()
    } catch (err: any) {
      alert(err.message || 'Failed to initiate collection')
    }
  }

  const handleAuthorizeCollection = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/accept-pay/collect/${scheduleId}/authorize`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to authorize collection')
      }

      await fetchCollections()
    } catch (err: any) {
      alert(err.message || 'Failed to authorize collection')
    }
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Collection Requests
            </h1>
            <p className='text-xs text-gray-600'>
              Manage payment collections via Accept Pay
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={fetchCollections}
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
                  {collections.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid gap-3 md:grid-cols-4'>
          <div className='cursor-pointer rounded-lg bg-gray-50 p-3 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('pending')}>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-gray-800'>Pending</h3>
              <span className='text-lg'>⏳</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>
              {statusCounts.pending}
            </p>
          </div>

          <div className='cursor-pointer rounded-lg bg-yellow-50 p-3 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('scheduled')}>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-yellow-800'>Scheduled</h3>
              <span className='text-lg'>📅</span>
            </div>
            <p className='text-2xl font-bold text-yellow-900'>
              {statusCounts.scheduled}
            </p>
          </div>

          <div className='cursor-pointer rounded-lg bg-blue-50 p-3 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('authorized')}>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-blue-800'>Authorized</h3>
              <span className='text-lg'>✅</span>
            </div>
            <p className='text-2xl font-bold text-blue-900'>
              {statusCounts.authorized}
            </p>
          </div>

          <div className='cursor-pointer rounded-lg bg-red-50 p-3 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('failed')}>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-red-800'>Failed</h3>
              <span className='text-lg'>❌</span>
            </div>
            <p className='text-2xl font-bold text-red-900'>
              {statusCounts.failed}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className='rounded-lg bg-white p-3 shadow-sm'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-2'>
              <label className='text-xs font-medium text-gray-700'>
                Status:
              </label>
              <div className='w-48'>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All Collections' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'authorized', label: 'Authorized' },
                    { value: 'failed', label: 'Failed' }
                  ]}
                  placeholder='Select status'
                />
              </div>
            </div>
            
            <div className='flex items-center gap-2'>
              <input
                type='text'
                placeholder='Search by name, email, phone, or loan number...'
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

        {/* Collections Table */}
        <div className='rounded-lg bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-4 py-3'>
            <div className='flex items-center justify-between'>
              <h2 className='text-sm font-semibold text-gray-900'>
                {statusFilter === 'all' ? 'All Collection Requests' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Collections`}
              </h2>
              <span className='text-xs text-gray-500'>
                {filteredCollections.length} {filteredCollections.length === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                <p className='mt-2 text-sm text-gray-600'>Loading collections...</p>
              </div>
            ) : error ? (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>⚠️</span>
                <p className='text-sm text-red-600'>{error}</p>
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>💳</span>
                <p className='text-sm text-gray-600'>No collection requests found</p>
                <p className='mt-1 text-xs text-gray-400'>
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Collection requests will appear here once loans are active'}
                </p>
              </div>
            ) : (
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Loan #
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Borrower
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Amount
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Payment #
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Scheduled Date
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Status
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Transaction ID
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Retries
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 bg-white'>
                  {filteredCollections.map(collection => (
                    <tr
                      key={collection.id}
                      className='transition-colors hover:bg-gray-50'
                    >
                      <td className='whitespace-nowrap px-4 py-3'>
                        <div className='text-sm font-semibold text-gray-900'>
                          {collection.loan_number ? `LN-${String(collection.loan_number).padStart(6, '0')}` : 'N/A'}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center'>
                          <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-600'>
                            {collection.borrower_name && collection.borrower_name !== 'N/A' ? collection.borrower_name[0] : '?'}
                          </div>
                          <div className='ml-3'>
                            <div className='text-sm font-medium text-gray-900'>
                              {collection.borrower_name}
                            </div>
                            <div className='text-xs text-gray-500'>
                              {collection.borrower_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-4 py-3'>
                        <div className='text-sm font-semibold text-gray-900'>
                          {formatCurrency(collection.amount)}
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-500'>
                        {collection.payment_number}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-500'>
                        {formatDate(collection.scheduled_date)}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3'>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeColor(collection)}`}
                        >
                          {getStatusLabel(collection)}
                        </span>
                        {collection.error_code && (
                          <div className='mt-1 text-xs text-red-600'>
                            Error: {collection.error_code}
                          </div>
                        )}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-500'>
                        {collection.accept_pay_transaction_id || 'N/A'}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-500'>
                        {collection.retry_count > 0 ? collection.retry_count : '-'}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm' onClick={(e) => e.stopPropagation()}>
                        {collection.status === 'pending' && !collection.accept_pay_transaction_id && (
                          <button
                            onClick={() => handleInitiateCollection(collection.id)}
                            className='mr-2 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700'
                          >
                            Initiate
                          </button>
                        )}
                        {collection.accept_pay_transaction_id && collection.accept_pay_status !== 'AA' && (
                          <button
                            onClick={() => handleAuthorizeCollection(collection.id)}
                            className='rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700'
                          >
                            Authorize
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/loan/${collection.loan_id}`)}
                          className='ml-2 text-blue-600 hover:text-blue-800 text-xs'
                        >
                          View Loan
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


