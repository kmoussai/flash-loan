'use client'

import { useEffect, useState } from 'react'

interface TransactionsModalProps {
  open: boolean
  onClose: () => void
  applicationId: string
  accountIndex?: number | undefined
}

interface Transaction {
  id: string | null
  description: string
  date: string
  credit: number | null
  debit: number | null
  balance: number | null
  category: string
  original_category: string | null
  confidence: number
  flags: string[]
  account_index: number
  account_type: string | null
  account_description: string | null
  account_number: string | null
  institution: string | null
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === undefined) return 'N/A'
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

const categoryColors: Record<string, string> = {
  salary: 'bg-green-50 text-green-700 border border-green-200',
  employment_insurance: 'bg-blue-50 text-blue-700 border border-blue-200',
  government_benefit: 'bg-purple-50 text-purple-700 border border-purple-200',
  pension: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  loan_payment: 'bg-red-50 text-red-700 border border-red-200',
  loan_receipt: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  nsf_fee: 'bg-orange-50 text-orange-700 border border-orange-200',
  overdraft_fee: 'bg-amber-50 text-amber-700 border border-amber-200',
  bank_fee: 'bg-gray-50 text-gray-700 border border-gray-200',
  transfer: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  other_income: 'bg-lime-50 text-lime-700 border border-lime-200',
  other_expense: 'bg-rose-50 text-rose-700 border border-rose-200',
  unknown: 'bg-gray-50 text-gray-500 border border-gray-200'
}

