'use client'

import { useEffect, useMemo, useState } from 'react'

type IbvResults = {
  extracted_at?: string
  accounts_count?: number
  accounts_summary?: Array<{
    account_index?: number
    account_type?: string | null
    account_description?: string | null
    institution?: string | null
    quarter_all_time?: {
      number_of_deposits?: number | null
      amount_of_deposits?: number | null
      average_amount_of_deposits?: number | null
      number_of_withdrawals?: number | null
      amount_of_withdrawals?: number | null
      average_balance?: number | null
      highest_balance?: number | null
      lowest_balance?: number | null
      ending_balance?: number | null
      overdraft_count?: number | null
      negative_balance_count?: number | null
      negative_balance_days?: number | null
      total_transactions?: number | null
    } | null
    current_balance?: {
      available?: number | null
      current?: number | null
    } | null
    transaction_count?: number
  }>
  aggregates?: {
    total_deposits?: number | null
    total_withdrawals?: number | null
    total_accounts?: number
    accounts_with_statistics?: number
  }
} | null

interface IbvApiResponse {
  application_id: string
  ibv_provider: string | null
  ibv_status: string | null
  ibv_verified_at: string | null
  request_guid: string | null
  ibv_results: IbvResults
}

interface IbvCardProps {
  applicationId: string
}

