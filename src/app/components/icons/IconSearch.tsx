import * as React from 'react'
import type { IconProps } from './types'

export function IconSearch(props: IconProps) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      {...props}
    >
      <circle cx='11' cy='11' r='7' />
      <path d='M16 16l5 5' />
    </svg>
  )
}


