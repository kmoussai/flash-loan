'use client'
import clsx from 'clsx'

interface StepProgressProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export default function StepProgress({
  currentStep,
  totalSteps,
  className
}: StepProgressProps) {
  const percentage = Math.min(
    100,
    Math.max(0, Math.round((currentStep / totalSteps) * 100))
  )

  return (
    <div className={clsx('w-full', className)}>
      <div className='mb-3 flex items-center justify-between text-xs font-medium text-gray-600 sm:text-sm'>
        <span>
          Step {currentStep} of {totalSteps}
        </span>
        <span>{percentage}% Complete</span>
      </div>
      <div className='h-2 w-full rounded-full bg-gray-200'>
        <div
          className='h-2 rounded-full bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] transition-all duration-300'
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

