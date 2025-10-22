'use client'
import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Button from './Button'
import Select from './Select'

/**
 * Multi-Step Loan Application Form
 *
 * A modern, multi-step form for loan applications featuring:
 * - Step indicators with visual progress
 * - Form validation
 * - Smooth transitions between steps
 * - Responsive design
 */

// Form data interface
interface FormData {
  // Personal Information
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  preferredLanguage: string
  
  // Contact Details (Address)
  streetNumber: string
  streetName: string
  apartmentNumber: string
  city: string
  province: string
  postalCode: string
  movingDate: string

  // Financial Information
  employmentStatus: string
  employerName: string
  jobTitle: string
  monthlyIncome: string
  additionalIncome: string
  housingStatus: string
  monthlyHousingCost: string

  // Loan Details
  loanAmount: string
  loanPurpose: string
  repaymentPeriod: string
  paymentFrequency: string

  // Review & Submit
  agreeTerms: boolean
  agreePrivacy: boolean
  consentCredit: boolean
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

export default function LoanApplicationForm() {
  const t = useTranslations('')
  const [showPreQualification, setShowPreQualification] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loanFormPreQualification')
      return saved ? JSON.parse(saved) : true
    }
    return true
  })
  const [bankruptcyPlan, setBankruptcyPlan] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loanFormBankruptcyPlan')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [previousBorrower, setPreviousBorrower] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loanFormPreviousBorrower')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loanFormCurrentStep')
      return saved ? JSON.parse(saved) : 1
    }
    return 1
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loanFormData')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      preferredLanguage: '',
      streetNumber: '',
      streetName: '',
      apartmentNumber: '',
      city: '',
      province: '',
      postalCode: '',
      movingDate: '',
      employmentStatus: '',
      employerName: '',
      jobTitle: '',
      monthlyIncome: '',
      additionalIncome: '',
      housingStatus: '',
      monthlyHousingCost: '',
      loanAmount: '',
      loanPurpose: '',
      repaymentPeriod: '',
      paymentFrequency: '',
      agreeTerms: false,
      agreePrivacy: false,
      consentCredit: false
    }
  })

  // Save form state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loanFormData', JSON.stringify(formData))
    }
  }, [formData])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loanFormCurrentStep', JSON.stringify(currentStep))
    }
  }, [currentStep])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loanFormPreQualification', JSON.stringify(showPreQualification))
    }
  }, [showPreQualification])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loanFormBankruptcyPlan', JSON.stringify(bankruptcyPlan))
    }
  }, [bankruptcyPlan])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loanFormPreviousBorrower', JSON.stringify(previousBorrower))
    }
  }, [previousBorrower])

  // Define steps with icons - you can easily reorder this array
  const steps = [
    {
      number: 1,
      title: t('Personal_Information'),
      description: t('Personal_Info_Description'),
      icon: (
        <svg
          className='h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
          <circle cx='12' cy='7' r='4' />
        </svg>
      )
    },
    {
      number: 2,
      title: t('Contact_Details'),
      description: t('Contact_Details_Description'),
      icon: (
        <svg
          className='h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
          <polyline points='9 22 9 12 15 12 15 22' />
        </svg>
      )
    },
    {
      number: 3,
      title: t('Financial_Obligations'),
      description: t('Financial_Obligations_Description'),
      icon: (
        <svg
          className='h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
          <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
        </svg>
      )
    },
    {
      number: 4,
      title: t('Your_Income'),
      description: t('Income_Description'),
      icon: (
        <svg
          className='h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <circle cx='12' cy='12' r='10' />
          <path d='M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' />
          <path d='M12 18V6' />
        </svg>
      )
    },
    {
      number: 5,
      title: t('Review_Submit'),
      description: t('Review_Description'),
      icon: (
        <svg
          className='h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <polyline points='20 6 9 17 4 12' />
        </svg>
      )
    }
  ]

  const totalSteps = steps.length

  // Update form data
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Navigation handlers
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    // Here you would typically send the form data to your API
    console.log('Form submitted:', formData)
    setIsSubmitted(true)
    
    // Clear localStorage after successful submission
    if (typeof window !== 'undefined') {
      localStorage.removeItem('loanFormData')
      localStorage.removeItem('loanFormCurrentStep')
      localStorage.removeItem('loanFormPreQualification')
      localStorage.removeItem('loanFormBankruptcyPlan')
      localStorage.removeItem('loanFormPreviousBorrower')
    }
  }

  const handleStartOver = () => {
    // Reset all form state
    setShowPreQualification(true)
    setCurrentStep(1)
    // setBankruptcyPlan(false)
    // setPreviousBorrower(false)
    // setFormData({
    //   firstName: '',
    //   lastName: '',
    //   email: '',
    //   phone: '',
    //   dateOfBirth: '',
    //   sin: '',
    //   streetAddress: '',
    //   city: '',
    //   province: '',
    //   postalCode: '',
    //   employmentStatus: '',
    //   employerName: '',
    //   jobTitle: '',
    //   monthlyIncome: '',
    //   additionalIncome: '',
    //   housingStatus: '',
    //   monthlyHousingCost: '',
    //   loanAmount: '',
    //   loanPurpose: '',
    //   repaymentPeriod: '',
    //   paymentFrequency: '',
    //   agreeTerms: false,
    //   agreePrivacy: false,
    //   consentCredit: false
    // })
    
    // // Clear localStorage
    // if (typeof window !== 'undefined') {
    //   localStorage.removeItem('loanFormData')
    //   localStorage.removeItem('loanFormCurrentStep')
    //   localStorage.removeItem('loanFormPreQualification')
    //   localStorage.removeItem('loanFormBankruptcyPlan')
    //   localStorage.removeItem('loanFormPreviousBorrower')
    // }
  }

  // If form is submitted, show success message
  if (isSubmitted) {
    return (
      <div className='mx-auto max-w-2xl rounded-lg bg-background-secondary p-8 text-center'>
        <div className='mb-6 flex justify-center'>
          <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary'>
            <span className='text-4xl'>✓</span>
          </div>
        </div>
        <h2 className='mb-4 text-3xl font-bold text-primary'>
          {t('Application_Submitted')}
        </h2>
        <p className='mb-6 text-lg text-text-secondary'>
          {t('Application_Success_Message')}
        </p>
        <div className='rounded-lg bg-background p-4'>
          <p className='text-sm text-text-secondary'>
            {t('Application_Reference')}
          </p>
          <p className='text-xl font-semibold text-primary'>
            FL-{Date.now().toString().slice(-8)}
          </p>
        </div>
      </div>
    )
  }

  // Pre-qualification screen
  if (showPreQualification) {
    return (
      <div className='mx-auto max-w-4xl'>
        <div className='rounded-lg bg-background-secondary p-4 sm:p-6 md:p-8'>
          {/* Header */}
          <div className='mb-6 text-center sm:mb-8'>
            <h2 className='mb-3 text-2xl font-bold text-primary sm:mb-4 sm:text-3xl'>
              {t('Get_Quick_Loan_Quote')}
            </h2>
            <p className='text-base text-secondary sm:text-lg'>
              {t('Answer_Simple_Questions')}
            </p>
          </div>

          {/* Requirements */}
          <div className='mb-6 grid gap-4 sm:mb-8 sm:gap-6 md:grid-cols-2'>
            {/* 18+ Requirement */}
            <div className='flex flex-col items-center rounded-lg bg-background p-4 text-center sm:p-6'>
              <div className='mb-3 text-5xl font-bold text-gray-400 sm:mb-4 sm:text-6xl'>18+</div>
              <p className='text-xs text-text-secondary sm:text-sm'>{t('Must_Be_18')}</p>
            </div>

            {/* Canadian Resident Requirement */}
            <div className='flex flex-col items-center rounded-lg bg-background p-4 text-center sm:p-6'>
              <div className='mb-3 text-5xl sm:mb-4 sm:text-6xl'>🍁</div>
              <p className='text-xs text-text-secondary sm:text-sm'>
                {t('Must_Be_Canadian')}
              </p>
            </div>
          </div>

          {/* Bankruptcy Question */}
          <div className='mb-5 sm:mb-6'>
            <p className='mb-3 text-base font-medium text-secondary sm:mb-4 sm:text-lg'>
              {t('Bankruptcy_Question')}
            </p>
            <div className='flex gap-3 sm:gap-4'>
              <button
                onClick={() => setBankruptcyPlan(true)}
                className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all sm:px-6 sm:py-3 sm:text-base ${
                  bankruptcyPlan
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 bg-background text-primary hover:border-primary'
                }`}
              >
                {t('Yes')}
              </button>
              <button
                onClick={() => setBankruptcyPlan(false)}
                className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all sm:px-6 sm:py-3 sm:text-base ${
                  !bankruptcyPlan
                    ? 'border-secondary bg-secondary text-white'
                    : 'border-gray-300 bg-background text-primary hover:border-secondary'
                }`}
              >
                {t('No')}
              </button>
            </div>

            {/* Warning Message */}
            {bankruptcyPlan && (
              <div className='mt-3 rounded-lg border-2 border-red-500 bg-red-50 p-3 sm:mt-4 sm:p-4'>
                <p className='text-xs font-semibold text-red-700 sm:text-sm'>
                  {t('Bankruptcy_Warning')}
                </p>
              </div>
            )}
          </div>

          {/* Previous Borrower Question */}
          <div className='mb-6 sm:mb-8'>
            <p className='mb-3 text-sm text-primary sm:mb-4 sm:text-base'>
              {t('Previous_Borrower_Question')}
            </p>
            <div className='flex gap-3 sm:gap-4'>
              <button
                onClick={() => setPreviousBorrower(true)}
                className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all sm:px-6 sm:py-3 sm:text-base ${
                  previousBorrower
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 bg-background text-primary hover:border-primary'
                }`}
              >
                {t('Yes')}
              </button>
              <button
                onClick={() => setPreviousBorrower(false)}
                className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all sm:px-6 sm:py-3 sm:text-base ${
                  !previousBorrower
                    ? 'border-secondary bg-secondary text-white'
                    : 'border-gray-300 bg-background text-primary hover:border-secondary'
                }`}
              >
                {t('No')}
              </button>
            </div>
          </div>

          {/* Get Started Button */}
          <div className='flex justify-center sm:justify-end'>
            <Button
              size='large'
              onClick={() => setShowPreQualification(false)}
              className='hover:bg-secondary/90 w-full bg-secondary text-white sm:w-auto'
            >
              {t('Get_Started')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-4xl'>
      {/* Start Over Button */}
      <div className='mb-3 flex justify-end px-2 sm:mb-4 sm:px-0'>
        <button
          onClick={handleStartOver}
          className='text-xs text-text-secondary transition-colors hover:text-primary hover:underline sm:text-sm'
        >
          ← {t('Back_To_PreQualification') || 'Back to Pre-qualification'}
        </button>
      </div>

      {/* Step Indicators - Desktop Version (hidden on mobile) */}
      <div className='mb-6 hidden sm:block'>
        <div className='mx-auto flex max-w-3xl items-start justify-between'>
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step Circle with Icon */}
              <div className='flex flex-col items-center'>
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    currentStep >= step.number
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 bg-background text-gray-400'
                  }`}
                >
                  {step.icon}
                </div>
                {/* Step Label */}
                <span className='mt-1.5 w-20 text-center text-xs text-text-secondary'>
                  {step.title}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className='relative mt-6 h-0.5 flex-1 bg-gray-300'>
                  <div
                    className='absolute left-0 top-0 h-full bg-primary transition-all duration-500'
                    style={{
                      width: currentStep > step.number ? '100%' : '0%'
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile Step Indicator - Compact dots version */}
      <div className='mb-4 block px-2 sm:hidden'>
        {/* Progress Text */}
        <div className='mb-2 text-center text-xs font-medium text-text-secondary'>
          {t('Step')} {currentStep} {t('Of')} {steps.length}
        </div>
        {/* Dots */}
        <div className='flex items-center justify-center gap-2'>
          {steps.map((step) => (
            <div
              key={step.number}
              className={`h-2 w-2 rounded-full transition-all ${
                currentStep === step.number
                  ? 'w-8 bg-primary'
                  : currentStep > step.number
                  ? 'bg-primary'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        {/* Current Step Title */}
        <div className='mt-2 text-center text-sm font-semibold text-primary'>
          {steps[currentStep - 1].title}
        </div>
      </div>

      {/* Form Content */}
      <div className='rounded-lg bg-background-secondary p-4 sm:p-6'>
        {/* Step Title - Hidden on mobile since it's shown in mobile indicator */}
        <div className='mb-4 hidden sm:mb-6 sm:block'>
          <h2 className='mb-2 text-2xl font-bold text-primary'>
            {steps[currentStep - 1].title}
          </h2>
          <p className='text-sm text-text-secondary'>
            {steps[currentStep - 1].description}
          </p>
        </div>
        
        {/* Mobile Step Description */}
        <div className='mb-4 block text-center text-xs text-text-secondary sm:hidden'>
          {steps[currentStep - 1].description}
        </div>

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className='space-y-3 sm:space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('First_Name')} *
                </label>
                <input
                  type='text'
                  value={formData.firstName}
                  onChange={e => updateFormData('firstName', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='Your first name'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Last_Name')} *
                </label>
                <input
                  type='text'
                  value={formData.lastName}
                  onChange={e => updateFormData('lastName', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='Your last name'
                />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Date_of_Birth')} *
                </label>
                <input
                  type='date'
                  value={formData.dateOfBirth}
                  onChange={e => updateFormData('dateOfBirth', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='dd/mm/yyyy'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Your_Language')} *
                </label>
                <Select
                  value={formData.preferredLanguage}
                  onValueChange={value => updateFormData('preferredLanguage', value)}
                  placeholder={t('Select_Language')}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'fr', label: 'Français' }
                  ]}
                />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Phone_Number')} *
                </label>
                <input
                  type='tel'
                  value={formData.phone}
                  onChange={e => updateFormData('phone', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='(999) 999-9999'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Email_Address')} *
                </label>
                <input
                  type='email'
                  value={formData.email}
                  onChange={e => updateFormData('email', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='khalidmossaid@gmail.com'
                />
              </div>
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {t('How_Much_Do_You_Need')} *
              </label>
              <Select
                value={formData.loanAmount}
                onValueChange={value => updateFormData('loanAmount', value)}
                placeholder={t('Choose_Desired_Amount')}
                options={[
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
                ]}
              />
            </div>
          </div>
        )}

        {/* Step 2: Contact Details */}
        {currentStep === 2 && (
          <div className='space-y-3 sm:space-y-4'>
            <div className='grid gap-4 grid-cols-[1fr_3fr_1fr]'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Street_Number')} *
                </label>
                <input
                  type='text'
                  value={formData.streetNumber}
                  onChange={e => updateFormData('streetNumber', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='Tesy'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Street_Name')} *
                </label>
                <input
                  type='text'
                  value={formData.streetName}
                  onChange={e => updateFormData('streetName', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='rue 1'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Apartment_Number')}
                </label>
                <input
                  type='text'
                  value={formData.apartmentNumber}
                  onChange={e => updateFormData('apartmentNumber', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='apprt 31'
                />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-3'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('City')} *
                </label>
                <input
                  type='text'
                  value={formData.city}
                  onChange={e => updateFormData('city', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='test'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Province')} *
                </label>
                <Select
                  value={formData.province}
                  onValueChange={value => updateFormData('province', value)}
                  placeholder={t('Select_Province')}
                  options={CANADIAN_PROVINCES.map(prov => ({
                    value: prov,
                    label: prov
                  }))}
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Postal_Code')} *
                </label>
                <input
                  type='text'
                  value={formData.postalCode}
                  onChange={e => updateFormData('postalCode', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='H5D 2D2'
                />
              </div>
            </div>

            <div>
              <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                {t('Moving_Date')} *
              </label>
              <input
                type='date'
                value={formData.movingDate}
                onChange={e => updateFormData('movingDate', e.target.value)}
                className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
              />
            </div>
          </div>
        )}

        {/* Step 3: Financial Obligations */}
        {currentStep === 3 && (
          <div className='space-y-3 sm:space-y-4'>
            <div>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {t('Employment_Status')} *
              </label>
              <Select
                value={formData.employmentStatus}
                onValueChange={value =>
                  updateFormData('employmentStatus', value)
                }
                placeholder={t('Select_Employment')}
                options={[
                  { value: 'full-time', label: t('Employed_Full_Time') },
                  { value: 'part-time', label: t('Employed_Part_Time') },
                  { value: 'self-employed', label: t('Self_Employed') },
                  { value: 'unemployed', label: t('Unemployed') },
                  { value: 'retired', label: t('Retired') },
                  { value: 'student', label: t('Student') }
                ]}
              />
            </div>

            {(formData.employmentStatus === 'full-time' ||
              formData.employmentStatus === 'part-time' ||
              formData.employmentStatus === 'self-employed') && (
              <>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Employer_Name')} *
                    </label>
                    <input
                      type='text'
                      value={formData.employerName}
                      onChange={e =>
                        updateFormData('employerName', e.target.value)
                      }
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='Company Name'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Job_Title')} *
                    </label>
                    <input
                      type='text'
                      value={formData.jobTitle}
                      onChange={e => updateFormData('jobTitle', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='Position Title'
                    />
                  </div>
                </div>
              </>
            )}

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Housing_Status')} *
                </label>
                <Select
                  value={formData.housingStatus}
                  onValueChange={value =>
                    updateFormData('housingStatus', value)
                  }
                  placeholder={t('Select_Housing')}
                  options={[
                    { value: 'own', label: t('Own') },
                    { value: 'rent', label: t('Rent') },
                    { value: 'family', label: t('Living_With_Family') },
                    { value: 'other', label: t('Other_Housing') }
                  ]}
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Monthly_Housing_Cost')} *
                </label>
                <input
                  type='number'
                  value={formData.monthlyHousingCost}
                  onChange={e =>
                    updateFormData('monthlyHousingCost', e.target.value)
                  }
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='1200'
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Your Income */}
        {currentStep === 4 && (
          <div className='space-y-3 sm:space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Monthly_Income')} *
                </label>
                <input
                  type='number'
                  value={formData.monthlyIncome}
                  onChange={e =>
                    updateFormData('monthlyIncome', e.target.value)
                  }
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='3000'
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Additional_Income')}
                </label>
                <input
                  type='number'
                  value={formData.additionalIncome}
                  onChange={e =>
                    updateFormData('additionalIncome', e.target.value)
                  }
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='500'
                />
              </div>
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {t('Loan_Amount')} *
              </label>
              <input
                type='number'
                value={formData.loanAmount}
                onChange={e => updateFormData('loanAmount', e.target.value)}
                className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-3 text-lg text-primary focus:border-primary focus:outline-none focus:ring-2'
                placeholder='500'
                min='100'
                max='1500'
              />
              <p className='mt-2 text-sm text-text-secondary'>
                {t('Amount_Between')}
              </p>
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {t('Loan_Purpose')} *
              </label>
              <Select
                value={formData.loanPurpose}
                onValueChange={value => updateFormData('loanPurpose', value)}
                placeholder={t('Select_Purpose')}
                options={[
                  { value: 'emergency', label: t('Emergency_Expenses') },
                  { value: 'debt', label: t('Debt_Consolidation') },
                  { value: 'home', label: t('Home_Improvement') },
                  { value: 'medical', label: t('Medical_Expenses') },
                  { value: 'education', label: t('Education') },
                  { value: 'vehicle', label: t('Vehicle_Purchase') },
                  { value: 'other', label: t('Other_Purpose') }
                ]}
              />
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Repayment_Period')} *
                </label>
                <Select
                  value={formData.repaymentPeriod}
                  onValueChange={value =>
                    updateFormData('repaymentPeriod', value)
                  }
                  placeholder={t('Select_Period')}
                  options={[
                    { value: '1', label: t('1_Month') },
                    { value: '2', label: t('2_Months') },
                    { value: '3', label: t('3_Months') },
                    { value: '4', label: t('4_Months') },
                    { value: '5', label: t('5_Months') },
                    { value: '6', label: t('6_Months') }
                  ]}
                />
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Preferred_Payment_Frequency')} *
                </label>
                <Select
                  value={formData.paymentFrequency}
                  onValueChange={value =>
                    updateFormData('paymentFrequency', value)
                  }
                  placeholder={t('Select_Frequency')}
                  options={[
                    { value: 'weekly', label: t('Weekly_Payment') },
                    { value: 'bi-weekly', label: t('Bi_Weekly_Payment') },
                    { value: 'monthly', label: t('Monthly_Payment') }
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {currentStep === 5 && (
          <div className='space-y-3 sm:space-y-4'>
            <div className='rounded-lg bg-background p-6'>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Personal_Details')}
              </h3>
              <div className='grid gap-4 text-sm md:grid-cols-2'>
                <div>
                  <span className='text-text-secondary'>Name:</span>
                  <p className='font-medium text-primary'>
                    {formData.firstName} {formData.lastName}
                  </p>
                </div>
                <div>
                  <span className='text-text-secondary'>Email:</span>
                  <p className='font-medium text-primary'>{formData.email}</p>
                </div>
                <div>
                  <span className='text-text-secondary'>Phone:</span>
                  <p className='font-medium text-primary'>{formData.phone}</p>
                </div>
                <div>
                  <span className='text-text-secondary'>Address:</span>
                  <p className='font-medium text-primary'>
                    {formData.streetNumber} {formData.streetName} {formData.apartmentNumber && `Apt ${formData.apartmentNumber}`}, {formData.city},{' '}
                    {formData.province} {formData.postalCode}
                  </p>
                </div>
              </div>
            </div>

            <div className='rounded-lg bg-background p-6'>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Financial_Details')}
              </h3>
              <div className='grid gap-4 text-sm md:grid-cols-2'>
                <div>
                  <span className='text-text-secondary'>
                    {t('Employment_Status')}:
                  </span>
                  <p className='font-medium capitalize text-primary'>
                    {formData.employmentStatus}
                  </p>
                </div>
                <div>
                  <span className='text-text-secondary'>
                    {t('Monthly_Income')}:
                  </span>
                  <p className='font-medium text-primary'>
                    ${formData.monthlyIncome}
                  </p>
                </div>
                <div>
                  <span className='text-text-secondary'>
                    {t('Housing_Status')}:
                  </span>
                  <p className='font-medium capitalize text-primary'>
                    {formData.housingStatus}
                  </p>
                </div>
                <div>
                  <span className='text-text-secondary'>
                    {t('Monthly_Housing_Cost')}:
                  </span>
                  <p className='font-medium text-primary'>
                    ${formData.monthlyHousingCost}
                  </p>
                </div>
              </div>
            </div>

            <div className='rounded-lg bg-background p-6'>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Loan_Information')}
              </h3>
              <div className='grid gap-4 text-sm md:grid-cols-2'>
                <div>
                  <span className='text-text-secondary'>
                    {t('Loan_Amount')}:
                  </span>
                  <p className='text-2xl font-bold text-primary'>
                    ${formData.loanAmount}
                  </p>
                </div>
                <div>
                  <span className='text-text-secondary'>
                    {t('Repayment_Period')}:
                  </span>
                  <p className='font-medium text-primary'>
                    {formData.repaymentPeriod} {t('Of')} 6 {t('Of')}
                  </p>
                </div>
                <div>
                  <span className='text-text-secondary'>
                    {t('Loan_Purpose')}:
                  </span>
                  <p className='font-medium capitalize text-primary'>
                    {formData.loanPurpose}
                  </p>
                </div>
                <div>
                  <span className='text-text-secondary'>
                    {t('Preferred_Payment_Frequency')}:
                  </span>
                  <p className='font-medium capitalize text-primary'>
                    {formData.paymentFrequency}
                  </p>
                </div>
              </div>
            </div>

            <div className='border-primary/20 space-y-4 rounded-lg border-2 bg-background p-6'>
              <label className='flex items-start'>
                <input
                  type='checkbox'
                  checked={formData.agreeTerms}
                  onChange={e => updateFormData('agreeTerms', e.target.checked)}
                  className='mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary'
                />
                <span className='ml-3 text-sm text-text-secondary'>
                  {t('Terms_And_Conditions')} *
                </span>
              </label>

              <label className='flex items-start'>
                <input
                  type='checkbox'
                  checked={formData.agreePrivacy}
                  onChange={e =>
                    updateFormData('agreePrivacy', e.target.checked)
                  }
                  className='mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary'
                />
                <span className='ml-3 text-sm text-text-secondary'>
                  {t('Privacy_Policy')} *
                </span>
              </label>

              <label className='flex items-start'>
                <input
                  type='checkbox'
                  checked={formData.consentCredit}
                  onChange={e =>
                    updateFormData('consentCredit', e.target.checked)
                  }
                  className='mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary'
                />
                <span className='ml-3 text-sm text-text-secondary'>
                  {t('Consent_Credit_Check')}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className='mt-6 flex justify-between'>
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            variant='secondary'
            size='large'
            className={currentStep === 1 ? 'invisible' : ''}
          >
            {t('Previous')}
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={nextStep} size='large'>
              {t('Continue')} →
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              size='large'
              disabled={!formData.agreeTerms || !formData.agreePrivacy}
            >
              {t('Submit_Application')} →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
