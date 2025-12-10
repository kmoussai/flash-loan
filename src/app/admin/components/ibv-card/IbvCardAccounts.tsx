'use client'

import { useState } from 'react'
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
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0)

  return (
    <div>
      <div className='mb-3 flex items-center justify-between'>
        <h3 className='text-sm font-bold text-gray-900'>Linked Accounts</h3>
        <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700'>
          {currentAccountIndex + 1} / {accounts.length}
        </span>
      </div>

      {/* Slider Container */}
      <div className='relative'>
        {/* Navigation Buttons */}
        {accounts.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentAccountIndex(prev =>
                  prev > 0 ? prev - 1 : accounts.length - 1
                )
              }
              className='absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl disabled:opacity-50'
              aria-label='Previous account'
            >
              <svg
                className='h-4 w-4 text-gray-700'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
            </button>
            <button
              onClick={() =>
                setCurrentAccountIndex(prev =>
                  prev < accounts.length - 1 ? prev + 1 : 0
                )
              }
              className='absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl disabled:opacity-50'
              aria-label='Next account'
            >
              <svg
                className='h-4 w-4 text-gray-700'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </button>
          </>
        )}

        {/* Account Cards Slider */}
        <div className='relative overflow-hidden'>
          <div
            className='flex transition-transform duration-300 ease-in-out'
            style={{
              transform: `translateX(-${currentAccountIndex * 100}%)`
            }}
          >
            {accounts.map((account, index) => (
              <div key={index} className='w-full flex-shrink-0 px-2'>
                <div
                  onClick={() => onViewTransactions?.(index)}
                  className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 ${
                    onViewTransactions
                      ? 'cursor-pointer hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md'
                      : ''
                  }`}
                >
                  {/* Subtle gradient accent */}
                  <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'></div>

                  <div className='flex items-start justify-between gap-3'>
                    {/* Left: Bank Info */}
                    <div className='flex-1'>
                      <div className='mb-2 flex items-center gap-2'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100'>
                          <svg
                            className='h-4 w-4 text-indigo-600'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className='text-sm font-bold text-gray-900'>
                            {account.bank_name ||
                              account.institution ||
                              'Unknown Bank'}
                          </h4>
                          <div className='mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500'>
                            <span className='inline-flex items-center gap-1'>
                              <span className='font-medium'>
                                {account.type || 'N/A'}
                              </span>
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
                      <div className='mt-2 grid grid-cols-2 gap-2'>
                        {account.transit && (
                          <div>
                            <p className='text-[10px] font-medium text-gray-500'>
                              Transit
                            </p>
                            <p className='mt-0.5 text-xs font-semibold text-gray-900'>
                              {account.transit}
                            </p>
                          </div>
                        )}
                        {account.routing_code && (
                          <div>
                            <p className='text-[10px] font-medium text-gray-500'>
                              Routing
                            </p>
                            <p className='mt-0.5 font-mono text-xs font-semibold text-gray-900'>
                              {account.routing_code}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Transaction Count & Stats */}
                    <div className='flex flex-col items-end gap-2'>
                      {/* Transaction Count Badge */}
                      <div className='text-right'>
                        <p className='mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
                          Transactions
                        </p>
                        <div className='inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 px-2.5 py-1.5 shadow-md'>
                          <svg
                            className='h-3 w-3 text-white'
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
                          <span className='text-base font-bold text-white'>
                            {account.total_transactions != null
                              ? account.total_transactions
                              : 'N/A'}
                          </span>
                        </div>
                        {onViewTransactions && (
                          <p className='mt-1 text-[10px] font-medium text-indigo-600 group-hover:text-indigo-700'>
                            Click to view →
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Statistics Row - Prominent */}
                  <div className='mt-4 grid grid-cols-2 gap-2 border-t-2 border-gray-200 pt-3'>
                    <div className='rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg'>
                      <div className='mb-1 flex items-center gap-1.5'>
                        <svg
                          className='h-3 w-3 text-white'
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
                        <p className='text-[10px] font-semibold uppercase tracking-wide text-white/90'>
                          Income Net
                        </p>
                      </div>
                      <p className='text-base font-bold text-white'>
                        {account.statistics?.income_net != null
                          ? formatCurrency(account.statistics.income_net)
                          : 'N/A'}
                      </p>
                    </div>
                    <div className='rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 p-2.5 shadow-lg'>
                      <div className='mb-1 flex items-center gap-1.5'>
                        <svg
                          className='h-3 w-3 text-white'
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
                        <p className='text-[10px] font-semibold uppercase tracking-wide text-white/90'>
                          NSF (All Time)
                        </p>
                      </div>
                      <p className='text-base font-bold text-white'>
                        {account.statistics?.nsf?.all_time != null
                          ? account.statistics.nsf?.all_time
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* PDF Statements */}
                  {account.bank_pdf_statements &&
                    account.bank_pdf_statements.length > 0 && (
                      <div className='mt-3 border-t border-gray-100 pt-2.5'>
                        <div className='mb-1.5 flex items-center justify-between'>
                          <p className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
                            Bank Statements
                          </p>
                          <span className='rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700'>
                            {account.bank_pdf_statements.length}
                          </span>
                        </div>
                        <div className='flex flex-wrap gap-1.5'>
                          {account.bank_pdf_statements.map((pdf, pdfIndex) => (
                            <a
                              key={pdfIndex}
                              href={pdf}
                              target='_blank'
                              rel='noopener noreferrer'
                              onClick={e => e.stopPropagation()}
                              className='inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                            >
                              <svg
                                className='h-3 w-3'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                                />
                              </svg>
                              PDF {pdfIndex + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dot Indicators */}
        {accounts.length > 1 && (
          <div className='mt-4 flex justify-center gap-2'>
            {accounts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAccountIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentAccountIndex
                    ? 'w-8 bg-indigo-600'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to account ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
