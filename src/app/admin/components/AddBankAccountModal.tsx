'use client'

import { useState, useEffect } from 'react'
import type { BankAccount } from '@/src/types'

interface AddBankAccountModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  existingBankAccount?: BankAccount | null
  onSuccess?: () => void
  title?: string
}

export default function AddBankAccountModal({
  isOpen,
  onClose,
  clientId,
  existingBankAccount,
  onSuccess,
  title = 'Add Bank Account'
}: AddBankAccountModalProps) {
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    transit_number: '',
    institution_number: '',
    account_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate form if editing existing bank account
  useEffect(() => {
    if (existingBankAccount) {
      setFormData({
        bank_name: existingBankAccount.bank_name || '',
        account_number: existingBankAccount.account_number || '',
        transit_number: existingBankAccount.transit_number || '',
        institution_number: existingBankAccount.institution_number || '',
        account_name: existingBankAccount.account_name || ''
      })
    } else {
      // Reset form when opening for new account
      setFormData({
        bank_name: '',
        account_number: '',
        transit_number: '',
        institution_number: '',
        account_name: ''
      })
    }
    setError(null)
  }, [existingBankAccount, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/bank-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save bank account')
      }

      // Success - close modal and refresh
      onClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the bank account')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    // Format transit_number and institution_number to remove non-digits
    if (field === 'transit_number' || field === 'institution_number') {
      value = value.replace(/\D/g, '')
    }
    
    // Limit transit_number to 5 digits
    if (field === 'transit_number' && value.length > 5) {
      return
    }
    
    // Limit institution_number to 3 digits
    if (field === 'institution_number' && value.length > 3) {
      return
    }

    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'>
      <div className='w-full max-w-md rounded-lg bg-white shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <h2 className='text-xl font-bold text-gray-900'>{title}</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6'>
          {error && (
            <div className='mb-4 rounded-lg bg-red-50 border border-red-200 p-3'>
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}

          <div className='space-y-4'>
            {/* Bank Name */}
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Bank Name <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                required
                value={formData.bank_name}
                onChange={(e) => handleInputChange('bank_name', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='e.g., TD Bank, RBC, BMO'
                disabled={loading}
              />
            </div>

            {/* Account Name */}
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Account Name <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                required
                value={formData.account_name}
                onChange={(e) => handleInputChange('account_name', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='Account holder name'
                disabled={loading}
              />
            </div>

            {/* Institution Number */}
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Institution Number <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                required
                value={formData.institution_number}
                onChange={(e) => handleInputChange('institution_number', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='000'
                maxLength={3}
                disabled={loading}
              />
              <p className='mt-1 text-xs text-gray-500'>3 digits</p>
            </div>

            {/* Transit Number */}
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Transit Number <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                required
                value={formData.transit_number}
                onChange={(e) => handleInputChange('transit_number', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='00000'
                maxLength={5}
                disabled={loading}
              />
              <p className='mt-1 text-xs text-gray-500'>5 digits</p>
            </div>

            {/* Account Number */}
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Account Number <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                required
                value={formData.account_number}
                onChange={(e) => handleInputChange('account_number', e.target.value)}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                placeholder='Account number'
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className='mt-6 flex items-center justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              disabled={loading}
            >
              {loading && (
                <svg className='h-4 w-4 animate-spin' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                </svg>
              )}
              {existingBankAccount ? 'Update' : 'Add'} Bank Account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

