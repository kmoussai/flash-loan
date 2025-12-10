'use client'

interface IbvCardDocumentProps {
  ibvDocUrl: string
}

export default function IbvCardDocument({ ibvDocUrl }: IbvCardDocumentProps) {
  return (
    <div className='mt-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-3 shadow-sm'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100'>
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
                d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
              />
            </svg>
          </div>
          <div>
            <p className='text-xs font-semibold text-gray-900'>IBV Document</p>
            <p className='mt-0.5 text-[10px] text-gray-500'>
              Bank verification document available
            </p>
          </div>
        </div>
        <a
          href={ibvDocUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-md'
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
              d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
            />
          </svg>
          Open Document
        </a>
      </div>
    </div>
  )
}
