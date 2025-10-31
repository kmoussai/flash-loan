'use client'

import { useEffect, useState } from 'react'
import { IBVSummary } from '../../api/inverite/fetch/[guid]/types'

interface IbvApiResponse {
  application_id: string
  ibv_provider: string | null
  ibv_status: string | null
  ibv_verified_at: string | null
  request_guid: string | null
  ibv_results: IBVSummary
}

interface IbvCardProps {
  applicationId: string
  onViewTransactions?: (accountIndex?: number) => void
}

export default function IbvCard({
  applicationId,
  onViewTransactions
}: IbvCardProps) {
  const [data, setData] = useState<IbvApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchingInveriteData, setFetchingInveriteData] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `/api/admin/applications/${applicationId}/ibv/summary`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load IBV data')
      }
      const json = (await res.json()) as IbvApiResponse
      // Backfill request_guid from ibv_results for convenience
      ;(json as any).request_guid =
        (json as any)?.ibv_results?.request_guid || null

      setData(json)
    } catch (e: any) {
      console.error('[IbvCard] Error loading data:', e)
      setError(e.message || 'Failed to load IBV data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId])

  const summary = data?.ibv_results

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)

  const fetchInveriteAndRefresh = async () => {
    const requestGuid = summary?.request_guid || data?.request_guid
    if (!requestGuid) {
      console.warn('[IbvCard] No request_guid available for fetch')
      return
    }
    try {
      setFetchingInveriteData(true)
      setError(null)
      console.log('[IbvCard] Fetching Inverite data for GUID:', requestGuid)
      const res = await fetch(
        `/api/inverite/fetch/${requestGuid}?application_id=${applicationId}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to fetch Inverite data')
      }
      const fetchResult = await res.json()
      console.log('[IbvCard] Fetch completed:', {
        success: fetchResult.success,
        hasIbvResults: !!fetchResult.ibv_results,
        accountsCount: fetchResult.ibv_results?.accounts_summary?.length || 0
      })
      // Small delay to ensure database write is complete
      await new Promise(resolve => setTimeout(resolve, 500))
      await load()
    } catch (e: any) {
      console.error('[IbvCard] Error fetching Inverite data:', e)
      setError(e.message || 'Failed to fetch Inverite data')
    } finally {
      setFetchingInveriteData(false)
    }
  }

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-700'
    const s = status.toLowerCase()
    if (s.includes('verified') || s.includes('approved')) return 'bg-emerald-100 text-emerald-700'
    if (s.includes('pending') || s.includes('processing')) return 'bg-amber-100 text-amber-700'
    if (s.includes('failed') || s.includes('rejected')) return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      {/* Modern Header with Gradient */}
      <div className='bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm'>
              <svg className='h-6 w-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
              </svg>
            </div>
            <div>
              <h2 className='text-xl font-bold text-white'>
                IBV Verification
              </h2>
              <p className='mt-0.5 text-sm text-white/90'>Identity & Bank Verification</p>
            </div>
          </div>
          <button
            onClick={fetchInveriteAndRefresh}
            disabled={!summary?.request_guid || fetchingInveriteData}
            className='rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50'
            title={
              summary?.request_guid
                ? 'Fetch latest IBV data'
                : 'No request GUID yet'
            }
          >
            {fetchingInveriteData ? (
              <span className='flex items-center gap-2'>
                <svg
                  className='h-4 w-4 animate-spin'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  />
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  />
                </svg>
                Fetching...
              </span>
            ) : (
              <span className='flex items-center gap-1.5'>
                <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                </svg>
                Refresh
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center p-12'>
          <div className='text-center'>
            <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600'></div>
            <p className='mt-4 text-sm text-gray-500'>Loading IBV data...</p>
          </div>
        </div>
      ) : error ? (
        <div className='p-6'>
          <div className='rounded-lg bg-red-50 border border-red-200 p-4'>
            <div className='flex items-start gap-3'>
              <svg className='h-5 w-5 text-red-600 mt-0.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
              <div>
                <p className='text-sm font-medium text-red-800'>Error loading data</p>
                <p className='mt-1 text-sm text-red-600'>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : summary && summary.accounts && summary.accounts.length > 0 ? (
        <div className='p-6'>
          <div className='space-y-6'>
            {/* Key Statistics - Highlighted First */}
            <div className='rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 shadow-lg'>
              <div className='mb-4 flex items-center gap-2'>
                <svg className='h-5 w-5 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' />
                </svg>
                <h3 className='text-lg font-bold text-gray-900'>Account Statistics Overview</h3>
              </div>
              
              <div className='grid gap-4 md:grid-cols-3'>
                {/* Total Income Net */}
                <div className='rounded-lg bg-white/80 backdrop-blur-sm border border-indigo-100 p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100'>
                      <svg className='h-5 w-5 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                    </div>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Total Income Net
                    </label>
                  </div>
                  <p className='text-2xl font-bold text-emerald-900'>
                    {(() => {
                      const total = summary.accounts.reduce((sum, acc) => 
                        sum + (acc.statistics?.income_net || 0), 0
                      )
                      return total > 0 ? formatCurrency(total) : 'N/A'
                    })()}
                  </p>
                  <p className='mt-1 text-xs text-gray-500'>
                    Across {summary.accounts.length} {summary.accounts.length === 1 ? 'account' : 'accounts'}
                  </p>
                </div>

                {/* Total Transactions */}
                <div className='rounded-lg bg-white/80 backdrop-blur-sm border border-indigo-100 p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100'>
                      <svg className='h-5 w-5 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' />
                      </svg>
                    </div>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Total Transactions
                    </label>
                  </div>
                  <p className='text-2xl font-bold text-indigo-900'>
                    {(() => {
                      const total = summary.accounts.reduce((sum, acc) => 
                        sum + (acc.total_transactions || 0), 0
                      )
                      return total > 0 ? total.toLocaleString() : 'N/A'
                    })()}
                  </p>
                  <p className='mt-1 text-xs text-gray-500'>
                    {summary.accounts.length} {summary.accounts.length === 1 ? 'account' : 'accounts'} linked
                  </p>
                </div>

                {/* Total NSF */}
                <div className='rounded-lg bg-white/80 backdrop-blur-sm border border-indigo-100 p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100'>
                      <svg className='h-5 w-5 text-amber-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
                      </svg>
                    </div>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Total NSF (All Time)
                    </label>
                  </div>
                  <p className='text-2xl font-bold text-amber-900'>
                    {(() => {
                      const total = summary.accounts.reduce((sum, acc) => 
                        sum + (acc.statistics?.nsf?.all_time || 0), 0
                      )
                      return total > 0 ? total : 'N/A'
                    })()}
                  </p>
                  <p className='mt-1 text-xs text-gray-500'>
                    Combined across all accounts
                  </p>
                </div>
              </div>
            </div>

            {/* Status & Metadata Cards - Secondary Info */}
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm'>
                <div className='flex items-center gap-2 mb-2'>
                  <svg className='h-4 w-4 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Verification Status
                  </label>
                </div>
                <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${getStatusColor(data?.ibv_status || null)}`}>
                  {data?.ibv_status ? String(data.ibv_status).toUpperCase() : 'UNKNOWN'}
                </p>
              </div>
              
              <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm'>
                <div className='flex items-center gap-2 mb-2'>
                  <svg className='h-4 w-4 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' />
                  </svg>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    IBV Provider
                  </label>
                </div>
                <p className='mt-2 text-base font-bold text-gray-900 capitalize'>
                  {data?.ibv_provider ? String(data.ibv_provider) : 'N/A'}
                </p>
              </div>
              
              <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm'>
                <div className='flex items-center gap-2 mb-2'>
                  <svg className='h-4 w-4 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 20l4-16m2 16l4-16M6 9h14M4 15h14' />
                  </svg>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Request ID
                  </label>
                </div>
                <p className='mt-2 font-mono text-sm font-semibold text-gray-900'>
                  {summary.request_guid?.slice(0, 8) || 'N/A'}
                </p>
              </div>
            </div>

            {/* Accounts Section */}
            <div>
              <div className='mb-4 flex items-center justify-between'>
                <h3 className='text-base font-bold text-gray-900'>
                  Linked Accounts
                </h3>
                <span className='rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700'>
                  {summary.accounts.length} {summary.accounts.length === 1 ? 'Account' : 'Accounts'}
                </span>
              </div>
              
              <div className='grid gap-4'>
                {summary.accounts.map((account, index) => (
                  <div
                    key={index}
                    onClick={() => onViewTransactions?.(index)}
                    className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ${
                      onViewTransactions ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5' : ''
                    }`}
                  >
                    {/* Subtle gradient accent */}
                    <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'></div>
                    
                    <div className='flex items-start justify-between gap-4'>
                      {/* Left: Bank Info */}
                      <div className='flex-1'>
                        <div className='flex items-center gap-3 mb-3'>
                          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100'>
                            <svg className='h-6 w-6 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                            </svg>
                          </div>
                          <div>
                            <h4 className='text-lg font-bold text-gray-900'>
                              {account.bank_name || account.institution || 'Unknown Bank'}
                            </h4>
                            <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                              <span className='inline-flex items-center gap-1'>
                                <span className='font-medium'>{account.type || 'N/A'}</span>
                              </span>
                              {account.number && (
                                <>
                                  <span className='text-gray-300'>•</span>
                                  <span className='font-mono'>{account.number}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Account Details Grid */}
                        <div className='grid grid-cols-2 gap-3 mt-4'>
                          {account.transit && (
                            <div>
                              <p className='text-xs font-medium text-gray-500'>Transit</p>
                              <p className='mt-0.5 text-sm font-semibold text-gray-900'>{account.transit}</p>
                            </div>
                          )}
                          {account.routing_code && (
                            <div>
                              <p className='text-xs font-medium text-gray-500'>Routing</p>
                              <p className='mt-0.5 text-sm font-semibold text-gray-900 font-mono'>{account.routing_code}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Transaction Count & Stats */}
                      <div className='flex flex-col items-end gap-4'>
                        {/* Transaction Count Badge */}
                        <div className='text-right'>
                          <p className='text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1'>Transactions</p>
                          <div className='inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2 shadow-md'>
                            <svg className='h-4 w-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' />
                            </svg>
                            <span className='text-xl font-bold text-white'>
                              {account.total_transactions != null ? account.total_transactions : 'N/A'}
                            </span>
                          </div>
                          {onViewTransactions && (
                            <p className='mt-2 text-xs text-indigo-600 font-medium group-hover:text-indigo-700'>
                              Click to view →
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Statistics Row - Prominent */}
                    <div className='mt-6 grid grid-cols-2 gap-4 border-t-2 border-gray-200 pt-5'>
                      <div className='rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 shadow-lg'>
                        <div className='flex items-center gap-2 mb-2'>
                          <svg className='h-4 w-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                          </svg>
                          <p className='text-xs font-semibold uppercase tracking-wide text-white/90'>
                            Income Net
                          </p>
                        </div>
                        <p className='text-2xl font-bold text-white'>
                          {account.statistics?.income_net != null
                            ? formatCurrency(account.statistics.income_net)
                            : 'N/A'}
                        </p>
                      </div>
                      <div className='rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 shadow-lg'>
                        <div className='flex items-center gap-2 mb-2'>
                          <svg className='h-4 w-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
                          </svg>
                          <p className='text-xs font-semibold uppercase tracking-wide text-white/90'>
                            NSF (All Time)
                          </p>
                        </div>
                        <p className='text-2xl font-bold text-white'>
                          {account.statistics?.nsf?.all_time != null
                            ? account.statistics.nsf?.all_time
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* PDF Statements */}
                    {account.bank_pdf_statements &&
                      account.bank_pdf_statements.length > 0 && (
                        <div className='mt-4 border-t border-gray-100 pt-4'>
                          <div className='flex items-center justify-between mb-2'>
                            <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                              Bank Statements
                            </p>
                            <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700'>
                              {account.bank_pdf_statements.length}
                            </span>
                          </div>
                          <div className='flex flex-wrap gap-2'>
                            {account.bank_pdf_statements.map((pdf, pdfIndex) => (
                              <a
                                key={pdfIndex}
                                href={pdf}
                                target='_blank'
                                rel='noopener noreferrer'
                                onClick={(e) => e.stopPropagation()}
                                className='inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                              >
                                <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                                </svg>
                                PDF {pdfIndex + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='p-12'>
          <div className='text-center'>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
              <svg className='h-8 w-8 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
              </svg>
            </div>
            <h3 className='mt-4 text-lg font-semibold text-gray-900'>No IBV Data Available</h3>
            <p className='mt-2 text-sm text-gray-500'>
              Fetch data to see account verification summary
            </p>
            {summary && (
              <details className='mt-4 text-left'>
                <summary className='cursor-pointer text-xs text-gray-400 hover:text-gray-600'>
                  Show raw data
                </summary>
                <pre className='mt-2 rounded-lg bg-gray-50 p-4 text-xs overflow-auto max-h-64'>
                  {JSON.stringify(summary, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
