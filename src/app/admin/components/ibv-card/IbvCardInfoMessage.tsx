'use client'

interface IbvCardInfoMessageProps {
  message: string
}

export default function IbvCardInfoMessage({
  message
}: IbvCardInfoMessageProps) {
  return (
    <div className='border-b border-amber-100 bg-amber-50 px-4 py-2.5'>
      <div className='flex items-start gap-2 text-amber-700'>
        <div className='flex h-7 w-7 items-center justify-center rounded-full bg-amber-100'>
          <svg
            className='h-4 w-4 text-amber-600'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 16h-1v-4h-1m1-4h.01M12 22a10 10 0 110-20 10 10 0 010 20z'
            />
          </svg>
        </div>
        <div>
          <p className='text-xs font-semibold text-amber-800'>
            Verification Pending
          </p>
          <p className='mt-0.5 text-xs text-amber-700/90'>{message}</p>
        </div>
      </div>
    </div>
  )
}
