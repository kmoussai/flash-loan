'use client'

import type { AddressType } from '@/src/lib/supabase/types'

// Display-only address type that matches API responses
// This is more flexible than the full Address type from the database
export interface AddressDisplay {
  id: string
  address_type: AddressType | string | null
  street_number: string | null
  street_name: string | null
  apartment_number: string | null
  city: string
  province: string
  postal_code: string
  moving_date: string | null
  is_current: boolean | null
  created_at?: string
  updated_at?: string
  client_id?: string
  verified_at?: string | null
  rent_cost?: number | null
}

type AddressVariant = 'blue' | 'purple'

interface AddressViewProps {
  address: AddressDisplay
  showMovingDate?: boolean
  className?: string
  variant?: AddressVariant
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getAddressTypeLabel = (addressType: AddressType | string | null, isCurrent: boolean | null) => {
  if (isCurrent) {
    return 'Current Address'
  }
  if (!addressType) {
    return 'Address'
  }
  return addressType.charAt(0).toUpperCase() + addressType.slice(1).replace('-', ' ')
}

export default function AddressView({
  address,
  showMovingDate = true,
  className = '',
  variant = 'blue'
}: AddressViewProps) {
  const iconBgClass =
    variant === 'purple'
      ? 'bg-gradient-to-br from-purple-100 to-pink-100'
      : 'bg-gradient-to-br from-blue-100 to-indigo-100'
  const iconColorClass = variant === 'purple' ? 'text-purple-600' : 'text-blue-600'
  const borderHoverClass =
    variant === 'purple'
      ? 'hover:border-purple-300'
      : 'hover:border-blue-300'
  const streetAddress = [
    address.street_number,
    address.street_name
  ]
    .filter(Boolean)
    .join(' ')

  const fullAddress = [
    streetAddress,
    address.apartment_number ? `Apt ${address.apartment_number}` : null,
    `${address.city}, ${address.province} ${address.postal_code}`
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className={`group/item relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all ${borderHoverClass} hover:shadow-md ${className}`}
    >
      <div className='flex items-start gap-3'>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgClass} flex-shrink-0`}>
          <svg className={`h-5 w-5 ${iconColorClass}`} fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
            />
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
            />
          </svg>
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <h4 className='font-semibold text-gray-900 text-sm'>
              {address.is_current ? (
                <span className='inline-flex items-center gap-1.5'>
                  {getAddressTypeLabel(address.address_type, address.is_current)}
                  <span className='inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'>
                    Active
                  </span>
                </span>
              ) : (
                getAddressTypeLabel(address.address_type, address.is_current ?? false)
              )}
            </h4>
          </div>
          <p className='text-sm text-gray-600'>{streetAddress || 'N/A'}</p>
          <p className='text-sm text-gray-600'>
            {`${address.city}, ${address.province} ${address.postal_code}`}
          </p>
          {showMovingDate && address.moving_date && (
            <div className='mt-2 flex items-center gap-2 text-xs text-gray-500'>
              <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
              <span>Moved in: {formatDate(address.moving_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

