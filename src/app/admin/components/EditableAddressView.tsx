'use client'

import { useState, useRef, useEffect } from 'react'
import type { AddressType, AddressUpdate } from '@/src/lib/supabase/types'
import AddressView, { type AddressDisplay } from './AddressView'
import Select from '@/src/app/[locale]/components/Select'

interface EditableAddressViewProps {
  address: AddressDisplay
  onUpdate: (addressId: string, updates: AddressUpdate) => Promise<void>
  onDelete?: (addressId: string) => Promise<void>
  showMovingDate?: boolean
  className?: string
  variant?: 'blue' | 'purple'
}

const CANADIAN_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon'
]

const ADDRESS_TYPES: { value: AddressType; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'previous', label: 'Previous' },
  { value: 'mailing', label: 'Mailing' },
  { value: 'work', label: 'Work' }
]

export default function EditableAddressView({
  address,
  onUpdate,
  onDelete,
  showMovingDate = true,
  className = '',
  variant = 'blue'
}: EditableAddressViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editFormRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    address_type: (address.address_type as string) || 'current',
    street_number: address.street_number || '',
    street_name: address.street_name || '',
    apartment_number: address.apartment_number || '',
    city: address.city || '',
    province: address.province || '',
    postal_code: address.postal_code || '',
    moving_date: address.moving_date ? address.moving_date.split('T')[0] : '',
    is_current: address.is_current ?? false
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  // Scroll edit form into view when editing starts
  useEffect(() => {
    if (isEditing && editFormRef.current) {
      setTimeout(() => {
        editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [isEditing])

  const handleSave = async () => {
    setError(null)
    setLoading(true)

    try {
      const updates: AddressUpdate = {
        street_number: formData.street_number || undefined,
        street_name: formData.street_name || undefined,
        apartment_number: formData.apartment_number || undefined,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postal_code,
        moving_date: formData.moving_date || undefined,
        is_current: formData.is_current
      }

      await onUpdate(address.id, updates)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update address')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form to original values
    setFormData({
      address_type: (address.address_type as string) || 'current',
      street_number: address.street_number || '',
      street_name: address.street_name || '',
      apartment_number: address.apartment_number || '',
      city: address.city || '',
      province: address.province || '',
      postal_code: address.postal_code || '',
      moving_date: address.moving_date ? address.moving_date.split('T')[0] : '',
      is_current: address.is_current ?? false
    })
    setError(null)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to delete this address?')) return

    setLoading(true)
    try {
      await onDelete(address.id)
    } catch (err: any) {
      setError(err.message || 'Failed to delete address')
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <div ref={editFormRef} className={`rounded-xl border-2 border-blue-300 bg-white p-4 shadow-md ${className}`}>
        {error && (
          <div className='mb-4 rounded-lg bg-red-50 border border-red-200 p-2'>
            <p className='text-xs text-red-600'>{error}</p>
          </div>
        )}

        <div className='space-y-2.5'>
          {/* Street Number and Name */}
          <div className='grid grid-cols-3 gap-2'>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>
                Street #
              </label>
              <input
                type='text'
                value={formData.street_number}
                onChange={(e) => handleInputChange('street_number', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='123'
                disabled={loading}
              />
            </div>
            <div className='col-span-2'>
              <label className='mb-1 block text-xs font-medium text-gray-700'>
                Street Name <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                required
                value={formData.street_name}
                onChange={(e) => handleInputChange('street_name', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='Main Street'
                disabled={loading}
              />
            </div>
          </div>

          {/* Apartment Number */}
          <div>
            <label className='mb-1 block text-xs font-medium text-gray-700'>
              Apartment Number
            </label>
            <input
              type='text'
              value={formData.apartment_number}
              onChange={(e) => handleInputChange('apartment_number', e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              placeholder='Apt 4B'
              disabled={loading}
            />
          </div>

          {/* City, Province, Postal Code */}
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>
                City <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                required
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='Montreal'
                disabled={loading}
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>
                Province <span className='text-red-500'>*</span>
              </label>
              <div className='[&_button]:!py-1 [&_button]:!px-2 [&_button]:text-sm'>
                <Select
                  value={formData.province || ''}
                  onValueChange={(value) => handleInputChange('province', value)}
                  placeholder='Select Province'
                  options={CANADIAN_PROVINCES.map((province) => ({
                    value: province,
                    label: province
                  }))}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Postal Code and Moving Date */}
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>
                Postal Code <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                required
                value={formData.postal_code}
                onChange={(e) => {
                  // Format postal code: A1A 1A1
                  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
                  if (value.length > 3 && !value.includes(' ')) {
                    value = value.slice(0, 3) + ' ' + value.slice(3)
                  }
                  handleInputChange('postal_code', value)
                }}
                className='w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='H1A 1A1'
                maxLength={7}
                disabled={loading}
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-700'>
                Moving Date
              </label>
              <input
                type='date'
                value={formData.moving_date}
                onChange={(e) => handleInputChange('moving_date', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                disabled={loading}
              />
            </div>
          </div>

          {/* Is Current Checkbox */}
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id={`is_current_${address.id}`}
              checked={formData.is_current}
              onChange={(e) => handleInputChange('is_current', e.target.checked)}
              className='h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              disabled={loading}
            />
            <label htmlFor={`is_current_${address.id}`} className='text-xs font-medium text-gray-700'>
              Set as current address
            </label>
          </div>

          {/* Actions */}
          <div className='flex items-center justify-end gap-2 pt-2 border-t border-gray-200'>
            <button
              type='button'
              onClick={handleCancel}
              className='px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              disabled={loading}
            >
              Cancel
            </button>
            {onDelete && (
              <button
                type='button'
                onClick={handleDelete}
                className='px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors'
                disabled={loading}
              >
                Delete
              </button>
            )}
            <button
              type='button'
              onClick={handleSave}
              className='px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1'
              disabled={loading}
            >
              {loading && (
                <svg className='h-3 w-3 animate-spin' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                </svg>
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='relative group'>
      <AddressView
        address={address}
        showMovingDate={showMovingDate}
        className={className}
        variant={variant}
      />
      <button
        type='button'
        onClick={() => setIsEditing(true)}
        className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white border border-gray-300 shadow-sm hover:bg-gray-50 hover:border-blue-300'
        title='Edit address'
      >
        <svg className='h-4 w-4 text-gray-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
          />
        </svg>
      </button>
    </div>
  )
}

