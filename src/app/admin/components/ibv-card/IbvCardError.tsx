'use client'

interface IbvCardErrorProps {
  error: string
}

export default function IbvCardError({ error }: IbvCardErrorProps) {
  return (
    <div className='p-4'>
      <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
        <div className='flex items-start gap-2'>
          <svg
            className='mt-0.5 h-4 w-4 text-red-600'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <div>
            <p className='text-xs font-medium text-red-800'>
              Error loading data
            </p>
            <p className='mt-0.5 text-xs text-red-600'>{error}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
