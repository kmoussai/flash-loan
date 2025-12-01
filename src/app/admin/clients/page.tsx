'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'
import type { User } from '@/src/lib/supabase/types'
import {
  IconCheckCircle,
  IconClose,
  IconDatabase,
  IconEye,
  IconKey,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconSpinner,
  IconTempPassword,
  IconXCircle
} from '@/src/app/components/icons'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [search, setSearch] = useState('')
  const [kycFilter, setKycFilter] = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nationalId: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showCrmModal, setShowCrmModal] = useState(false)
  const [selectedCrmData, setSelectedCrmData] = useState<Record<string, any> | null>(null)
  const [sendingTempPassword, setSendingTempPassword] = useState<string | null>(null)
  const [tempPasswordMessage, setTempPasswordMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1 on search
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [kycFilter])

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim())
      }
      
      if (kycFilter !== 'all') {
        params.append('kycStatus', kycFilter)
      }
      
      const response = await fetch(`/api/clients?${params.toString()}`, {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch clients')
      }
      
      const data = await response.json()
      setClients(data.users || [])
      if (data.pagination) {
        setPagination(data.pagination)
      }
      setError(null)
    } catch (err: any) {
      console.error('Error fetching clients:', err)
      setError(err.message || 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, kycFilter])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        // Display detailed error information
        const errorDetails = [
          data.error || 'Failed to create client',
          data.errorCode ? `Code: ${data.errorCode}` : '',
          data.errorDetails ? `Details: ${data.errorDetails}` : '',
          data.message ? `Message: ${data.message}` : ''
        ].filter(Boolean).join(' | ')
        
        console.error('Full error response:', data)
        throw new Error(errorDetails)
      }
      
      // Log any warnings even on success
      if (data.warning) {
        console.warn('Warning:', data.warning, data.fetchError)
      }

      // Reset form and close modal
      setFormData({
        email: '',
        password: '',
        nationalId: ''
      })
      setShowAddForm(false)
      
      // Refresh clients list
      await fetchClients()
    } catch (err: any) {
      console.error('Error creating client:', err)
      setFormError(err.message || 'Failed to create client')
    } finally {
      setFormLoading(false)
    }
  }

  const getKycBadgeColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleSendTempPassword = async (clientId: string, clientEmail: string) => {
    if (!clientEmail) {
      setTempPasswordMessage({
        type: 'error',
        message: 'Client email is required'
      })
      setTimeout(() => setTempPasswordMessage(null), 5000)
      return
    }

    setSendingTempPassword(clientId)
    setTempPasswordMessage(null)

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/send-temp-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send temporary password')
      }

      setTempPasswordMessage({
        type: 'success',
        message: `Temporary password sent successfully to ${clientEmail}`
      })
      setTimeout(() => setTempPasswordMessage(null), 5000)
    } catch (err: any) {
      console.error('Error sending temp password:', err)
      setTempPasswordMessage({
        type: 'error',
        message: err.message || 'Failed to send temporary password'
      })
      setTimeout(() => setTempPasswordMessage(null), 5000)
    } finally {
      setSendingTempPassword(null)
    }
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Clients
            </h1>
            <p className='text-xs text-gray-600'>
              Manage loan applicants and their applications
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={fetchClients}
              disabled={loading}
              className='flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
            >
              <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className='rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md'
            >
              + Add Client
            </button>
            <div className='rounded-lg bg-white px-4 py-2 shadow-sm'>
              <div className='flex items-center gap-2'>
                <span className='text-xl'>👥</span>
                <span className='text-2xl font-bold text-gray-900'>
                  {pagination.total}
                </span>
              </div>
            </div>
          </div>
        </div>
           {/* Stats Cards - Note: These show counts from current filtered view */}
           <div className='grid gap-3 md:grid-cols-3'>
          <div className='rounded-lg bg-green-50 p-3 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-green-800'>Verified</h3>
              <span className='text-lg'>✓</span>
            </div>
            <p className='text-2xl font-bold text-green-900'>
              {clients.filter(c => c.kyc_status === 'verified').length}
            </p>
            {kycFilter !== 'all' && kycFilter !== 'verified' && (
              <p className='mt-1 text-xs text-gray-500'>Filtered view</p>
            )}
          </div>

          <div className='rounded-lg bg-yellow-50 p-3 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-yellow-800'>
                Pending KYC
              </h3>
              <span className='text-lg'>⏳</span>
            </div>
            <p className='text-2xl font-bold text-yellow-900'>
              {clients.filter(c => c.kyc_status === 'pending').length}
            </p>
            {kycFilter !== 'all' && kycFilter !== 'pending' && (
              <p className='mt-1 text-xs text-gray-500'>Filtered view</p>
            )}
          </div>

          <div className='rounded-lg bg-red-50 p-3 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-red-800'>Rejected</h3>
              <span className='text-lg'>✗</span>
            </div>
            <p className='text-2xl font-bold text-red-900'>
              {clients.filter(c => c.kyc_status === 'rejected').length}
            </p>
            {kycFilter !== 'all' && kycFilter !== 'rejected' && (
              <p className='mt-1 text-xs text-gray-500'>Filtered view</p>
            )}
          </div>
        </div>

        {/* Temp Password Message */}
        {tempPasswordMessage && (
          <div className={`rounded-lg p-4 shadow-sm ${
            tempPasswordMessage.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {tempPasswordMessage.type === 'success' ? (
                  <IconCheckCircle className='h-5 w-5' />
                ) : (
                  <IconXCircle className='h-5 w-5' />
                )}
                <span className='text-sm font-medium'>{tempPasswordMessage.message}</span>
              </div>
              <button
                onClick={() => setTempPasswordMessage(null)}
                className='text-gray-400 hover:text-gray-600'
              >
                <IconClose className='h-5 w-5' />
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div className='flex flex-1 items-center gap-3'>
              {/* Search Input */}
              <div className='relative flex-1 max-w-md'>
                <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
                  <IconSearch className='h-5 w-5 text-gray-400' />
                </div>
                <input
                  type='text'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search by name or email...'
                  className='block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                />
              </div>

              {/* KYC Status Filter */}
              {/* <div className='w-48'>
                <Select
                  value={kycFilter}
                  onValueChange={(value) => setKycFilter(value)}
                  options={[
                    { value: 'all', label: 'All KYC Status' },
                    { value: 'verified', label: 'Verified' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'rejected', label: 'Rejected' }
                  ]}
                  placeholder='Select KYC status'
                  className='!py-2 !px-3 !text-sm'
                />
              </div> */}
            </div>

            {/* Results Info */}
            <div className='text-sm text-gray-600'>
              Showing {clients.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
          </div>
        </div>

        {/* Add Client Modal */}
        {showAddForm && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
            <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-2xl font-bold text-gray-900'>
                  Add New Client
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setFormError(null)
                  }}
                  className='text-gray-400 hover:text-gray-600'
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className='mb-4 rounded-lg bg-red-50 p-3 text-red-600'>
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddClient} className='space-y-4'>
                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    Email *
                  </label>
                  <input
                    type='email'
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    placeholder='client@example.com'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    Password *
                  </label>
                  <input
                    type='password'
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    placeholder='Min. 6 characters'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    National ID
                  </label>
                  <input
                    type='text'
                    value={formData.nationalId}
                    onChange={(e) =>
                      setFormData({ ...formData, nationalId: e.target.value })
                    }
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    placeholder='Optional'
                  />
                </div>

                <div className='flex space-x-3 pt-4'>
                  <button
                    type='button'
                    onClick={() => {
                      setShowAddForm(false)
                      setFormError(null)
                    }}
                    className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50'
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    disabled={formLoading}
                    className='flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400'
                  >
                    {formLoading ? 'Creating...' : 'Create Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Clients Table */}
        <div className='rounded-lg bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-4 py-2'>
            <div className='flex items-center justify-between'>
              <h2 className='text-sm font-semibold text-gray-900'>All Clients</h2>
              <span className='text-xs text-gray-500'>
                {pagination.total} {pagination.total === 1 ? 'client' : 'clients'}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto'>
            {loading ? (
              <div className='p-12 text-center'>
                <div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                <p className='mt-4 text-gray-600'>Loading clients...</p>
              </div>
            ) : error ? (
              <div className='p-12 text-center'>
                <span className='mb-4 block text-4xl'>⚠️</span>
                <p className='text-red-600'>{error}</p>
              </div>
            ) : clients.length === 0 ? (
              <div className='p-12 text-center'>
                <span className='mb-4 block text-4xl'>👥</span>
                <p className='text-gray-600'>No clients found</p>
                <p className='mt-2 text-sm text-gray-400'>
                  Clients will appear here once they are added to the system
                </p>
              </div>
            ) : (
              <>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Client Name
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Email
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        KYC Status
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Joined
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 bg-white'>
                    {clients.map(client => (
                      <tr
                        key={client.id}
                        className='transition-colors hover:bg-gray-50'
                      >
                        <td className='whitespace-nowrap px-4 py-2'>
                          <div className='flex items-center'>
                            <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white'>
                              {client.first_name?.[0] || client.last_name?.[0] || '👤'}
                            </div>
                            <div className='ml-3'>
                              <div className='font-semibold text-gray-900'>
                                {client.first_name && client.last_name 
                                  ? `${client.first_name} ${client.last_name}`
                                  : client.first_name || client.last_name || 'Unknown'}
                              </div>
                              <div className='text-xs font-mono text-gray-500'>
                                ID: {client.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>
                          {client.email || (
                            <span className='text-gray-400'>No email</span>
                          )}
                        </td>
                        <td className='whitespace-nowrap px-4 py-2'>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getKycBadgeColor(client.kyc_status)}`}
                          >
                            {client.kyc_status.toUpperCase()}
                          </span>
                        </td>
                        <td className='whitespace-nowrap px-4 py-2 text-xs text-gray-500'>
                          {formatDate(client.created_at)}
                        </td>
                        <td className='whitespace-nowrap px-4 py-2 text-sm'>
                          <div className='flex items-center gap-2'>
                            {/* View client */}
                            <button
                              type='button'
                              className='inline-flex items-center justify-center rounded-full p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800'
                              onClick={() => router.push(`/admin/clients/${client.id}`)}
                              title='View client details'
                              aria-label='View client details'
                            >
                              <IconEye className='h-4 w-4' />
                            </button>

                            {/* CRM data */}
                            {client.crm_original_data && (
                              <button
                                type='button'
                                className='inline-flex items-center justify-center rounded-full p-1.5 text-purple-600 hover:bg-purple-50 hover:text-purple-800'
                                onClick={() => {
                                  setSelectedCrmData(client.crm_original_data)
                                  setShowCrmModal(true)
                                }}
                                title='View CRM original data'
                                aria-label='View CRM original data'
                              >
                                <IconDatabase className='h-4 w-4' />
                              </button>
                            )}

                            {/* Send temp password */}
                            <button
                              type='button'
                              className='inline-flex items-center justify-center rounded-full p-1.5 text-orange-600 hover:bg-orange-50 hover:text-orange-800 disabled:opacity-50 disabled:cursor-not-allowed'
                              onClick={() =>
                                handleSendTempPassword(client.id, client.email || '')
                              }
                              disabled={sendingTempPassword === client.id || !client.email}
                              title={
                                client.email
                                  ? 'Send temporary password'
                                  : 'Client email required to send temporary password'
                              }
                              aria-label='Send temporary password'
                            >
                              {sendingTempPassword === client.id ? (
                                <IconSpinner className='h-4 w-4 animate-spin' />
                              ) : (
                                <IconTempPassword className='h-4 w-4' />
                              )}
                            </button>

                            {/* Verify KYC (placeholder action) */}
                            {/* <button
                              type='button'
                              className='inline-flex items-center justify-center rounded-full p-1.5 text-green-600 hover:bg-green-50 hover:text-green-800'
                              title='Verify KYC'
                              aria-label='Verify KYC'
                            >
                              <IconShieldCheck className='h-4 w-4' />
                            </button> */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className='border-t border-gray-200 px-4 py-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                          disabled={pagination.page === 1 || loading}
                          className='rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          Previous
                        </button>
                        <span className='text-sm text-gray-700'>
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                          disabled={pagination.page === pagination.totalPages || loading}
                          className='rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          Next
                        </button>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-gray-700'>Show:</span>
                        <Select
                          value={pagination.limit.toString()}
                          onValueChange={(value) => {
                            setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }))
                          }}
                          options={[
                            { value: '25', label: '25' },
                            { value: '50', label: '50' },
                            { value: '100', label: '100' }
                          ]}
                        />
                        <span className='text-sm text-gray-700'>per page</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* CRM Data Modal */}
        {showCrmModal && selectedCrmData && (
          <div 
            className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
            onClick={() => {
              setShowCrmModal(false)
              setSelectedCrmData(null)
            }}
          >
            <div 
              className='mx-4 w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col'
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className='border-b border-gray-200 px-6 py-4 flex-shrink-0'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h2 className='text-xl font-bold text-gray-900'>
                      CRM Original Data
                    </h2>
                    <p className='text-sm text-gray-500 mt-1'>
                      Complete JSON data from CRM migration
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCrmModal(false)
                      setSelectedCrmData(null)
                    }}
                    className='text-gray-400 hover:text-gray-600 transition-colors'
                    title='Close'
                    aria-label='Close'
                  >
                    <IconClose className='h-6 w-6' />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className='flex-1 overflow-auto px-6 py-4'>
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <pre className='text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap break-words font-mono'>
                    {JSON.stringify(selectedCrmData, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className='border-t border-gray-200 px-6 py-4 flex-shrink-0 flex items-center justify-end gap-3'>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedCrmData, null, 2))
                  }}
                  className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => {
                    setShowCrmModal(false)
                    setSelectedCrmData(null)
                  }}
                  className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors'
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

