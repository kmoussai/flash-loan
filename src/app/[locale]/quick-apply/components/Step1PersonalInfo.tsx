'use client'
import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import type {
  QuickApplyFormData,
  QuickApplyUpdateHandler
} from '../types'
import { validateMinimumAge } from '@/src/lib/utils/age'

interface Step1PersonalInfoProps {
  formData: Pick<
    QuickApplyFormData,
    'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth'
  >
  onUpdate: QuickApplyUpdateHandler
  disabled?: boolean
}

export default function Step1PersonalInfo({
  formData,
  onUpdate,
  disabled = false
}: Step1PersonalInfoProps) {
  const t = useTranslations('')
  const [ageError, setAgeError] = useState<string | null>(null)

  // Validate age when date of birth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const validation = validateMinimumAge(formData.dateOfBirth, 18)
      if (!validation.isValid) {
        setAgeError(validation.error)
      } else {
        setAgeError(null)
      }
    } else {
      setAgeError(null)
    }
  }, [formData.dateOfBirth])

  const handleDateOfBirthChange = (value: string) => {
    onUpdate('dateOfBirth', value)
    
    // Validate immediately
    if (value) {
      const validation = validateMinimumAge(value, 18)
      if (!validation.isValid) {
        setAgeError(validation.error)
      } else {
        setAgeError(null)
      }
    } else {
      setAgeError(null)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='mb-6 text-center'>
        <h2 className='mb-2 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-2xl font-bold text-transparent'>
          {t('Personal_Information')}
        </h2>
        <p className='text-gray-600'>{t('Basic_Info_Required')}</p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('First_Name')} *
          </label>
          <input
            type='text'
            value={formData.firstName}
            onChange={e => onUpdate('firstName', e.target.value)}
            disabled={disabled}
            className={`focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 ${
              disabled ? 'cursor-not-allowed opacity-60' : ''
            }`}
            placeholder='Jean'
          />
        </div>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Last_Name')} *
          </label>
          <input
            type='text'
            value={formData.lastName}
            onChange={e => onUpdate('lastName', e.target.value)}
            disabled={disabled}
            className={`focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 ${
              disabled ? 'cursor-not-allowed opacity-60' : ''
            }`}
            placeholder='Tremblay'
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Email_Address')} *
          </label>
          <input
            type='email'
            value={formData.email}
            onChange={e => onUpdate('email', e.target.value)}
            disabled={disabled}
            className={`focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 ${
              disabled ? 'cursor-not-allowed opacity-60' : ''
            }`}
            placeholder='jean@email.com'
          />
        </div>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Phone_Number')} *
          </label>
          <input
            type='tel'
            value={formData.phone}
            onChange={e => onUpdate('phone', e.target.value)}
            disabled={disabled}
            className={`focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 ${
              disabled ? 'cursor-not-allowed opacity-60' : ''
            }`}
            placeholder='514-555-1234'
          />
        </div>
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium text-primary'>
          {t('Date_of_Birth')} *
        </label>
        <input
          type='date'
          value={formData.dateOfBirth}
          onChange={e => handleDateOfBirthChange(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          disabled={disabled}
          className={`focus:ring-primary/20 w-full rounded-lg border bg-background p-3 text-primary focus:outline-none focus:ring-2 ${
            ageError
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-primary'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        />
        {ageError && (
          <p className='mt-2 text-sm text-red-600'>{ageError}</p>
        )}
      </div>
    </div>
  )
}
