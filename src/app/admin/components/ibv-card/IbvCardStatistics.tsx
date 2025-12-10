'use client'

import { IBVSummary } from '../../../api/inverite/fetch/[guid]/types'
import { formatCurrency } from './types'

interface IbvCardStatisticsProps {
  accounts: IBVSummary['accounts']
}

export default function IbvCardStatistics({
  accounts
}: IbvCardStatisticsProps) {
  return (
    <div className='rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-2.5 shadow-sm'>
      <div className='mb-2 flex items-center gap-1.5'>
        <svg
          className='h-3.5 w-3.5 text-indigo-600'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          />
        </svg>
        <h3 className='text-xs font-bold text-gray-900'>
          Account Statistics Overview
        </h3>
      </div>

      <div className='grid gap-2 md:grid-cols-3'>
        {/* Total Income Net */}
        <div className='rounded-lg border border-indigo-100 bg-white/80 p-2 backdrop-blur-sm'>
          <div className='mb-1.5 flex items-center gap-1.5'>
            <div className='flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100'>
              <svg
                className='h-3.5 w-3.5 text-emerald-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-600'>
              Total Income Net
            </label>
          </div>
          <p className='text-sm font-bold text-emerald-900'>
            {(() => {
              const total = accounts.reduce(
                (sum, acc) => sum + (acc.statistics?.income_net || 0),
                0
              )
              return total > 0 ? formatCurrency(total) : 'N/A'
            })()}
          </p>
          <p className='mt-0.5 text-[10px] text-gray-500'>
            Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        {/* Total Transactions */}
        <div className='rounded-lg border border-indigo-100 bg-white/80 p-2 backdrop-blur-sm'>
          <div className='mb-1 flex items-center gap-1'>
            <div className='flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-100'>
              <svg
                className='h-3 w-3 text-indigo-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
                />
              </svg>
            </div>
            <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-600'>
              Total Transactions
            </label>
          </div>
          <p className='text-sm font-bold text-indigo-900'>
            {(() => {
              const total = accounts.reduce(
                (sum, acc) => sum + (acc.total_transactions || 0),
                0
              )
              return total > 0 ? total.toLocaleString() : 'N/A'
            })()}
          </p>
          <p className='mt-0.5 text-[10px] text-gray-500'>
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} linked
          </p>
        </div>

        {/* Total NSF */}
        <div className='rounded-lg border border-indigo-100 bg-white/80 p-2 backdrop-blur-sm'>
          <div className='mb-1 flex items-center gap-1'>
            <div className='flex h-5 w-5 items-center justify-center rounded-lg bg-amber-100'>
              <svg
                className='h-3 w-3 text-amber-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>
            <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-600'>
              Total NSF (All Time)
            </label>
          </div>
          <p className='text-sm font-bold text-amber-900'>
            {(() => {
              const total = accounts.reduce(
                (sum, acc) => sum + (acc.statistics?.nsf?.all_time || 0),
                0
              )
              return total > 0 ? total : 'N/A'
            })()}
          </p>
          <p className='mt-0.5 text-[10px] text-gray-500'>
            Combined across all accounts
          </p>
        </div>
      </div>
    </div>
  )
}