const formatCategoryName = (category: string): string => {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function TransactionsModal({
  open,
  onClose,
  applicationId,
  accountIndex
}: TransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [categoryCounts, setCategoryCounts] = useState({
    salary: 0,
    loan_payment: 0,
    nsf_fee: 0
  })

  // Fetch category counts when modal opens (without filters)
  useEffect(() => {
    if (!open || !applicationId) return

    const fetchCategoryCounts = async () => {
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '1' // Just need counts, not data
        })
        
        if (accountIndex !== undefined && accountIndex !== null) {
          params.append('account_index', accountIndex.toString())
        }

        // Fetch counts for each category
        const [salaryRes, loanPaymentRes, nsfRes] = await Promise.all([
          fetch(`/api/admin/applications/${applicationId}/transactions?${new URLSearchParams({ ...Object.fromEntries(params), category: 'salary' })}`),
          fetch(`/api/admin/applications/${applicationId}/transactions?${new URLSearchParams({ ...Object.fromEntries(params), category: 'loan_payment' })}`),
          fetch(`/api/admin/applications/${applicationId}/transactions?${new URLSearchParams({ ...Object.fromEntries(params), category: 'nsf_fee' })}`)
        ])

        const [salaryData, loanPaymentData, nsfData] = await Promise.all([
          salaryRes.json().catch(() => ({ pagination: { total: 0 } })),
          loanPaymentRes.json().catch(() => ({ pagination: { total: 0 } })),
          nsfRes.json().catch(() => ({ pagination: { total: 0 } }))
        ])

        setCategoryCounts({
          salary: salaryData.pagination?.total || 0,
          loan_payment: loanPaymentData.pagination?.total || 0,
          nsf_fee: nsfData.pagination?.total || 0
        })
      } catch (e: any) {
        console.error('[TransactionsModal] Failed to fetch category counts:', e)
        // Don't set error - counts are optional
      }
    }

    fetchCategoryCounts()
  }, [open, applicationId, accountIndex])

  // Fetch transactions from API when modal opens or filters change
  useEffect(() => {
    if (!open || !applicationId) return

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '50'
        })
        
        if (accountIndex !== undefined && accountIndex !== null) {
          params.append('account_index', accountIndex.toString())
        }
        if (categoryFilter !== 'all') {
          params.append('category', categoryFilter)
        }
        if (search.trim()) {
          params.append('search', search.trim())
        }

        const res = await fetch(`/api/admin/applications/${applicationId}/transactions?${params}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to load transactions')
        }
        const json = await res.json()
        setTransactions(Array.isArray(json.transactions) ? json.transactions : [])
        setPagination(json.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        })
      } catch (e: any) {
        console.error('[TransactionsModal] Failed to fetch transactions:', e)
        setError(e.message || 'Failed to load transactions')
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timer = setTimeout(() => {
      fetchTransactions()
    }, search ? 500 : 0)

    return () => clearTimeout(timer)
  }, [open, applicationId, accountIndex, categoryFilter, currentPage, search])

  // Reset filters when modal closes
  useEffect(() => {
    if (!open) {
      setSearch('')
      setCategoryFilter('all')
      setCurrentPage(1)
    }
  }, [open])

  // Get unique categories for filter dropdown
  const uniqueCategories = Array.from(
    new Set(transactions.map(tx => tx.category))
  ).sort()

  if (!open) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4' onClick={onClose}>
      <div className='my-auto w-full max-w-6xl h-[85vh] rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col' onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className='border-b border-gray-200 px-6 py-4 flex-shrink-0'>
          <div className='flex items-center justify-between mb-3'>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>
                {accountIndex !== undefined && accountIndex !== null
                  ? `Transaction History - Account ${accountIndex + 1}`
                  : 'Transaction History'}
              </h3>
              <p className='text-sm text-gray-500 mt-0.5'>
                {loading 
                  ? 'Loading transactions…' 
                  : error 
                    ? error 
                    : `Showing ${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} transactions`}
              </p>
            </div>
            <button
              onClick={onClose}
              className='flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors'
            >
              <svg className='h-5 w-5 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
          
          {/* Quick Filter Buttons */}
          <div className='flex items-center gap-2 flex-wrap'>
            <button
              onClick={() => {
                setCategoryFilter(categoryFilter === 'salary' ? 'all' : 'salary')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === 'salary'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <span>Salary</span>
              {categoryCounts.salary > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  categoryFilter === 'salary'
                    ? 'bg-green-200 text-green-900'
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  {categoryCounts.salary}
                </span>
              )}
            </button>
            
            <button
              onClick={() => {
                setCategoryFilter(categoryFilter === 'loan_payment' ? 'all' : 'loan_payment')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === 'loan_payment'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <span>Loan Payments</span>
              {categoryCounts.loan_payment > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  categoryFilter === 'loan_payment'
                    ? 'bg-red-200 text-red-900'
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  {categoryCounts.loan_payment}
                </span>
              )}
            </button>
            
            <button
              onClick={() => {
                setCategoryFilter(categoryFilter === 'nsf_fee' ? 'all' : 'nsf_fee')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === 'nsf_fee'
                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <span>NSF</span>
              {categoryCounts.nsf_fee > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  categoryFilter === 'nsf_fee'
                    ? 'bg-orange-200 text-orange-900'
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  {categoryCounts.nsf_fee}
                </span>
              )}
            </button>
            
            {categoryFilter !== 'all' && (
              <button
                onClick={() => {
                  setCategoryFilter('all')
                  setCurrentPage(1)
                }}
                className='inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors'
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className='border-b border-gray-200 px-6 py-3 flex-shrink-0 flex items-center gap-3'>
          <input
            type='text'
            placeholder='Search transactions...'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className='flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setCurrentPage(1)
            }}
            className='rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          >
            <option value='all'>All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{formatCategoryName(cat)}</option>
            ))}
          </select>
        </div>

        {/* Transaction List */}
        <div className='flex-1 overflow-y-auto'>
          {loading ? (
            <div className='py-12 text-center'>
              <div className='mx-auto h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600'></div>
              <p className='mt-3 text-sm text-gray-600'>Loading transactions…</p>
            </div>
          ) : error ? (
            <div className='py-12 text-center'>
              <span className='mb-3 block text-2xl'>⚠️</span>
              <p className='text-sm text-red-600'>{error}</p>
              <p className='mt-2 text-xs text-gray-500'>Please try again later</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className='py-12 text-center'>
              <span className='mb-3 block text-2xl'>📝</span>
              <p className='text-sm text-gray-600'>No transactions found</p>
              {(search || categoryFilter !== 'all') && (
                <p className='mt-2 text-xs text-gray-500'>Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className='divide-y divide-gray-200'>
              {transactions.map((tx, index) => {
                const amount = tx.credit || -(tx.debit || 0)
                const isCredit = tx.credit !== null && tx.credit > 0
                return (
                  <div 
                    key={tx.id || index} 
                    className='px-6 py-3 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>{tx.description}</p>
                        <div className='mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                          <span>{formatDate(tx.date)}</span>
                          {tx.account_description && (
                            <>
                              <span className='text-gray-400'>•</span>
                              <span className='rounded px-1.5 py-0.5 bg-gray-100 text-gray-700'>
                                {tx.account_description}
                              </span>
                            </>
                          )}
                        </div>
                        <div className='mt-1.5 flex flex-wrap items-center gap-2'>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[tx.category] || categoryColors.unknown}`}>
                            {formatCategoryName(tx.category)}
                          </span>
                          {tx.confidence < 0.7 && (
                            <span className='text-[10px] text-gray-400'>
                              ({Math.round(tx.confidence * 100)}% confidence)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='text-right flex-shrink-0'>
                        <p className={`text-sm font-semibold ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                          {isCredit ? '+' : ''}{formatCurrency(amount)}
                        </p>
                        {tx.balance !== null && tx.balance !== undefined && (
                          <p className='text-xs text-gray-500 mt-0.5'>
                            Balance: {formatCurrency(tx.balance)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className='border-t border-gray-200 px-6 py-3 flex-shrink-0'>
            <div className='flex items-center justify-between'>
              <div className='text-xs text-gray-700'>
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className='flex items-center gap-1.5'>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className='rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  Previous
                </button>
                <div className='flex items-center gap-1'>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = pagination.page - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          pagination.page === pageNum
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
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className='rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className='border-t border-gray-200 px-6 py-3 flex-shrink-0'>
          <button
            onClick={onClose}
            className='w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


