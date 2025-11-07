'use client'
import { useTranslations } from 'next-intl'
import AddressAutocomplete, {
  type ParsedAddress
} from '../../components/AddressAutocomplete'
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

interface Step2AddressProps {
  formData: {
    streetNumber: string
    streetName: string
    apartmentNumber?: string
    city: string
    province: string
    postalCode: string
    movingDate: string
    country: string
  }
  onUpdate: (field: string, value: string | boolean) => void
}

export default function Step2Address({
  formData,
  onUpdate
}: Step2AddressProps) {
  const t = useTranslations('')

  const hasPlacesAutocomplete = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  )

  const initialAddressValue = [
    formData.streetNumber,
    formData.streetName,
    formData.city
  ]
    .filter(Boolean)
    .join(' ')

  const handleAddressSelect = (address: ParsedAddress) => {
    if (address.streetNumber) {
      onUpdate('streetNumber', address.streetNumber)
    }
    if (address.streetName) {
      onUpdate('streetName', address.streetName)
    }
    if (address.city) {
      onUpdate('city', address.city)
    }
    if (address.province) {
      onUpdate('province', address.province)
    }
    if (address.postalCode) {
      onUpdate('postalCode', address.postalCode)
    }
    if (address.country) {
      onUpdate('country', address.country)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='mb-6 text-center'>
        <h2 className='mb-2 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-2xl font-bold text-transparent'>
          {t('Contact_Details')}
        </h2>
        <p className='text-gray-600'>{t('Contact_Details_Description')}</p>
      </div>

      {hasPlacesAutocomplete && (
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Search_Address')}
          </label>
          <AddressAutocomplete
            className='md:max-w-4xl'
            initialValue={initialAddressValue}
            placeholder={t('Search_Address_Placeholder')}
            onSelect={handleAddressSelect}
            countryRestrictions={['ca']}
          />
        </div>
      )}

      <div className='grid gap-4 md:grid-cols-3'>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Street_Number')} *
          </label>
          <input
            type='text'
            value={formData.streetNumber}
            onChange={e => onUpdate('streetNumber', e.target.value)}
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
            placeholder='123'
          />
        </div>
        <div className='md:col-span-2'>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Street_Name')} *
          </label>
          <input
            type='text'
            value={formData.streetName}
            onChange={e => onUpdate('streetName', e.target.value)}
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
            placeholder='Main Street'
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Apartment_Number')}
          </label>
          <input
            type='text'
            value={formData.apartmentNumber || ''}
            onChange={e => onUpdate('apartmentNumber', e.target.value)}
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
            placeholder='Apt 4B'
          />
        </div>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('City')} *
          </label>
          <input
            type='text'
            value={formData.city}
            onChange={e => onUpdate('city', e.target.value)}
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
            placeholder='Montréal'
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

      <div className='grid gap-4 md:grid-cols-3'>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Postal_Code')} *
          </label>
          <input
            type='text'
            value={formData.postalCode}
            onChange={e => onUpdate('postalCode', e.target.value.toUpperCase())}
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
            placeholder='H2X 1Y4'
          />
        </div>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Country')} *
          </label>
          <input
            type='text'
            value={formData.country}
            onChange={e => onUpdate('country', e.target.value)}
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
            placeholder='Canada'
          />
        </div>
        <div>
          <label className='mb-2 block text-sm font-medium text-primary'>
            {t('Moving_Date')} *
          </label>
          <input
            type='date'
            value={formData.movingDate}
            onChange={e => onUpdate('movingDate', e.target.value)}
            className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
          />
        </div>
      </div>
    </div>
  )
}
