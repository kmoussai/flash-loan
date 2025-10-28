'use client'
import { useTranslations } from 'next-intl'
import Select from '../../components/Select'

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

interface Step1PersonalInfoProps {
  formData: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    province: string
  }
  onUpdate: any
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

      <div className='grid gap-4 md:grid-cols-2'>
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
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Province')} *
          </label>
          <Select
            value={formData.province}
            onValueChange={value => onUpdate('province', value)}
            placeholder={t('Select_Province')}
            options={CANADIAN_PROVINCES.map(province => ({
              value: province,
              label: province
            }))}
          />
        </div>
      </div>
    </div>
  )
}
