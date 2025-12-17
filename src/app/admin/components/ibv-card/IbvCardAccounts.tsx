'use client'

import { useState } from 'react'
import { IBVSummary } from '../../../api/inverite/fetch/[guid]/types'
import { formatCurrency } from './types'

interface IbvCardAccountsProps {
  accounts: IBVSummary['accounts']
  clientId?: string
  onViewTransactions?: (accountIndex?: number) => void
}

export default function IbvCardAccounts({
  accounts,
  clientId,
  onViewTransactions
}: IbvCardAccountsProps) {
  const [settingMainAccount, setSettingMainAccount] = useState<number | null>(null)
  const [setMainError, setSetMainError] = useState<string | null>(null)

  const handleSetAsMain = async (accountIndex: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the view transactions action
    
    if (!clientId) {
      setSetMainError('Client ID is required')
      return
    }

    const account = accounts[accountIndex]
    if (!account) {
      setSetMainError('Account not found')
      return
    }

    setSettingMainAccount(accountIndex)
    setSetMainError(null)

    try {
      // Map IBV account to bank account format
      // Note: institution is the institution number (3 digits), not bank name
      const bankAccountData = {
        bank_name: account.bank_name || 'Unknown Bank',
        account_number: account.number || '',
        transit_number: account.transit || '',
        institution_number: account.institution || '',
        account_name: `${account.bank_name || 'Account'} ${account.type ? `- ${account.type}` : ''}`.trim() || 'Bank Account'
      }

      // Validate required fields
      if (!bankAccountData.account_number || !bankAccountData.transit_number || !bankAccountData.institution_number) {
        throw new Error('Account information is incomplete. Missing account number, transit number, or institution number.')
      }

      const response = await fetch(`/api/admin/clients/${clientId}/bank-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bankAccountData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set account as main')
      }

      // Success - show success message and refresh
      alert('Bank account set as main account successfully!')
      // Optionally reload the page or refresh data
      window.location.reload()
    } catch (err: any) {
      console.error('[IbvCardAccounts] Error setting main account:', err)
      setSetMainError(err.message || 'Failed to set account as main')
    } finally {
      setSettingMainAccount(null)
    }
  }
  return (
    <div>
      {setMainError && (
        <div className='mb-2 rounded-lg bg-red-50 border border-red-200 p-2'>
          <p className='text-xs text-red-600'>{setMainError}</p>
        </div>
      )}
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
              <div className='flex items-center gap-1'>
                {clientId && (
                  <button
                    onClick={(e) => handleSetAsMain(index, e)}
                    disabled={settingMainAccount === index}
                    className='flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                    title='Set as main account'
                  >
                    {settingMainAccount === index ? (
                      <svg className='h-3 w-3 animate-spin' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                      </svg>
                    ) : (
                      <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                      </svg>
                    )}
                    <span className='hidden sm:inline'>Set Main</span>
                  </button>
                )}
                {onViewTransactions && (
                  <svg className='h-3.5 w-3.5 flex-shrink-0 text-gray-400 group-hover:text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                  </svg>
                )}
              </div>
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
