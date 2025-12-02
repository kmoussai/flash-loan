'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { PayementScheduleItem } from '@/src/types'
import DatePicker from './DatePicker'
import { format } from 'date-fns'
import { getCanadianHolidaysWithNames, type Holiday } from '@/src/lib/utils/date'

export interface EditablePaymentScheduleListProps {
  schedule: PayementScheduleItem[]
  onScheduleChange: (schedule: PayementScheduleItem[]) => void
  locale?: string
  currency?: string
  className?: string
  holidays?: Date[]
  minDate?: Date
}

const EditablePaymentScheduleList: React.FC<EditablePaymentScheduleListProps> = ({
  schedule: initialSchedule,
  onScheduleChange,
  locale = 'en-CA',
  currency = 'CAD',
  className = '',
  holidays = [],
  minDate
}) => {
  const [schedule, setSchedule] = useState<PayementScheduleItem[]>(initialSchedule)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Get holidays with names for tooltip display
  const holidaysWithNames = useMemo(() => {
    if (holidays && holidays.length > 0) {
      // If holidays are provided as Date[], try to match with named holidays
      const namedHolidays = getCanadianHolidaysWithNames()
      return holidays.map(holidayDate => {
        const holiday = new Date(holidayDate)
        holiday.setHours(0, 0, 0, 0)
        const match = namedHolidays.find(h => {
          const hDate = new Date(h.date)
          hDate.setHours(0, 0, 0, 0)
          return (
            holiday.getDate() === hDate.getDate() &&
            holiday.getMonth() === hDate.getMonth() &&
            holiday.getFullYear() === hDate.getFullYear()
          )
        })
        return match || { date: holidayDate, name: 'Holiday' }
      })
    }
    return []
  }, [holidays])

  // Update local schedule when prop changes
  useEffect(() => {
    setSchedule(initialSchedule)
  }, [initialSchedule])

  const formatCurrency = (value: number): string => {
    if (!Number.isFinite(value)) {
      return '—'
    }

    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      })
      return formatter.format(value)
    } catch (error) {
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
      return format(date, 'MMM dd, yyyy')
    } catch (error) {
      return date.toISOString().split('T')[0]
    }
  }

  // Check if a date is a holiday
  const isHoliday = (dateString: string): boolean => {
    if (!holidays || holidays.length === 0) return false
    
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    
    return holidays.some(holiday => {
      const holidayDate = new Date(holiday)
      holidayDate.setHours(0, 0, 0, 0)
      return (
        date.getDate() === holidayDate.getDate() &&
        date.getMonth() === holidayDate.getMonth() &&
        date.getFullYear() === holidayDate.getFullYear()
      )
    })
  }

  // Get holiday name for a date
  const getHolidayName = (dateString: string): string | null => {
    if (!isHoliday(dateString)) return null
    
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    
    const match = holidaysWithNames.find(h => {
      const hDate = new Date(h.date)
      hDate.setHours(0, 0, 0, 0)
      return (
        date.getDate() === hDate.getDate() &&
        date.getMonth() === hDate.getMonth() &&
        date.getFullYear() === hDate.getFullYear()
      )
    })
    
    return match ? match.name : 'Holiday'
  }

  // Get holiday message for tooltip
  const getHolidayMessage = (dateString: string): string => {
    const holidayName = getHolidayName(dateString)
    if (!holidayName) return ''
    return `⚠️ ${holidayName} - This payment date falls on a holiday. Please adjust the date.`
  }

  const handleDateChange = (index: number, newDate: string | undefined) => {
    if (!newDate) return

    const updatedSchedule = [...schedule]
    updatedSchedule[index] = {
      ...updatedSchedule[index],
      due_date: newDate
    }
    setSchedule(updatedSchedule)
    onScheduleChange(updatedSchedule)
    setEditingIndex(null)
  }

  const handleEditClick = (index: number) => {
    setEditingIndex(index)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
  }

  if (!schedule.length) {
    return (
      <div
        className={`border-border/60 rounded-lg border border-dashed bg-background px-6 py-8 text-center text-sm text-text-secondary ${className}`}
      >
        No payments scheduled yet.
      </div>
    )
  }

  return (
    <div
      className={`border-border/40 rounded-lg border bg-background ${className}`}
    >
      <div className='overflow-hidden rounded-lg text-sm'>
        <div className={`border-border/40 bg-background-secondary/60 relative z-0 grid items-center gap-x-4 border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary ${
          schedule.some(item => item.interest !== undefined || item.principal !== undefined)
            ? 'grid-cols-[auto_1fr_auto_auto_auto_1fr]'
            : 'grid-cols-[auto_1fr_auto_1fr]'
        }`}>
          <span>#</span>
          <span>Due Date</span>
          <span className='text-right'>Amount</span>
          {schedule.some(item => item.interest !== undefined || item.principal !== undefined) && (
            <>
              <span className='text-right'>Interest</span>
              <span className='text-right'>Principal</span>
            </>
          )}
          <span className='text-right'>Actions</span>
        </div>
        <div className='divide-border/30 relative max-h-[300px] divide-y overflow-y-auto'>
          {schedule.map((item, index) => {
            const key = new Date(item.due_date).toISOString() + index.toString()
            const isEditing = editingIndex === index

            return (
              <div
                key={key}
                className={`grid items-center gap-x-4 px-4 py-3 hover:bg-gray-50 ${
                  isEditing ? 'bg-blue-50' : ''
                } ${
                  item.interest !== undefined || item.principal !== undefined
                    ? 'grid-cols-[auto_1fr_auto_auto_auto_1fr]'
                    : 'grid-cols-[auto_1fr_auto_1fr]'
                }`}
              >
                <span className='text-xs font-semibold text-text-secondary'>
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                {isEditing ? (
                  <div className='flex items-center gap-2'>
                    <DatePicker
                      value={item.due_date}
                      onChange={(date) => handleDateChange(index, date)}
                      minDate={minDate}
                      holidays={holidays}
                      placeholder='Select date'
                      className='w-full max-w-[200px]'
                    />
                    <button
                      type='button'
                      onClick={handleCancelEdit}
                      className='rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200'
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className='flex items-center gap-2'>
                    <span className='text-sm text-text-secondary'>
                      {formatDate(item.due_date)}
                    </span>
                    {isHoliday(item.due_date) && (
                      <div className='group relative inline-flex'>
                        <svg
                          className='h-4 w-4 text-amber-500 flex-shrink-0'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                          aria-label='Holiday warning'
                        >
                          <path
                            fillRule='evenodd'
                            d='M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z'
                            clipRule='evenodd'
                          />
                        </svg>
                        <div className='invisible absolute top-full left-1/2 mt-2 -translate-x-1/2 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100 z-[99999] pointer-events-none'>
                          <div className='text-center'>{getHolidayMessage(item.due_date)}</div>
                          <div className='absolute left-1/2 bottom-full -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900'></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <span className='text-right text-sm font-semibold text-primary'>
                  {formatCurrency(item.amount)}
                </span>
                {(item.interest !== undefined || item.principal !== undefined) && (
                  <>
                    <span className='text-right text-xs text-text-secondary'>
                      {item.interest !== undefined ? formatCurrency(item.interest) : '—'}
                    </span>
                    <span className='text-right text-xs text-text-secondary'>
                      {item.principal !== undefined ? formatCurrency(item.principal) : '—'}
                    </span>
                  </>
                )}
                <div className='flex justify-end'>
                  {!isEditing && (
                    <button
                      type='button'
                      onClick={() => handleEditClick(index)}
                      className='rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50'
                      title='Edit date'
                    >
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
                          d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className='border-t border-gray-200 bg-gray-50 px-4 py-2'>
        <p className='text-xs text-gray-500'>
          Click the edit icon to modify individual payment dates. Changes are saved automatically.
        </p>
      </div>
    </div>
  )
}

export default EditablePaymentScheduleList

