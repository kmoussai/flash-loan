'use client'

import { useEffect, useMemo, useState } from 'react'

interface TransactionsModalProps {
  open: boolean
  onClose: () => void
  applicationId: string
  accountIndex?: number | undefined
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)

export default function TransactionsModal({
  open,
  onClose,
  applicationId,
  accountIndex
}: TransactionsModalProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Fetch transactions from API when modal opens
  useEffect(() => {
    if (!open || !applicationId) return

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/applications/${applicationId}/transactions`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to load transactions')
        }
        const json = await res.json()
        setTransactions(Array.isArray(json.transactions) ? json.transactions : [])
      } catch (e: any) {
        console.error('[TransactionsModal] Failed to fetch transactions:', e)
        setError(e.message || 'Failed to load transactions')
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [open, applicationId])

  // Reset search when modal closes or account index changes
  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open, accountIndex])

  const filtered = useMemo(() => {
    let result = transactions

    // Filter by account index if provided
    if (accountIndex !== undefined && accountIndex !== null) {
      result = result.filter((tx: any) => {
        return tx.account_index === accountIndex
      })
    }

    // Apply search filter
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((tx: any) =>
        (tx.description && tx.description.toLowerCase().includes(s)) ||
        (tx.date && tx.date.includes(s)) ||
        (tx.category && String(tx.category).toLowerCase().includes(s)) ||
        (tx.account_description && String(tx.account_description).toLowerCase().includes(s))
      )
    }

    return result
  }, [transactions, search, accountIndex])

  if (!open) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={onClose}>
      <div className='mx-4 w-full max-w-4xl h-[700px] rounded-lg bg-white border border-gray-200 flex flex-col' onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className='border-b border-gray-200 px-6 py-4 flex-shrink-0'>
          <div className='flex items-center justify-between'>
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
                    : `${filtered.length} of ${transactions.length} transactions${accountIndex !== undefined && accountIndex !== null ? ' (filtered by account)' : ''}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className='flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 transition-colors'
            >
              <svg className='h-5 w-5 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className='border-b border-gray-200 px-6 py-4 flex-shrink-0'>
          <input
            type='text'
            placeholder='Search transactions...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400'
          />
        </div>

        {/* Transaction List */}
        <div className='flex-1 overflow-y-auto px-6 py-4'>
          {loading ? (
            <div className='py-12 text-center'>
              <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900'></div>
              <p className='mt-4 text-sm text-gray-600'>Loading transactions…</p>
            </div>
          ) : error ? (
            <div className='py-12 text-center'>
              <p className='text-red-600'>{error}</p>
              <p className='mt-2 text-sm text-gray-500'>Please try again later</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className='py-12 text-center'>
              <p className='text-gray-600'>No transactions found</p>
              {search && (
                <p className='mt-2 text-sm text-gray-500'>Try a different search term</p>
              )}
            </div>
          ) : (
            <div className='space-y-3'>
              {filtered.map((tx: any, index: number) => {
                const amount = tx.credit || -(tx.debit || 0)
                return (
                  <div 
                    key={index} 
                    className='rounded border border-gray-200 p-4 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <p className='font-medium text-gray-900'>{tx.description}</p>
                        <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                          <span>{tx.date}</span>
                          {tx.account_description && (
                            <>
                              <span className='text-gray-400'>•</span>
                              <span className='rounded px-1.5 py-0.5 bg-gray-100 text-gray-700'>
                                {tx.account_description}
                              </span>
                            </>
                          )}
                          {tx.category && (
                            <>
                              <span className='text-gray-400'>•</span>
                              <span className='text-gray-500 capitalize'>
                                {String(tx.category).split('/').pop()}
                              </span>
                            </>
                          )}
                        </div>
                        {tx.flags && tx.flags.length > 0 && (
                          <div className='mt-1 flex flex-wrap gap-1'>
                            {tx.flags.map((flag: string, flagIndex: number) => (
                              <span
                                key={flagIndex}
                                className='rounded px-1.5 py-0.5 bg-gray-100 text-xs text-gray-700'
                              >
                                {flag.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className='text-right ml-4'>
                        <p className='text-lg font-semibold text-gray-900'>
                          {formatCurrency(amount)}
                        </p>
                        {tx.balance !== null && tx.balance !== undefined && (
                          <p className='text-xs text-gray-500'>
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

        {/* Footer */}
        <div className='border-t border-gray-200 px-6 py-4 flex-shrink-0'>
          <button
            onClick={onClose}
            className='w-full rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


