'use client'
import { useTranslations } from 'next-intl'
import Select from '../../components/Select'

interface Step3LoanDetailsProps {
  formData: {
    loanAmount: string
  }
  onUpdate: (field: string, value: string | boolean) => void
}

export default function Step3LoanDetails({ formData, onUpdate }: Step3LoanDetailsProps) {
  const t = useTranslations('')

  const loanAmountOptions = [
    { value: '250', label: '$250' },
    { value: '300', label: '$300' },
    { value: '400', label: '$400' },
    { value: '500', label: '$500' },
    { value: '600', label: '$600' },
    { value: '750', label: '$750' },
    { value: '800', label: '$800' },
    { value: '900', label: '$900' },
    { value: '1000', label: '$1,000' },
    { value: '1250', label: '$1,250' },
    { value: '1500', label: '$1,500' }
  ]

  return (
    <div className='space-y-6'>
      <div className='mb-6 text-center'>
        <h2 className='mb-2 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-2xl font-bold text-transparent'>
          {t('Loan_Details')}
        </h2>
        <p className='text-gray-600'>{t('Select_Amount_Needed')}</p>
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium text-primary'>
          {t('How_Much_Do_You_Need')} *
        </label>
        <Select
          value={formData.loanAmount}
          onValueChange={value => onUpdate('loanAmount', value)}
          placeholder={t('Choose_Desired_Amount')}
          options={loanAmountOptions}
        />
      </div>

      <div className='rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-6'>
        <h3 className='mb-2 text-lg font-semibold text-green-800'>
          {t('Why_Choose_Micro_Loan')}
        </h3>
        <ul className='space-y-2 text-sm text-green-700'>
          <li className='flex items-center'>
            <svg
              className='mr-2 h-4 w-4 text-green-600'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                clipRule='evenodd'
              />
            </svg>
            {t('Fast_Approval')}
          </li>
          <li className='flex items-center'>
            <svg
              className='mr-2 h-4 w-4 text-green-600'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                clipRule='evenodd'
              />
            </svg>
            {t('No_Credit_Check')}
          </li>
          <li className='flex items-center'>
            <svg
              className='mr-2 h-4 w-4 text-green-600'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                clipRule='evenodd'
              />
            </svg>
            {t('Secure_Bank_Verification')}
          </li>
        </ul>
      </div>
    </div>
  )
}

