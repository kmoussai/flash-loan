'use client'

import React from 'react'
import { sizes, spacing } from '../design-system'

interface RefreshButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: `${sizes.button.xs.padding} ${sizes.button.xs.text} ${spacing.gap.xs}`,
  md: `${sizes.button.md.padding} ${sizes.button.md.text} ${spacing.gap.sm}`,
  lg: `${sizes.button.lg.padding} ${sizes.button.lg.text} ${spacing.gap.sm}`
}

const iconSizeClasses = {
  sm: sizes.button.xs.icon,
  md: sizes.button.md.icon,
  lg: sizes.button.lg.icon
}

export default function RefreshButton({
  onClick,
  loading = false,
  disabled = false,
  size = 'md',
  className = ''
}: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center rounded border border-gray-300 bg-white font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 ${sizeClasses[size]} ${className}`}
      title={loading ? 'Refreshing...' : 'Refresh'}
    >
      <svg
        className={`${iconSizeClasses[size]} ${loading ? 'animate-spin' : ''}`}
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
        />
      </svg>
      <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
    </button>
  )
}

