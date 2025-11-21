'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'

interface Deposit {
  id: string
  loan_number: number | null
  principal_amount: number
  disbursement_status: string | null
  disbursement_transaction_id: number | null
  disbursement_process_date: string | null
  disbursement_initiated_at: string | null
  disbursement_authorized_at: string | null
  disbursement_completed_at: string | null
  disbursement_error_code: string | null
  disbursement_reference: string | null
  created_at: string
  borrower_name: string
  borrower_email: string
  borrower_phone: string
  accept_pay_customer_id: number | null
  accept_pay_customer_status: string | null
}

interface StatusCounts {
  pending: number
  initiated: number
  authorized: number
  completed: number
  failed: number
}

export default function DepositsPage() {
  const router = useRouter()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [filteredDeposits, setFilteredDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    initiated: 0,
    authorized: 0,
    completed: 0,
    failed: 0
  })
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null)
  const [depositInfo, setDepositInfo] = useState<{
    loan: { id: string; loan_number: number | null; principal_amount: number } | null
    bank_account: any | null
  } | null>(null)
  const [loadingDepositInfo, setLoadingDepositInfo] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const fetchDeposits = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/deposits')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch deposits')
      }
      
      const data = await response.json()
      setDeposits(data.deposits || [])
      setFilteredDeposits(data.deposits || [])
      setStatusCounts(data.statusCounts || {
        pending: 0,
        initiated: 0,
        authorized: 0,
        completed: 0,
        failed: 0
      })
      setError(null)
    } catch (err: any) {
      console.error('Error fetching deposits:', err)
      setError(err.message || 'Failed to load deposits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeposits()
  }, [])

  useEffect(() => {
    let filtered = deposits

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(deposit => {
        if (statusFilter === 'pending') {
          return !deposit.disbursement_status
        } else if (statusFilter === 'initiated') {
          return deposit.disbursement_status === '101' && !deposit.disbursement_authorized_at
        } else if (statusFilter === 'authorized') {
          return deposit.disbursement_authorized_at && !deposit.disbursement_completed_at
        } else if (statusFilter === 'completed') {
          return deposit.disbursement_completed_at !== null
        } else if (statusFilter === 'failed') {
          return deposit.disbursement_error_code !== null
        }
        return true
      })
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(deposit => {
        const name = deposit.borrower_name.toLowerCase()
        const email = deposit.borrower_email.toLowerCase()
        const phone = deposit.borrower_phone.toLowerCase()
        const loanNumber = deposit.loan_number?.toString() || ''
        
        return name.includes(term) || 
               email.includes(term) || 
               phone.includes(term) ||
               loanNumber.includes(term)
      })
    }

    setFilteredDeposits(filtered)
  }, [statusFilter, searchTerm, deposits])

  const getStatusBadgeColor = (deposit: Deposit) => {
    if (deposit.disbursement_error_code) {
      return 'bg-red-100 text-red-800'
    }
    if (deposit.disbursement_completed_at) {
      return 'bg-green-100 text-green-800'
    }
    if (deposit.disbursement_authorized_at) {
      return 'bg-blue-100 text-blue-800'
    }
    if (deposit.disbursement_initiated_at) {
      return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (deposit: Deposit) => {
    if (deposit.disbursement_error_code) {
      return 'Failed'
    }
    if (deposit.disbursement_completed_at) {
      return 'Completed'
    }
    if (deposit.disbursement_authorized_at) {
      return 'Authorized'
    }
    if (deposit.disbursement_initiated_at) {
      return 'Initiated'
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

  const handleOpenDepositModal = async (deposit: Deposit) => {
    setSelectedDeposit(deposit)
    setShowDepositModal(true)
    setLoadingDepositInfo(true)
    setDepositInfo(null)

    try {
      const response = await fetch(`/api/admin/deposits/${deposit.id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch deposit information')
      }

      const data = await response.json()
      setDepositInfo(data)
    } catch (err: any) {
      alert(err.message || 'Failed to load deposit information')
      setShowDepositModal(false)
    } finally {
      setLoadingDepositInfo(false)
    }
  }

  const handleCloseDepositModal = () => {
    setShowDepositModal(false)
    setSelectedDeposit(null)
    setDepositInfo(null)
  }

  const handleConfirmDeposit = async () => {
    if (!selectedDeposit) return

    try {
      setConfirming(true)
      const response = await fetch(`/api/admin/deposits/${selectedDeposit.id}/confirm`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to confirm deposit')
      }

      alert('Deposit confirmed successfully! Loan is now active and collection transactions have been created.')
      handleCloseDepositModal()
      await fetchDeposits()
    } catch (err: any) {
      alert(err.message || 'Failed to confirm deposit')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Deposit Requests
            </h1>
            <p className='text-xs text-gray-600'>
              Manage manual loan deposits and disbursements
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={fetchDeposits}
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
                <span className='text-xl'>💵</span>
                <span className='text-2xl font-bold text-gray-900'>
                  {deposits.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid gap-3 md:grid-cols-5'>
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
               onClick={() => setStatusFilter('initiated')}>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-yellow-800'>Initiated</h3>
              <span className='text-lg'>🔄</span>
            </div>
            <p className='text-2xl font-bold text-yellow-900'>
              {statusCounts.initiated}
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

          <div className='cursor-pointer rounded-lg bg-green-50 p-3 shadow-sm transition-all hover:shadow-md'
               onClick={() => setStatusFilter('completed')}>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-green-800'>Completed</h3>
              <span className='text-lg'>✓</span>
            </div>
            <p className='text-2xl font-bold text-green-900'>
              {statusCounts.completed}
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
                    { value: 'all', label: 'All Deposits' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'initiated', label: 'Initiated' },
                    { value: 'authorized', label: 'Authorized' },
                    { value: 'completed', label: 'Completed' },
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

        {/* Deposits Table */}
        <div className='rounded-lg bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-4 py-3'>
            <div className='flex items-center justify-between'>
              <h2 className='text-sm font-semibold text-gray-900'>
                {statusFilter === 'all' ? 'All Deposit Requests' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Deposits`}
              </h2>
              <span className='text-xs text-gray-500'>
                {filteredDeposits.length} {filteredDeposits.length === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                <p className='mt-2 text-sm text-gray-600'>Loading deposits...</p>
              </div>
            ) : error ? (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>⚠️</span>
                <p className='text-sm text-red-600'>{error}</p>
              </div>
            ) : filteredDeposits.length === 0 ? (
              <div className='p-8 text-center'>
                <span className='mb-2 block text-2xl'>💵</span>
                <p className='text-sm text-gray-600'>No deposit requests found</p>
                <p className='mt-1 text-xs text-gray-400'>
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Deposit requests will appear here once loans are approved'}
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
                      Status
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Process Date
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Transaction ID
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
                  {filteredDeposits.map(deposit => (
                    <tr
                      key={deposit.id}
                      className='transition-colors hover:bg-gray-50'
                    >
                      <td className='whitespace-nowrap px-4 py-3'>
                        <div className='text-sm font-semibold text-gray-900'>
                          {deposit.loan_number ? `LN-${String(deposit.loan_number).padStart(6, '0')}` : 'N/A'}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center'>
                          <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-600'>
                            {deposit.borrower_name && deposit.borrower_name !== 'N/A' ? deposit.borrower_name[0] : '?'}
                          </div>
                          <div className='ml-3'>
                            <div className='text-sm font-medium text-gray-900'>
                              {deposit.borrower_name}
                            </div>
                            <div className='text-xs text-gray-500'>
                              {deposit.borrower_email}
                            </div>
                            <div className='text-xs text-gray-400'>
                              {deposit.borrower_phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-4 py-3'>
                        <div className='text-sm font-semibold text-gray-900'>
                          {formatCurrency(deposit.principal_amount)}
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-4 py-3'>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeColor(deposit)}`}
                        >
                          {getStatusLabel(deposit)}
                        </span>
                        {deposit.disbursement_error_code && (
                          <div className='mt-1 text-xs text-red-600'>
                            Error: {deposit.disbursement_error_code}
                          </div>
                        )}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-500'>
                        {deposit.disbursement_process_date || 'N/A'}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-500'>
                        {deposit.disbursement_transaction_id || 'N/A'}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm text-gray-500'>
                        {formatDate(deposit.created_at)}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm' onClick={(e) => e.stopPropagation()}>
                        {!deposit.disbursement_status && (
                          <button
                            onClick={() => handleOpenDepositModal(deposit)}
                            className='mr-2 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700'
                          >
                            Deposit
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/loan/${deposit.id}`)}
                          className='text-blue-600 hover:text-blue-800 text-xs'
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

        {/* Deposit Confirmation Modal */}
        {showDepositModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={handleCloseDepositModal}>
            <div className='mx-4 w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl' onClick={(e) => e.stopPropagation()}>
              <div className='mb-4'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Confirm Manual Deposit
                </h3>
                <p className='mt-1 text-sm text-gray-600'>
                  Review the deposit details and bank account information before confirming.
                </p>
              </div>

              {loadingDepositInfo ? (
                <div className='py-8 text-center'>
                  <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                  <p className='mt-2 text-sm text-gray-600'>Loading deposit information...</p>
                </div>
              ) : depositInfo ? (
                <div className='space-y-4'>
                  {/* Deposit Amount */}
                  <div className='rounded-lg bg-gray-50 p-4'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium text-gray-700'>Deposit Amount:</span>
                      <span className='text-xl font-bold text-gray-900'>
                        {formatCurrency(depositInfo.loan?.principal_amount || 0)}
                      </span>
                    </div>
                    {depositInfo.loan?.loan_number && (
                      <div className='mt-2 text-xs text-gray-500'>
                        Loan #{depositInfo.loan.loan_number}
                      </div>
                    )}
                  </div>

                  {/* Bank Account Information */}
                  {depositInfo.bank_account ? (
                    <div className='rounded-lg border border-gray-200 p-4'>
                      <h4 className='mb-3 text-sm font-semibold text-gray-900'>Bank Account Information</h4>
                      <div className='space-y-2 text-sm'>
                        {depositInfo.bank_account.bank_name && (
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>Bank Name:</span>
                            <span className='font-medium text-gray-900'>{depositInfo.bank_account.bank_name}</span>
                          </div>
                        )}
                        {depositInfo.bank_account.institution_number && (
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>Institution Number:</span>
                            <span className='font-medium text-gray-900'>{depositInfo.bank_account.institution_number}</span>
                          </div>
                        )}
                        {depositInfo.bank_account.transit_number && (
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>Transit Number:</span>
                            <span className='font-medium text-gray-900'>{depositInfo.bank_account.transit_number}</span>
                          </div>
                        )}
                        {depositInfo.bank_account.account_number && (
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>Account Number:</span>
                            <span className='font-medium text-gray-900'>{depositInfo.bank_account.account_number}</span>
                          </div>
                        )}
                        {depositInfo.bank_account.account_name && (
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>Account Name:</span>
                            <span className='font-medium text-gray-900'>{depositInfo.bank_account.account_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-4'>
                      <p className='text-sm text-yellow-800'>
                        ⚠️ Bank account information not found. Please verify the contract has been signed and contains bank account details.
                      </p>
                    </div>
                  )}

                  {/* Confirmation Message */}
                  <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                    <p className='text-sm text-blue-900'>
                      <strong>By confirming this deposit:</strong>
                    </p>
                    <ul className='mt-2 list-inside list-disc space-y-1 text-xs text-blue-800'>
                      <li>The loan status will be updated to "active"</li>
                      <li>Accept Pay collection transactions will be automatically created for all scheduled payments</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className='py-4 text-center text-sm text-red-600'>
                  Failed to load deposit information. Please try again.
                </div>
              )}

              {/* Modal Actions */}
              <div className='mt-6 flex justify-end gap-3'>
                <button
                  onClick={handleCloseDepositModal}
                  disabled={confirming}
                  className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeposit}
                  disabled={confirming || loadingDepositInfo || !depositInfo || !depositInfo.bank_account}
                  className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {confirming ? 'Confirming...' : 'Confirm Deposit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  )
}



