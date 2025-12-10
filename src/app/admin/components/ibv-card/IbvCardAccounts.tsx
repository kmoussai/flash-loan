'use client'

import { IBVSummary } from '../../../api/inverite/fetch/[guid]/types'
import { formatCurrency } from './types'

interface IbvCardAccountsProps {
  accounts: IBVSummary['accounts']
  onViewTransactions?: (accountIndex?: number) => void
}

export default function IbvCardAccounts({
  accounts,
  onViewTransactions
}: IbvCardAccountsProps) {
  return (
    <div>
      <div className='mb-2 flex items-center justify-between'>
        <h3 className='text-xs font-bold text-gray-900'>Linked Accounts</h3>
        <span className='rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700'>
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </span>
      </div>

      {/* Grid of Small Account Cards */}
      <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        {accounts.map((account, index) => (
          <div
            key={index}
            onClick={() => onViewTransactions?.(index)}
            className={`group rounded-lg border border-gray-200 bg-white p-2 transition-all ${
              onViewTransactions
                ? 'cursor-pointer hover:border-indigo-300 hover:shadow-sm'
                : ''
            }`}
          >
            {/* Bank Name & Icon */}
            <div className='mb-1.5 flex items-center gap-1.5'>
              <div className='flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-indigo-100 to-purple-100'>
                <svg className='h-3 w-3 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                </svg>
              </div>
              <div className='flex-1 min-w-0'>
                <h4 className='truncate text-xs font-bold text-gray-900'>
                  {account.bank_name || account.institution || 'Unknown Bank'}
                </h4>
                <p className='truncate text-[10px] text-gray-500'>
                  {account.type || 'N/A'} {account.number && `• ${account.number.slice(-4)}`}
                </p>
              </div>
              {onViewTransactions && (
                <svg className='h-3.5 w-3.5 flex-shrink-0 text-gray-400 group-hover:text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              )}
            </div>

            {/* Key Stats - Compact */}
            <div className='grid grid-cols-3 gap-1 border-t border-gray-100 pt-1.5'>
              <div className='text-center'>
                <p className='text-[9px] text-gray-500'>Transactions</p>
                <p className='text-xs font-bold text-indigo-600'>
                  {account.total_transactions != null ? account.total_transactions : 'N/A'}
                </p>
              </div>
              <div className='text-center border-x border-gray-100'>
                <p className='text-[9px] text-gray-500'>Income</p>
                <p className='text-xs font-bold text-emerald-600'>
                  {account.statistics?.income_net != null
                    ? formatCurrency(account.statistics.income_net).replace(/[^0-9Kk]/g, '')
                    : 'N/A'}
                </p>
              </div>
              <div className='text-center'>
                <p className='text-[9px] text-gray-500'>NSF</p>
                <p className='text-xs font-bold text-amber-600'>
                  {account.statistics?.nsf?.all_time != null
                    ? account.statistics.nsf?.all_time
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
