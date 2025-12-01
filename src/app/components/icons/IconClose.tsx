import * as React from 'react'
import type { IconProps } from './types'

export function IconClose(props: IconProps) {
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
      <path d='M6 18L18 6M6 6l12 12' />
    </svg>
  )
}


