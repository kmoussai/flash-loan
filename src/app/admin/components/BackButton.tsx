'use client'

import { useRouter } from 'next/navigation'
import { sizes } from '../design-system'

interface BackButtonProps {
  href: string
  title?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-10 w-10'
}

const iconSizeClasses = {
  sm: sizes.icon.xs,
  md: sizes.icon.sm,
  lg: sizes.icon.md
}

export default function BackButton({
  href,
  title,
  size = 'md',
  className = ''
}: BackButtonProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(href)}
      className={`flex ${sizeClasses[size]} items-center justify-center rounded border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 ${className}`}
      title={title}
    >
      <svg
        className={iconSizeClasses[size]}
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M15 19l-7-7 7-7'
        />
      </svg>
    </button>
  )
}

