import * as React from 'react'
import type { IconProps } from './types'

export function IconKey(props: IconProps) {
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
      <circle cx='7' cy='17' r='3' />
      <path d='M10 17L21 6l-3-3L7 14' />
      <path d='M15 5l3 3' />
    </svg>
  )
}


