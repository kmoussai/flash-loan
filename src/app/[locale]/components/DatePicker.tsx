'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { DayPicker, DateRange } from 'react-day-picker'
import * as Popover from '@radix-ui/react-popover'
import { parseLocalDate, isHoliday } from '@/src/lib/utils/date'
import 'react-day-picker/dist/style.css'

export interface DatePickerProps {
  value?: string // ISO date string (YYYY-MM-DD)
  onChange: (date: string | undefined) => void
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  placeholder?: string
  holidays?: Date[] // Array of holiday dates to highlight
  employmentPayDates?: string[] // Array of ISO date strings for employment pay dates
  className?: string
  required?: boolean
  id?: string
  name?: string
}

export default function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder = 'Select a date',
  holidays = [],
  employmentPayDates = [],
  className = '',
  required = false,
  id,
  name
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDate = value ? parseLocalDate(value) : undefined

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd')
      onChange(dateString)
      setOpen(false)
    } else {
      onChange(undefined)
    }
  }


  // Convert holidays to Date objects and create modifiers
  const holidayDates = holidays.map(h => {
    const date = h instanceof Date ? h : parseLocalDate(h)
    date.setHours(0, 0, 0, 0)
    return date
  })

  // Convert employment pay dates to Date objects
  const employmentPayDateObjects = employmentPayDates.map(dateString => {
    const date = parseLocalDate(dateString)
    date.setHours(0, 0, 0, 0)
    return date
  })

  // Custom modifiers for react-day-picker
  const modifiers = {
    holiday: holidayDates,
    employmentPayDate: employmentPayDateObjects
  }

  const modifiersClassNames = {
    holiday: 'rdp-day_holiday',
    employmentPayDate: 'rdp-day_employment-pay-date'
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          id={id}
          name={name}
          disabled={disabled}
          aria-required={required}
          className={`flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${className}`}
        >
          <span className={selectedDate ? 'text-gray-900' : 'text-gray-500'}>
            {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : placeholder}
          </span>
          <svg
            className='ml-2 h-4 w-4 text-gray-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            />
          </svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className='z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-lg'
          align='start'
          sideOffset={5}
        >
          <DayPicker
            mode='single'
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={disabled}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            fromDate={minDate}
            toDate={maxDate}
            className='rdp'
            classNames={{
              months:
                'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
              month: 'space-y-4',
              caption: 'flex justify-center pt-1 relative items-center',
              caption_label: 'text-sm font-medium text-gray-900',
              nav: 'space-x-1 flex items-center',
              nav_button:
                'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse space-y-1',
              head_row: 'flex',
              head_cell:
                'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
              row: 'flex w-full mt-2',
              cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-50 [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
              day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
              day_range_end: 'day-range-end',
              day_selected:
                'bg-indigo-600 text-white hover:bg-indigo-700 focus:bg-indigo-700',
              day_today: 'bg-gray-100 text-gray-900',
              day_outside:
                'day-outside text-gray-400 opacity-50 aria-selected:bg-gray-50 aria-selected:text-gray-400 aria-selected:opacity-30',
              day_disabled: 'text-gray-400 opacity-50',
              day_range_middle:
                'aria-selected:bg-gray-100 aria-selected:text-gray-900',
              day_hidden: 'invisible'
            }}
            components={{
              IconLeft: () => (
                <svg
                  className='h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 19l-7-7 7-7'
                  />
                </svg>
              ),
              IconRight: () => (
                <svg
                  className='h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              )
            }}
          />
          {(holidays.length > 0 || employmentPayDates.length > 0) && (
            <div className='mt-3 space-y-3 border-t border-gray-200 pt-3'>
              {employmentPayDates.length > 0 && (
                <div className='flex items-center gap-1'>
                  <span className='text-xs font-medium text-gray-700'>
                    💰 :
                  </span>
                  <p className='text-center text-xs font-medium text-gray-700'>
                    Client Pay Dates
                  </p>
                </div>
              )}
              {holidays.length > 0 && (
                <div className='flex items-center gap-1'>
                  <span className='text-xs font-medium text-gray-700'>★ :</span>
                  <p className='text-center text-xs font-medium text-gray-700'>
                    Holidays
                  </p>
                </div>
              )}
            </div>
          )}
          <Popover.Arrow className='fill-white' />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
