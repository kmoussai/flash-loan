'use client'

import useSWR from 'swr'
import type { LoanPayment } from '@/src/lib/supabase/types'
import type { LoanDetailsResponse } from '../types'
import { formatCurrency, formatDate } from '../utils'

interface PaymentsTabProps {
  loanId: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function PaymentsTab({ loanId }: PaymentsTabProps) {
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
        <p className='text-sm text-red-600'>Failed to load payment history</p>
      </div>
    )
  }

  const payments = data?.payments || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4'>
          <h3 className='text-lg font-bold text-gray-900'>Payment History</h3>
        </div>
        <div className='overflow-x-auto'>
          {payments.length === 0 ? (
            <div className='p-8 text-center'>
              <p className='text-sm text-gray-500'>No payments recorded yet</p>
            </div>
          ) : (
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Payment Date
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Amount
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Method
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Status
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                    Transaction ID
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white'>
                {payments.map((payment: LoanPayment) => (
                  <tr key={payment.id} className='transition-colors hover:bg-gray-50'>
                    <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className='whitespace-nowrap px-4 py-2 text-sm font-semibold text-gray-900'>
                      {formatCurrency(parseFloat(payment.amount.toString()))}
                    </td>
                    <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-500'>
                      {payment.method || 'N/A'}
                    </td>
                    <td className='whitespace-nowrap px-4 py-2'>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadge(
                          payment.status
                        )}`}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className='whitespace-nowrap px-4 py-2 text-xs font-mono text-gray-500'>
                      {payment.accept_pay_transaction_id || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

