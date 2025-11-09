'use client'
import { useTranslations } from 'next-intl'
import type {
  QuickApplyFormData,
  QuickApplyUpdateHandler
} from '../types'

interface Step1PersonalInfoProps {
  formData: Pick<
    QuickApplyFormData,
    'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth'
  >
  onUpdate: QuickApplyUpdateHandler
}

export default function Step1PersonalInfo({
  formData,
  onUpdate
}: Step1PersonalInfoProps) {
  const t = useTranslations('')

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
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
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
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
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
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
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
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
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
          onChange={e => onUpdate('dateOfBirth', e.target.value)}
          className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
        />
      </div>
    </div>
  )
}
