'use client'
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'

/**
 * Custom Select Component
 *
 * A styled select component using Radix UI primitives
 * - Works consistently across all browsers (including Safari)
 * - Matches the application's design system
 * - Fully accessible
 * - Supports keyboard navigation
 */

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  options: { value: string; label: string }[]
  disabled?: boolean
  className?: string
}

export default function Select({
  value,
  onValueChange,
  placeholder = 'Select an option',
  options,
  disabled = false,
  className = ''
}: SelectProps) {
  // Ensure value is a valid string that matches one of the options
  // Radix UI Select needs the value to match an option value exactly
  const validValue = React.useMemo(() => {
    if (!value || typeof value !== 'string') return ''
    // Check if value exists in options
    const optionExists = options.some(opt => opt.value === value)
    // Return the value if it exists, otherwise return empty string (which will show placeholder)
    return optionExists ? value : ''
  }, [value, options])

  // Inject styles to show scrollbar (override Radix's default hidden scrollbar)
  React.useEffect(() => {
    const styleId = 'radix-select-scrollbar-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      [data-radix-select-viewport]::-webkit-scrollbar {
        display: block !important;
        width: 8px !important;
      }
      [data-radix-select-viewport]::-webkit-scrollbar-track {
        background: rgb(243 244 246) !important;
        border-radius: 4px;
      }
      [data-radix-select-viewport]::-webkit-scrollbar-thumb {
        background: rgb(209 213 219) !important;
        border-radius: 4px !important;
      }
      [data-radix-select-viewport]::-webkit-scrollbar-thumb:hover {
        background: rgb(156 163 175) !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  return (
    <SelectPrimitive.Root
      value={validValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={`focus:ring-primary/20 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-background p-3 text-left text-primary transition-all hover:border-primary focus:border-primary focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className='ml-2'>
          <svg
            width='12'
            height='12'
            viewBox='0 0 12 12'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            className='text-primary'
          >
            <path
              d='M2.5 4.5L6 8L9.5 4.5'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className='rounded-lg border border-gray-300 bg-background shadow-lg'
          position='popper'
          sideOffset={5}
        >
          <SelectPrimitive.Viewport
            className='max-h-60 overflow-y-auto p-1'
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(209 213 219) rgb(243 244 246)'
            }}
          >
            {options.map(option => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className='hover:bg-primary/10 focus:bg-primary/10 relative flex cursor-pointer select-none items-center rounded-md px-8 py-2.5 text-sm text-primary outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
              >
                <SelectPrimitive.ItemIndicator className='absolute left-2 flex h-3.5 w-3.5 items-center justify-center'>
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 12 12'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                    className='text-primary'
                  >
                    <path
                      d='M10 3L4.5 8.5L2 6'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
