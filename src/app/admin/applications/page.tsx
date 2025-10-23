'use client'

import { useEffect, useState } from 'react'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import type { LoanApplication, ApplicationStatus } from '@/src/lib/supabase/types'

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
  }[] | null
  references: {
    id: string
    first_name: string
    last_name: string
    phone: string
    relationship: string
  }[] | null
}

interface StatusCounts {
  pending: number
  processing: number
  approved: number
  rejected: number
  cancelled: number
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [filteredApplications, setFilteredApplications] = useState<ApplicationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    processing: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  })

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/applications')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch applications')
      }
      
      const data = await response.json()
      setApplications(data.applications || [])
      setFilteredApplications(data.applications || [])
      setStatusCounts(data.statusCounts || {
        pending: 0,
        processing: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0
      })
      setError(null)
    } catch (err: any) {
      console.error('Error fetching applications:', err)
      setError(err.message || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    let filtered = applications

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.application_status === statusFilter)
    }

    // Filter by search term (name, email, phone)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(app => {
        const firstName = app.users?.first_name?.toLowerCase() || ''
        const lastName = app.users?.last_name?.toLowerCase() || ''
        const email = app.users?.email?.toLowerCase() || ''
        const phone = app.users?.phone?.toLowerCase() || ''
        
        return firstName.includes(term) || 
               lastName.includes(term) || 
               email.includes(term) || 
               phone.includes(term)
      })
    }

    setFilteredApplications(filtered)
  }, [statusFilter, searchTerm, applications])

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

  const getClientAddress = (app: ApplicationWithDetails) => {
    if (!app.addresses || app.addresses.length === 0) return 'N/A'
    const addr = app.addresses[0]
    return `${addr.street_number || ''} ${addr.street_name || ''}, ${addr.city}, ${addr.province}`.trim()
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-6'>
        {/* Header */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='mb-2 text-3xl font-bold text-gray-900'>
                Loan Applications
              </h1>
              <p className='text-sm text-gray-600'>
                Review and manage all loan applications
              </p>
            </div>
            <div className='flex items-center space-x-4'>
              <span className='text-3xl'>📝</span>
              <span className='text-4xl font-bold text-gray-900'>
                {applications.length}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid gap-4 md:grid-cols-5'>
          <div className='cursor-pointer rounded-lg bg-yellow-50 p-4 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('pending')}>
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-yellow-800'>Pending</h3>
              <span className='text-2xl'>⏳</span>
            </div>
            <p className='text-3xl font-bold text-yellow-900'>
              {statusCounts.pending}
            </p>
          </div>

          <div className='cursor-pointer rounded-lg bg-blue-50 p-4 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('processing')}>
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-blue-800'>Processing</h3>
              <span className='text-2xl'>🔄</span>
            </div>
            <p className='text-3xl font-bold text-blue-900'>
              {statusCounts.processing}
            </p>
          </div>

          <div className='cursor-pointer rounded-lg bg-green-50 p-4 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('approved')}>
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-green-800'>Approved</h3>
              <span className='text-2xl'>✅</span>
            </div>
            <p className='text-3xl font-bold text-green-900'>
              {statusCounts.approved}
            </p>
          </div>

          <div className='cursor-pointer rounded-lg bg-red-50 p-4 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('rejected')}>
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-red-800'>Rejected</h3>
              <span className='text-2xl'>❌</span>
            </div>
            <p className='text-3xl font-bold text-red-900'>
              {statusCounts.rejected}
            </p>
          </div>

          <div className='cursor-pointer rounded-lg bg-gray-50 p-4 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('cancelled')}>
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-gray-800'>Cancelled</h3>
              <span className='text-2xl'>🚫</span>
            </div>
            <p className='text-3xl font-bold text-gray-900'>
              {statusCounts.cancelled}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-4'>
              <label className='text-sm font-medium text-gray-700'>
                Filter by Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
                className='rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              >
                <option value='all'>All Applications</option>
                <option value='pending'>Pending</option>
                <option value='processing'>Processing</option>
                <option value='approved'>Approved</option>
                <option value='rejected'>Rejected</option>
                <option value='cancelled'>Cancelled</option>
              </select>
            </div>
            
            <div className='flex items-center gap-2'>
              <input
                type='text'
                placeholder='Search by name, email, or phone...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-4 py-2 md:w-80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
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

        {/* Applications Table */}
        <div className='rounded-lg bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-6 py-4'>
            <h2 className='text-xl font-semibold text-gray-900'>
              {statusFilter === 'all' ? 'All Applications' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Applications`}
              <span className='ml-2 text-sm font-normal text-gray-500'>
                ({filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'})
              </span>
            </h2>
          </div>

          <div className='overflow-x-auto'>
            {loading ? (
              <div className='p-12 text-center'>
                <div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                <p className='mt-4 text-gray-600'>Loading applications...</p>
              </div>
            ) : error ? (
              <div className='p-12 text-center'>
                <span className='mb-4 block text-4xl'>⚠️</span>
                <p className='text-red-600'>{error}</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className='p-12 text-center'>
                <span className='mb-4 block text-4xl'>📝</span>
                <p className='text-gray-600'>No applications found</p>
                <p className='mt-2 text-sm text-gray-400'>
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Applications will appear here once they are submitted'}
                </p>
              </div>
            ) : (
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Applicant
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Amount
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Type
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Province
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Submitted
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 bg-white'>
                  {filteredApplications.map(app => (
                    <tr
                      key={app.id}
                      className='transition-colors hover:bg-gray-50'
                    >
                      <td className='px-6 py-4'>
                        <div className='flex items-center'>
                          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600'>
                            {app.users?.first_name?.[0] || '?'}
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {getClientName(app)}
                            </div>
                            <div className='text-sm text-gray-500'>
                              {app.users?.email || 'No email'}
                            </div>
                            <div className='text-xs text-gray-400'>
                              {app.users?.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-6 py-4'>
                        <div className='text-sm font-semibold text-gray-900'>
                          {formatCurrency(app.loan_amount)}
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-6 py-4'>
                        <span className='text-xs text-gray-600'>
                          {app.loan_type === 'with-documents' ? 'With Docs' : 'No Docs'}
                        </span>
                      </td>
                      <td className='whitespace-nowrap px-6 py-4'>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeColor(app.application_status)}`}
                        >
                          {app.application_status.toUpperCase()}
                        </span>
                      </td>
                      <td className='whitespace-nowrap px-6 py-4 text-sm text-gray-900'>
                        {app.addresses && app.addresses.length > 0 
                          ? app.addresses[0].province 
                          : 'N/A'}
                      </td>
                      <td className='whitespace-nowrap px-6 py-4 text-sm text-gray-500'>
                        {formatDate(app.created_at)}
                      </td>
                      <td className='whitespace-nowrap px-6 py-4 text-sm'>
                        <button className='mr-3 text-blue-600 hover:text-blue-800'>
                          View
                        </button>
                        <button className='text-green-600 hover:text-green-800'>
                          Process
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

