'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import type { LoanDetailsResponse } from '../types'

interface BorrowerTabProps {
  loanId: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function BorrowerTab({ loanId }: BorrowerTabProps) {
  const router = useRouter()
  const { data, error, isLoading } = useSWR<LoanDetailsResponse>(
    `/api/admin/loans/${loanId}`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600'></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='rounded-xl border border-red-200 bg-red-50 p-6'>
        <p className='text-sm text-red-600'>Failed to load borrower information</p>
      </div>
    )
  }

  const borrower = data?.loan.users
  const borrowerName = borrower
    ? `${borrower.first_name || ''} ${borrower.last_name || ''}`.trim() || 'N/A'
    : 'N/A'

  if (!borrower) {
    return (
      <div className='rounded-xl border border-gray-200 bg-white p-6'>
        <p className='text-sm text-gray-500'>Borrower information not available</p>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4'>
          <h3 className='text-lg font-bold text-gray-900'>Borrower Information</h3>
        </div>
        <div className='grid gap-6 p-6 md:grid-cols-2'>
          <div>
            <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
              Full Name
            </label>
            {borrower.id ? (
              <button
                onClick={() => router.push(`/admin/clients/${borrower.id}`)}
                className='mt-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline'
              >
                {borrowerName}
              </button>
            ) : (
              <p className='mt-1 text-sm font-medium text-gray-900'>{borrowerName}</p>
            )}
          </div>
          <div>
            <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
              Email
            </label>
            <p className='mt-1 text-sm font-medium text-gray-900'>
              {borrower.email || 'N/A'}
            </p>
          </div>
          <div>
            <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
              Phone
            </label>
            <p className='mt-1 text-sm font-medium text-gray-900'>
              {borrower.phone || 'N/A'}
            </p>
          </div>
          <div>
            <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
              Preferred Language
            </label>
            <p className='mt-1 text-sm font-medium text-gray-900 capitalize'>
              {borrower.preferred_language || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

