'use client'

import useSWR from 'swr'
import type { LoanPaymentSchedule } from '@/src/lib/supabase/types'
import type { LoanDetailsResponse } from '../types'
import { formatCurrency, formatDate } from '../utils'

interface ScheduleTabProps {
  loanId: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ScheduleTab({ loanId }: ScheduleTabProps) {
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
        <p className='text-sm text-red-600'>Failed to load payment schedule</p>
      </div>
    )
  }

  const schedule = data?.paymentSchedule || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'collected':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'missed':
        return 'bg-orange-100 text-orange-800'
      case 'authorized':
        return 'bg-blue-100 text-blue-800'
      case 'scheduled':
        return 'bg-purple-100 text-purple-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4'>
          <h3 className='text-lg font-bold text-gray-900'>Payment Schedule</h3>
        </div>
        {schedule.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-sm text-gray-500'>No payment schedule available</p>
          </div>
        ) : (
          <div className='grid gap-4 p-6 md:grid-cols-2'>
            {schedule.map((item: LoanPaymentSchedule) => (
              <div
                key={item.id}
                className='rounded-lg border border-gray-200 bg-gray-50 p-4'
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-semibold text-gray-900'>
                      Payment #{item.payment_number}
                    </p>
                    <p className='text-xs text-gray-500'>
                      Due: {formatDate(item.scheduled_date)}
                    </p>
                    <p className='mt-1 text-sm font-medium text-gray-700'>
                      {formatCurrency(parseFloat(item.amount.toString()))}
                    </p>
                    {item.accept_pay_transaction_id && (
                      <p className='mt-1 text-xs font-mono text-gray-400'>
                        TXN: {item.accept_pay_transaction_id}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

