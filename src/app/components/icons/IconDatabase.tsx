import * as React from 'react'
import type { IconProps } from './types'

export function IconDatabase(props: IconProps) {
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
      <ellipse cx='12' cy='5' rx='9' ry='3' />
      <path d='M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5' />
      <path d='M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3' />
    </svg>
  )
}