export default function IbvCard({ applicationId }: IbvCardProps) {
  const [data, setData] = useState<IbvApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchingInveriteData, setFetchingInveriteData] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/applications/${applicationId}/ibv`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load IBV data')
      }
      const json = (await res.json()) as IbvApiResponse
      setData(json)
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Failed to load IBV data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId])

  const summary = data?.ibv_results

  const riskScore = useMemo(() => {
    if (!summary || !summary.accounts_summary || summary.accounts_summary.length === 0) return 0
    const accountsWithData = summary.accounts_summary.filter(acc => acc.quarter_all_time)
    if (accountsWithData.length === 0) return 0

    let totalOverdrafts = 0
    let totalNegativeDays = 0
    let totalNegativeCount = 0
    let avgBalance = 0
    let totalDeposits = 0
    let depositCount = 0

    accountsWithData.forEach(acc => {
      const qat = acc.quarter_all_time
      if (qat) {
        totalOverdrafts += qat.overdraft_count || 0
        totalNegativeDays += qat.negative_balance_days || 0
        totalNegativeCount += qat.negative_balance_count || 0
        if (qat.average_balance !== null && qat.average_balance !== undefined) {
          avgBalance += qat.average_balance
        }
        if (qat.amount_of_deposits !== null && qat.amount_of_deposits !== undefined) {
          totalDeposits += qat.amount_of_deposits
          depositCount++
        }
      }
    })

    const avgOverdrafts = totalOverdrafts / accountsWithData.length
    const avgNegativeDays = totalNegativeDays / accountsWithData.length
    const avgNegativeCount = totalNegativeCount / accountsWithData.length
    avgBalance = avgBalance / accountsWithData.length

    let score = 50
    score -= Math.min(avgOverdrafts * 10, 30)
    score -= Math.min(avgNegativeDays * 5, 20)
    score -= Math.min(avgNegativeCount * 3, 15)
    if (avgBalance < 1000) {
      score -= Math.min((1000 - avgBalance) / 100, 10)
    }
    const avgDeposits = depositCount > 0 ? totalDeposits / depositCount : 0
    if (avgDeposits < 500) score -= 15
    if (avgBalance > 2000) score += 10
    if (avgDeposits > 2000) score += 5
    return Math.max(0, Math.min(100, Math.round(score)))
  }, [summary])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  const fetchInveriteAndRefresh = async () => {
    if (!data?.request_guid) return
    try {
      setFetchingInveriteData(true)
      const res = await fetch(`/api/inverite/fetch/${data.request_guid}?application_id=${applicationId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to fetch Inverite data')
      }
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to fetch Inverite data')
    } finally {
      setFetchingInveriteData(false)
    }
  }

  return (
    <div className='rounded-lg bg-white border border-gray-200 overflow-hidden'>
      <div className='bg-purple-50 border-b border-gray-200 px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-gray-900'>IBV Verification</h2>
            <p className='text-sm text-gray-500 mt-0.5'>Risk Assessment</p>
          </div>
          <button
            onClick={fetchInveriteAndRefresh}
            disabled={!data?.request_guid || fetchingInveriteData}
            className='rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            title={data?.request_guid ? 'Fetch latest IBV data' : 'No request GUID yet'}
          >
            {fetchingInveriteData ? (
              <span className='flex items-center gap-2'>
                <svg className='h-3 w-3 animate-spin' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                </svg>
                Fetching...
              </span>
            ) : (
              'Fetch Data'
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className='p-6 text-sm text-gray-500'>Loading IBV data...</div>
      ) : error ? (
        <div className='p-6 text-sm text-red-600'>{error}</div>
      ) : summary ? (
        <div className='p-6'>
          <div className='space-y-4'>
            {(() => {
              const accountsWithData = summary.accounts_summary?.filter(acc => acc.quarter_all_time) || []
              let totalOverdrafts = 0
              let totalNegativeDays = 0
              let totalNegativeCount = 0
              let totalDeposits = 0
              let totalWithdrawals = 0
              let avgBalance = 0
              let lowestBalance = Infinity
              let highestBalance = -Infinity
              let endingBalance = 0

              accountsWithData.forEach(acc => {
                const qat = acc.quarter_all_time
                if (qat) {
                  totalOverdrafts += qat.overdraft_count || 0
                  totalNegativeDays += qat.negative_balance_days || 0
                  totalNegativeCount += qat.negative_balance_count || 0
                  totalDeposits += qat.amount_of_deposits || 0
                  totalWithdrawals += qat.amount_of_withdrawals || 0
                  if (qat.average_balance !== null && qat.average_balance !== undefined) {
                    avgBalance += qat.average_balance
                  }
                  if (qat.lowest_balance !== null && qat.lowest_balance !== undefined) {
                    lowestBalance = Math.min(lowestBalance, qat.lowest_balance)
                  }
                  if (qat.highest_balance !== null && qat.highest_balance !== undefined) {
                    highestBalance = Math.max(highestBalance, qat.highest_balance)
                  }
                  if (qat.ending_balance !== null && qat.ending_balance !== undefined) {
                    endingBalance += qat.ending_balance
                  }
                }
              })

              avgBalance = accountsWithData.length > 0 ? avgBalance / accountsWithData.length : 0

              return (
                <>
                  <div className={`rounded border p-4 ${
                    riskScore >= 70 ? 'border-green-200 bg-green-50' :
                    riskScore >= 50 ? 'border-yellow-200 bg-yellow-50' :
                    'border-red-200 bg-red-50'
                  }`}>
                    <div className='flex items-center justify-between'>
                      <div>
                        <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Risk Assessment</label>
                        <p className={`text-2xl font-semibold mt-1 ${
                          riskScore >= 70 ? 'text-green-900' :
                          riskScore >= 50 ? 'text-yellow-900' :
                          'text-red-900'
                        }`}>
                          {riskScore}%
                        </p>
                      </div>
                      <div className='text-sm font-semibold text-gray-700'>
                        {data?.ibv_status ? String(data.ibv_status).toUpperCase() : 'UNKNOWN'}
                      </div>
                    </div>
                  </div>

                  <div className='grid gap-4 md:grid-cols-3'>
                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Deposits (QAT)</label>
                      <p className='text-lg font-semibold text-gray-900 mt-1'>
                        {summary.aggregates?.total_deposits ? formatCurrency(summary.aggregates.total_deposits) : formatCurrency(totalDeposits)}
                      </p>
                      <p className='text-xs text-gray-500 mt-1'>Quarter all time</p>
                    </div>
                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Withdrawals (QAT)</label>
                      <p className='text-lg font-semibold text-gray-900 mt-1'>
                        {formatCurrency(totalWithdrawals)}
                      </p>
                      <p className='text-xs text-gray-500 mt-1'>Quarter all time</p>
                    </div>
                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Avg Balance</label>
                      <p className='text-lg font-semibold text-gray-900 mt-1'>
                        {avgBalance ? formatCurrency(avgBalance) : 'N/A'}
                      </p>
                      <p className='text-xs text-gray-500 mt-1'>Across accounts</p>
                    </div>
                  </div>

                  {(lowestBalance !== Infinity || highestBalance !== -Infinity) && (
                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Balance Range</label>
                      <div className='mt-1 flex items-center gap-2 text-sm'>
                        <span className='text-gray-600'>Low:</span>
                        <span className='font-semibold text-gray-900'>
                          {lowestBalance !== Infinity ? formatCurrency(lowestBalance) : 'N/A'}
                        </span>
                        <span className='text-gray-400'>•</span>
                        <span className='text-gray-600'>High:</span>
                        <span className='font-semibold text-gray-900'>
                          {highestBalance !== -Infinity ? formatCurrency(highestBalance) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}

                  {summary.accounts_count && summary.accounts_count > 0 && (
                    <div className='rounded border border-gray-200 bg-white p-3'>
                      <label className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Accounts</label>
                      <p className='text-lg font-semibold text-gray-900 mt-1'>{summary.accounts_count}</p>
                      <p className='text-xs text-gray-500 mt-1'>
                        {summary.aggregates?.accounts_with_statistics || accountsWithData.length} with data
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      ) : (
        <div className='p-6'>
          <p className='text-sm text-gray-500 text-center'>No IBV data available. Fetch data to see summary.</p>
        </div>
      )}
    </div>
  )
}


