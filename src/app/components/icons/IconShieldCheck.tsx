import * as React from 'react'
import type { IconProps } from './types'

export function IconShieldCheck(props: IconProps) {
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
      <path d='M12 2l7 4v6c0 4.418-3.134 8-7 8s-7-3.582-7-8V6l7-4z' />
      <path d='M9 12l2 2 4-4' />
    </svg>
  )
}


