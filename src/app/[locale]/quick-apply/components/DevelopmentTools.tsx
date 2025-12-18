'use client'

interface DevelopmentToolsProps {
  onFillRandomData: () => void
  onResetForm: () => void
}

export default function DevelopmentTools({
  onFillRandomData,
  onResetForm
}: DevelopmentToolsProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (!isDevelopment) {
    return null
  }

  return (
    <div className='mb-6 flex flex-col justify-center gap-3 sm:flex-row'>
      <button
        onClick={onFillRandomData}
        className='rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg'
      >
        🎲 Fill Random Data
      </button>
      <button
        onClick={onResetForm}
        className='rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg'
      >
        🔄 Reset Form
      </button>
    </div>
  )
}

