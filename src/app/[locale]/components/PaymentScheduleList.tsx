import React from 'react'
import { PayementScheduleItem } from '../../types/contract'

type PaymentStatus =
  | 'paid'
  | 'upcoming'
  | 'overdue'
  | 'processing'
  | 'cancelled'

export interface PaymentScheduleListProps {
  schedule: PayementScheduleItem[]
  locale?: string
  currency?: string
  className?: string
  emptyStateLabel?: string
  height?: string | number
}

const PaymentScheduleList: React.FC<PaymentScheduleListProps> = ({
  schedule,
  locale = 'en-CA',
  currency = 'CAD',
  className = '',
  emptyStateLabel = 'No payments scheduled yet.',
  height
}) => {
  let currencyFormatter: Intl.NumberFormat | null = null
  let dateFormatter: Intl.DateTimeFormat | null = null

  try {
    currencyFormatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    })
  } catch (error) {
    console.error(
      'PaymentScheduleList: unable to initialize currency formatter',
      error
    )
  }

  try {
    dateFormatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'long'
    })
  } catch (error) {
    console.error(
      'PaymentScheduleList: unable to initialize date formatter',
      error
    )
  }

  const formatCurrency = (value: number): string => {
    if (!Number.isFinite(value)) {
      return '—'
    }

    try {
      return currencyFormatter?.format(value) ?? value.toFixed(2)
    } catch (error) {
      console.error(
        'PaymentScheduleList: error formatting currency value',
        error
      )
      return value.toFixed(2)
    }
  }

  const formatDate = (value: string | Date): string => {
    const date =
      typeof value === 'string'
        ? Number.isNaN(Date.parse(value))
          ? null
          : new Date(value)
        : value

    if (!date) {
      return '—'
    }

    try {
      return dateFormatter?.format(date) ?? date.toISOString().split('T')[0]
    } catch (error) {
      console.error('PaymentScheduleList: error formatting date value', error)
      return date.toISOString().split('T')[0]
    }
  }

  if (!schedule.length) {
    return (
      <div
        className={`border-border/60 rounded-lg border border-dashed bg-background px-6 py-8 text-center text-sm text-text-secondary ${className}`}
      >
        {emptyStateLabel}
      </div>
    )
  }

  const resolvedHeight = typeof height === 'number' ? `${height}px` : height

  const containerStyles = resolvedHeight
    ? ({ maxHeight: resolvedHeight } as React.CSSProperties)
    : undefined

  return (
    <div
      className={`border-border/40 rounded-lg border bg-background ${className}`}
      style={containerStyles}
    >
      <div className='overflow-hidden rounded-lg text-sm'>
        <div className='border-border/40 bg-background-secondary/60 grid grid-cols-[auto_auto_1fr] items-center gap-x-4 border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
          <span>#</span>
          <span>Due Date</span>
          <span className='text-right'>Amount</span>
        </div>
        <div
          className='divide-border/30 divide-y'
          style={
            resolvedHeight
              ? {
                  overflowY: 'auto'
                }
              : undefined
          }
        >
          {schedule.map((item, index) => {
            const key = new Date(item.due_date).toISOString() + index.toString()

            return (
              <div
                key={key}
                className={`grid grid-cols-[auto_auto_1fr] items-center gap-x-4 px-4 py-3`}
              >
                <span className='text-xs font-semibold text-text-secondary'>
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <span className='text-sm text-text-secondary'>
                  {formatDate(item.due_date)}
                </span>
                <span className='text-right text-sm font-semibold text-primary'>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PaymentScheduleList
