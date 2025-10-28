'use client'
import { useTranslations } from 'next-intl'

interface Step3ConfirmationProps {
  formData: {
    firstName: string
    lastName: string
    email: string
    phone: string
    loanAmount: string
    confirmInformation: boolean
  }
  onUpdate: any
}

export default function Step3Confirmation({
  formData,
  onUpdate
}: Step3ConfirmationProps) {
  const t = useTranslations('')

  return (
    <div className='space-y-6'>
      <div className='mb-6 text-center'>
        <h2 className='mb-2 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-2xl font-bold text-transparent'>
          {t('Final_Confirmation')}
        </h2>
        <p className='text-gray-600'>{t('Review_And_Confirm')}</p>
      </div>

      <div className='space-y-4 rounded-xl bg-gray-50 p-6'>
        <h3 className='mb-4 text-lg font-semibold text-primary'>
          {t('Application_Summary')}
        </h3>
        <div className='grid gap-3 text-sm'>
          <div className='flex justify-between'>
            <span className='text-gray-600'>{t('Name')}:</span>
            <span className='font-medium'>
              {formData.firstName} {formData.lastName}
            </span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-600'>{t('Email')}:</span>
            <span className='font-medium'>{formData.email}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-600'>{t('Phone')}:</span>
            <span className='font-medium'>{formData.phone}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-600'>{t('Loan_Amount')}:</span>
            <span className='font-medium text-green-600'>
              ${formData.loanAmount}
            </span>
          </div>
        </div>
      </div>

      <div className='flex items-start space-x-3'>
        <input
          type='checkbox'
          id='confirmInformation'
          checked={formData.confirmInformation}
          onChange={e => onUpdate('confirmInformation', e.target.checked)}
          className='mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
        />
        <label htmlFor='confirmInformation' className='text-sm text-gray-700'>
          {t('Confirm_Information_Accurate')}
        </label>
      </div>
    </div>
  )
}

