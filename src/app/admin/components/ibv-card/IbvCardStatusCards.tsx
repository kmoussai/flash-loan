'use client'

import { IBVSummary } from '../../../api/inverite/fetch/[guid]/types'
import { getStatusColor } from './types'

interface IbvCardStatusCardsProps {
  ibvStatus: string | null
  ibvProvider: string | null
  requestGuid: string | null | undefined
}

export default function IbvCardStatusCards({
  ibvStatus,
  ibvProvider,
  requestGuid
}: IbvCardStatusCardsProps) {
  return (
    <div className='grid gap-3 md:grid-cols-3'>
      <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3 shadow-sm'>
        <div className='mb-1.5 flex items-center gap-1.5'>
          <svg
            className='h-3.5 w-3.5 text-gray-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
            Verification Status
          </label>
        </div>
        <p
          className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${getStatusColor(ibvStatus)}`}
        >
          {ibvStatus ? String(ibvStatus).toUpperCase() : 'UNKNOWN'}
        </p>
      </div>

      <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3 shadow-sm'>
        <div className='mb-1.5 flex items-center gap-1.5'>
          <svg
            className='h-3.5 w-3.5 text-gray-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'
            />
          </svg>
          <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
            IBV Provider
          </label>
        </div>
        <p className='mt-1.5 text-sm font-bold capitalize text-gray-900'>
          {ibvProvider ? String(ibvProvider) : 'N/A'}
        </p>
      </div>

      <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3 shadow-sm'>
        <div className='mb-1.5 flex items-center gap-1.5'>
          <svg
            className='h-3.5 w-3.5 text-gray-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 20l4-16m2 16l4-16M6 9h14M4 15h14'
            />
          </svg>
          <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
            Request ID
          </label>
        </div>
        <p className='mt-1.5 font-mono text-xs font-semibold text-gray-900'>
          {requestGuid?.slice(0, 8) || 'N/A'}
        </p>
      </div>
    </div>
  )
}
