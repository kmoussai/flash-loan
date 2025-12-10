'use client'

interface IbvCardStatusCardsProps {
  ibvProvider: string | null
  requestGuid: string | null | undefined
}

export default function IbvCardStatusCards({
  ibvProvider,
  requestGuid
}: IbvCardStatusCardsProps) {
  return (
    <div className='flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-1.5'>
      <div className='flex items-center gap-1.5'>
        <span className='text-[10px] font-medium text-gray-500'>Provider:</span>
        <span className='text-[10px] font-semibold capitalize text-gray-900'>
          {ibvProvider ? String(ibvProvider) : 'N/A'}
        </span>
      </div>
      <span className='text-gray-300'>•</span>
      <div className='flex items-center gap-1.5'>
        <span className='text-[10px] font-medium text-gray-500'>ID:</span>
        <span className='font-mono text-[10px] font-semibold text-gray-900'>
          {requestGuid?.slice(0, 8) || 'N/A'}
        </span>
      </div>
    </div>
  )
}
