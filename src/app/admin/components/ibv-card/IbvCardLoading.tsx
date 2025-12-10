'use client'

export default function IbvCardLoading() {
  return (
    <div className='flex items-center justify-center p-8'>
      <div className='text-center'>
        <div className='mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600'></div>
        <p className='mt-3 text-xs text-gray-500'>Loading IBV data...</p>
      </div>
    </div>
  )
}
