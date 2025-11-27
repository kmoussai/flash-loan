'use client'

import { useState, useEffect, useRef } from 'react'
import type { AddressUpdate } from '@/src/lib/supabase/types'
import { type AddressDisplay } from './AddressView'
import EditableAddressView from './EditableAddressView'

interface ClientInfo {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}

interface EditClientInfoModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientInfo: ClientInfo
  addresses?: AddressDisplay[]
  onSuccess?: () => void
}

export default function EditClientInfoModal({
  isOpen,
  onClose,
  clientId,
  clientInfo,
  addresses = [],
  onSuccess
}: EditClientInfoModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [localAddresses, setLocalAddresses] = useState<AddressDisplay[]>(addresses || [])

  // Populate form with existing client info
  useEffect(() => {
    if (clientInfo) {
      setFormData({
        first_name: clientInfo.first_name || '',
        last_name: clientInfo.last_name || '',
        email: clientInfo.email || '',
        phone: clientInfo.phone || ''
      })
    }
    setError(null)
  }, [clientInfo, isOpen])

  // Update local addresses when addresses prop changes
  useEffect(() => {
    setLocalAddresses(addresses || [])
  }, [addresses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/info`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update client information')
      }

      // Success - close modal and refresh
      onClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating client information')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddressUpdate = async (addressId: string, updates: AddressUpdate) => {
    const response = await fetch(`/api/admin/clients/${clientId}/addresses/${addressId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update address')
    }

    // Update local state with the updated address
    if (data.data) {
      setLocalAddresses((prev) =>
        prev.map((addr) => {
          if (addr.id === addressId) {
            // Update the edited address
            return {
              ...addr,
              ...data.data,
              // Ensure all fields are properly mapped
              street_number: data.data.street_number,
              street_name: data.data.street_name,
              apartment_number: data.data.apartment_number,
              city: data.data.city,
              province: data.data.province,
              postal_code: data.data.postal_code,
              moving_date: data.data.moving_date,
              is_current: data.data.is_current ?? false
            }
          } else {
            // If this address was set as current, mark others as not current
            return {
              ...addr,
              is_current: updates.is_current === true ? false : addr.is_current
            }
          }
        })
      )
    }
  }

  const handleAddressDelete = async (addressId: string) => {
    const response = await fetch(`/api/admin/clients/${clientId}/addresses/${addressId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete address')
    }

    // Remove address from local state
    setLocalAddresses((prev) => prev.filter((addr) => addr.id !== addressId))
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'>
      <div className='w-full max-w-4xl max-h-[95vh] rounded-lg bg-white shadow-xl flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <h2 className='text-xl font-bold text-gray-900'>Edit Client Information</h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors'
            disabled={loading}
          >
            <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className='flex-1 overflow-y-auto'>
          <form ref={formRef} onSubmit={handleSubmit} className='p-6'>
            {error && (
              <div className='mb-4 rounded-lg bg-red-50 border border-red-200 p-3'>
                <p className='text-sm text-red-600'>{error}</p>
              </div>
            )}

            <div className='space-y-4'>
              {/* First Name */}
              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  First Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  required
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                  placeholder='First name'
                  disabled={loading}
                />
              </div>

              {/* Last Name */}
              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Last Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  required
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                  placeholder='Last name'
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Email <span className='text-red-500'>*</span>
                </label>
                <input
                  type='email'
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                  placeholder='email@example.com'
                  disabled={loading}
                />
              </div>

              {/* Phone */}
              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  Phone <span className='text-red-500'>*</span>
                </label>
                <input
                  type='tel'
                  required
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                  placeholder='(123) 456-7890'
                  disabled={loading}
                />
              </div>
            </div>

            {/* Addresses Section */}
            <div className='mt-6 border-t border-gray-200 pt-6'>
              <h3 className='mb-4 text-lg font-semibold text-gray-900'>Linked Addresses</h3>
              {localAddresses.length === 0 ? (
                <div className='rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center'>
                  <svg className='mx-auto h-10 w-10 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                  </svg>
                  <p className='mt-3 text-sm font-medium text-gray-900'>No addresses found</p>
                  <p className='mt-1 text-xs text-gray-500'>This client has not provided any address information</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {localAddresses.map((address) => (
                    <EditableAddressView
                      key={address.id}
                      address={address}
                      onUpdate={handleAddressUpdate}
                      onDelete={handleAddressDelete}
                      showMovingDate={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className='border-t border-gray-200 px-6 py-4 bg-gray-50'>
          <div className='flex items-center justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type='button'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              disabled={loading}
              onClick={() => {
                if (formRef.current) {
                  formRef.current.requestSubmit()
                }
              }}
            >
              {loading && (
                <svg className='h-4 w-4 animate-spin' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                </svg>
              )}
              Update Information
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

