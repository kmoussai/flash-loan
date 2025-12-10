'use client'

import { IBVSummary } from '../../../api/inverite/fetch/[guid]/types'

interface IbvCardEmptyProps {
  summary: IBVSummary | null
}

export default function IbvCardEmpty({ summary }: IbvCardEmptyProps) {
  return (
    <div className='p-6'>
      <div className='text-center'>
        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100'>
          <svg
            className='h-6 w-6 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
          </svg>
        </div>
        <h3 className='mt-3 text-sm font-semibold text-gray-900'>
          No IBV Data Available
        </h3>
        <p className='mt-1.5 text-xs text-gray-500'>
          Fetch data to see account verification summary
        </p>
        {summary && (
          <details className='mt-4 text-left'>
            <summary className='cursor-pointer text-xs text-gray-400 hover:text-gray-600'>
              Show raw data
            </summary>
            <pre className='mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-4 text-xs'>
              {JSON.stringify(summary, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
