'use client'

interface IbvCardHeaderProps {
  reRequesting: boolean
  onReRequest: () => void
}

export default function IbvCardHeader({
  reRequesting,
  onReRequest
}: IbvCardHeaderProps) {
  return (
    <div className='bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm'>
            <svg
              className='h-4 w-4 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
              />
            </svg>
          </div>
          <div>
            <h2 className='text-base font-bold text-white'>IBV Verification</h2>
            <p className='mt-0.5 text-xs text-white/90'>
              Identity & Bank Verification
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={onReRequest}
            disabled={reRequesting}
            className='rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50'
            title='Generate a new bank verification request'
          >
            {reRequesting ? (
              <span className='flex items-center gap-1.5'>
                <svg
                  className='h-3 w-3 animate-spin'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  />
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  />
                </svg>
                Requesting...
              </span>
            ) : (
              <span className='flex items-center gap-1'>
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
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                Re-request IBV
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
