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

  // Financial Obligations (Step 3) - Quebec only
  residenceStatus: string
  grossSalary: string
  rentOrMortgageCost: string
  heatingElectricityCost: string
  carLoan: string
  furnitureLoan: string

  // References (Step 4)
  reference1FirstName: string
  reference1LastName: string
  reference1Phone: string
  reference1Relationship: string
  reference2FirstName: string
  reference2LastName: string
  reference2Phone: string
  reference2Relationship: string

  // Your Income (Step 5)
  incomeSource: string
  // For Employed
  occupation: string
  companyName: string
  supervisorName: string
  workPhone: string
  post: string
  payrollFrequency: string
  dateHired: string
  nextPayDate: string
  // For Employment Insurance
  employmentInsuranceStartDate: string
  // For Self-Employed
  paidByDirectDeposit: string
  selfEmployedPhone: string
  depositsFrequency: string
  selfEmployedStartDate: string
  // For all others (common field)
  nextDepositDate: string

  // Loan Details (will be moved/organized)
  loanAmount: string
  loanPurpose: string
  repaymentPeriod: string
  paymentFrequency: string

  // Confirmation & Submission
  loanType: string // 'without-documents' or 'with-documents'
  confirmInformation: boolean
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
      residenceStatus: '',
      grossSalary: '',
      rentOrMortgageCost: '',
      heatingElectricityCost: '',
      carLoan: '',
      furnitureLoan: '',
      reference1FirstName: '',
      reference1LastName: '',
      reference1Phone: '',
      reference1Relationship: '',
      reference2FirstName: '',
      reference2LastName: '',
      reference2Phone: '',
      reference2Relationship: '',
      incomeSource: '',
      occupation: '',
      companyName: '',
      supervisorName: '',
      workPhone: '',
      post: '',
      payrollFrequency: '',
      dateHired: '',
      nextPayDate: '',
      employmentInsuranceStartDate: '',
      paidByDirectDeposit: '',
      selfEmployedPhone: '',
      depositsFrequency: '',
      selfEmployedStartDate: '',
      nextDepositDate: '',
      loanAmount: '',
      loanPurpose: '',
      repaymentPeriod: '',
      paymentFrequency: '',
      loanType: '',
      confirmInformation: false,
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

  // Define steps with icons - dynamically filtered based on province
  const allSteps = [
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
      ),
      isQuebecOnly: true
    },
    {
      number: 4,
      title: t('References'),
      description: t('References_Description'),
      icon: (
        <svg
          className='h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
          <circle cx='9' cy='7' r='4' />
          <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
          <path d='M16 3.13a4 4 0 0 1 0 7.75' />
        </svg>
      )
    },
    {
      number: 5,
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
          <path d='M16 8h-6a2 4 0 1 0 0 4h4a2 2 0 1 1 0 4H8' />
          <path d='M12 18V6' />
        </svg>
      )
    },
    {
      number: 6,
      title: t('Confirmation_And_Submission'),
      description: t('Choose_Loan_Type'),
      icon: (
        <svg
          className='h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <path d='M9 11l3 3L22 4' />
          <path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' />
        </svg>
      )
    }
  ]

  // Filter steps based on province (exclude Financial Obligations if not Quebec)
  const steps = formData.province === 'Quebec' 
    ? allSteps 
    : allSteps.filter(step => !step.isQuebecOnly)

  // Renumber steps after filtering
  const stepsWithNumbers = steps.map((step, index) => ({
    ...step,
    number: index + 1
  }))

  const totalSteps = stepsWithNumbers.length

  // Update form data
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Get current step key based on province
  const getCurrentStepKey = () => {
    if (formData.province === 'Quebec') {
      // For Quebec, all 6 steps
      const stepKeys = ['personal', 'contact', 'financial', 'references', 'income', 'confirmation']
      return stepKeys[currentStep - 1]
    } else {
      // For non-Quebec, skip financial (step 3)
      const stepKeys = ['personal', 'contact', 'references', 'income', 'confirmation']
      return stepKeys[currentStep - 1]
    }
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
          {stepsWithNumbers.map((step, index) => (
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
              {index < stepsWithNumbers.length - 1 && (
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
          {t('Step')} {currentStep} {t('Of')} {stepsWithNumbers.length}
        </div>
        {/* Dots */}
        <div className='flex items-center justify-center gap-2'>
          {stepsWithNumbers.map((step) => (
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
          {stepsWithNumbers[currentStep - 1]?.title}
        </div>
      </div>

      {/* Form Content */}
      <div className='rounded-lg bg-background-secondary p-4 sm:p-6'>
        {/* Step Title - Hidden on mobile since it's shown in mobile indicator */}
        <div className='mb-4 hidden sm:mb-6 sm:block'>
          <h2 className='mb-2 text-2xl font-bold text-primary'>
            {stepsWithNumbers[currentStep - 1]?.title}
          </h2>
          <p className='text-sm text-text-secondary'>
            {stepsWithNumbers[currentStep - 1]?.description}
          </p>
        </div>
        
        {/* Mobile Step Description */}
        <div className='mb-4 block text-center text-xs text-text-secondary sm:hidden'>
          {stepsWithNumbers[currentStep - 1]?.description}
        </div>

        {/* Step 1: Personal Information */}
        {getCurrentStepKey() === 'personal' && (
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
        {getCurrentStepKey() === 'contact' && (
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

        {/* Step 3: Financial Obligations - Quebec Only */}
        {getCurrentStepKey() === 'financial' && (
          <div className='space-y-3 sm:space-y-4'>
            {/* Residence Status */}
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-3 block text-sm font-medium text-primary'>
                  {t('Your_Status_At')} *
                </label>
                <div className='flex gap-3'>
                  <button
                    onClick={() => updateFormData('residenceStatus', 'tenant')}
                    className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      formData.residenceStatus === 'tenant'
                        ? 'border-secondary bg-secondary text-white'
                        : 'border-gray-300 bg-background text-primary hover:border-secondary'
                    }`}
                  >
                    {t('Tenant')}
                  </button>
                  <button
                    onClick={() => updateFormData('residenceStatus', 'owner')}
                    className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      formData.residenceStatus === 'owner'
                        ? 'border-secondary bg-secondary text-white'
                        : 'border-gray-300 bg-background text-primary hover:border-secondary'
                    }`}
                  >
                    {t('Owner')}
                  </button>
                </div>
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Gross_Salary')} *
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={formData.grossSalary}
                    onChange={e => updateFormData('grossSalary', e.target.value)}
                    className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 pr-8 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    placeholder='100,000'
                  />
                  <span className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'>$</span>
                </div>
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Cost_Rent_Mortgage')} *
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={formData.rentOrMortgageCost}
                    onChange={e => updateFormData('rentOrMortgageCost', e.target.value)}
                    className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 pr-8 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    placeholder='1,500'
                  />
                  <span className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'>$</span>
                </div>
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Heating_Electricity_Cost')} *
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={formData.heatingElectricityCost}
                    onChange={e => updateFormData('heatingElectricityCost', e.target.value)}
                    className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 pr-8 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    placeholder='400'
                  />
                  <span className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'>$</span>
                </div>
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Car_Loan')} *
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={formData.carLoan}
                    onChange={e => updateFormData('carLoan', e.target.value)}
                    className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 pr-8 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    placeholder='0'
                  />
                  <span className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'>$</span>
                </div>
              </div>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Loan_Furniture_Other')} *
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={formData.furnitureLoan}
                    onChange={e => updateFormData('furnitureLoan', e.target.value)}
                    className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 pr-8 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    placeholder='0'
                  />
                  <span className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'>$</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: References */}
        {getCurrentStepKey() === 'references' && (
          <div className='space-y-3 sm:space-y-4'>
            {/* Reference 1 */}
            <div className='rounded-lg border-2 border-secondary/20 bg-background-secondary p-4 sm:p-6'>
              <h3 className='mb-4 text-lg font-semibold text-secondary'>1.</h3>
              <div className='space-y-3 sm:space-y-4'>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('First_Name')} *
                    </label>
                    <input
                      type='text'
                      value={formData.reference1FirstName}
                      onChange={e => updateFormData('reference1FirstName', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='dfsdf'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Last_Name')} *
                    </label>
                    <input
                      type='text'
                      value={formData.reference1LastName}
                      onChange={e => updateFormData('reference1LastName', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='sdfsdf'
                    />
                  </div>
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Phone_No')} *
                    </label>
                    <input
                      type='tel'
                      value={formData.reference1Phone}
                      onChange={e => updateFormData('reference1Phone', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='(324) 242-3423'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Relationship')} *
                    </label>
                    <input
                      type='text'
                      value={formData.reference1Relationship}
                      onChange={e => updateFormData('reference1Relationship', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='Feds'
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reference 2 */}
            <div className='rounded-lg border-2 border-secondary/20 bg-background-secondary p-4 sm:p-6'>
              <h3 className='mb-4 text-lg font-semibold text-secondary'>2.</h3>
              <div className='space-y-3 sm:space-y-4'>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('First_Name')} *
                    </label>
                    <input
                      type='text'
                      value={formData.reference2FirstName}
                      onChange={e => updateFormData('reference2FirstName', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='fsdafr'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Last_Name')} *
                    </label>
                    <input
                      type='text'
                      value={formData.reference2LastName}
                      onChange={e => updateFormData('reference2LastName', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='fafs'
                    />
                  </div>
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Phone_No')} *
                    </label>
                    <input
                      type='tel'
                      value={formData.reference2Phone}
                      onChange={e => updateFormData('reference2Phone', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='(234) 235-3245'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Relationship')} *
                    </label>
                    <input
                      type='text'
                      value={formData.reference2Relationship}
                      onChange={e => updateFormData('reference2Relationship', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='dsfsdaf'
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Your Income */}
        {getCurrentStepKey() === 'income' && (
          <div className='space-y-3 sm:space-y-4'>
            {/* Income Source Selection */}
            <div>
              <label className='mb-3 block text-sm font-medium text-primary'>
                {t('What_Is_Main_Income_Source')} *
              </label>
              <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
                {[
                  { value: 'employed', label: t('Employed') },
                  { value: 'employment-insurance', label: t('Employment_Insurance') },
                  { value: 'retirement-plan', label: t('Retirement_Plan') },
                  { value: 'self-employed', label: t('Self_Employed') },
                  { value: 'csst-saaq', label: t('CSST_SAAQ_Benefits') },
                  { value: 'parental-insurance', label: t('Parental_Insurance_Plan') }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateFormData('incomeSource', option.value)}
                    className={`rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      formData.incomeSource === option.value
                        ? 'border-secondary bg-secondary text-white'
                        : 'border-gray-300 bg-background text-primary hover:border-secondary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Employment Details (show only if employed) */}
            {formData.incomeSource === 'employed' && (
              <>
                <div className='grid gap-4 md:grid-cols-3'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Occupation')} *
                    </label>
                    <input
                      type='text'
                      value={formData.occupation}
                      onChange={e => updateFormData('occupation', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder={t('What_Is_Your_Position')}
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Company_Name')} *
                    </label>
                    <input
                      type='text'
                      value={formData.companyName}
                      onChange={e => updateFormData('companyName', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder={t('Name_Of_Your_Employer')}
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Supervisor_Name')} *
                    </label>
                    <input
                      type='text'
                      value={formData.supervisorName}
                      onChange={e => updateFormData('supervisorName', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder={t('Name_Of_Your_Supervisor')}
                    />
                  </div>
                </div>

                <div className='grid gap-4 md:grid-cols-3'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Phone_No')} *
                    </label>
                    <input
                      type='tel'
                      value={formData.workPhone}
                      onChange={e => updateFormData('workPhone', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='(999) 999-9999'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Post')} *
                    </label>
                    <input
                      type='text'
                      value={formData.post}
                      onChange={e => updateFormData('post', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder={t('Post_Number')}
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Payroll_Frequency')} *
                    </label>
                    <Select
                      value={formData.payrollFrequency}
                      onValueChange={value => updateFormData('payrollFrequency', value)}
                      placeholder={t('Choose_The_Frequency')}
                      options={[
                        { value: 'weekly', label: t('Weekly') },
                        { value: 'bi-weekly', label: t('Bi_Weekly') },
                        { value: 'monthly', label: t('Monthly') }
                      ]}
                    />
                  </div>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Date_Hired_Approximate')} *
                    </label>
                    <input
                      type='date'
                      value={formData.dateHired}
                      onChange={e => updateFormData('dateHired', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Next_Pay_Date')} *
                    </label>
                    <input
                      type='date'
                      value={formData.nextPayDate}
                      onChange={e => updateFormData('nextPayDate', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    />
                  </div>
                </div>
              </>
            )}

            {/* Employment Insurance */}
            {formData.incomeSource === 'employment-insurance' && (
              <>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('When_Employment_Insurance_Started')} *
                    </label>
                    <input
                      type='date'
                      value={formData.employmentInsuranceStartDate}
                      onChange={e => updateFormData('employmentInsuranceStartDate', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Next_Deposit_Date')} *
                    </label>
                    <input
                      type='date'
                      value={formData.nextDepositDate}
                      onChange={e => updateFormData('nextDepositDate', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    />
                  </div>
                </div>
              </>
            )}

            {/* Self Employed */}
            {formData.incomeSource === 'self-employed' && (
              <>
                <div className='grid gap-4 md:grid-cols-3'>
                  <div>
                    <label className='mb-3 block text-sm font-medium text-primary'>
                      {t('Paid_By_Direct_Deposit')} *
                    </label>
                    <div className='flex gap-3'>
                      <button
                        onClick={() => updateFormData('paidByDirectDeposit', 'yes')}
                        className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                          formData.paidByDirectDeposit === 'yes'
                            ? 'border-secondary bg-secondary text-white'
                            : 'border-gray-300 bg-background text-primary hover:border-secondary'
                        }`}
                      >
                        {t('Yes')}
                      </button>
                      <button
                        onClick={() => updateFormData('paidByDirectDeposit', 'no')}
                        className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                          formData.paidByDirectDeposit === 'no'
                            ? 'border-secondary bg-secondary text-white'
                            : 'border-gray-300 bg-background text-primary hover:border-secondary'
                        }`}
                      >
                        {t('No')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Phone_No')} *
                    </label>
                    <input
                      type='tel'
                      value={formData.selfEmployedPhone}
                      onChange={e => updateFormData('selfEmployedPhone', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                      placeholder='(999) 999-9999'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Deposits_Frequency')} *
                    </label>
                    <Select
                      value={formData.depositsFrequency}
                      onValueChange={value => updateFormData('depositsFrequency', value)}
                      placeholder={t('Choose_The_Frequency')}
                      options={[
                        { value: 'weekly', label: t('Weekly') },
                        { value: 'bi-weekly', label: t('Bi_Weekly') },
                        { value: 'monthly', label: t('Monthly') }
                      ]}
                    />
                  </div>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Next_Deposit_Date')} *
                    </label>
                    <input
                      type='date'
                      value={formData.nextDepositDate}
                      onChange={e => updateFormData('nextDepositDate', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    />
                  </div>
                  <div>
                    <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                      {t('Start_Date_Self_Employed')} *
                    </label>
                    <input
                      type='date'
                      value={formData.selfEmployedStartDate}
                      onChange={e => updateFormData('selfEmployedStartDate', e.target.value)}
                      className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                    />
                  </div>
                </div>
              </>
            )}

            {/* Retirement Plan, CSST/SAAQ, Parental Insurance - all just need Next Deposit Date */}
            {(formData.incomeSource === 'retirement-plan' || 
              formData.incomeSource === 'csst-saaq' || 
              formData.incomeSource === 'parental-insurance') && (
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Next_Deposit_Date')} *
                </label>
                <input
                  type='date'
                  value={formData.nextDepositDate}
                  onChange={e => updateFormData('nextDepositDate', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                />
              </div>
            )}
          </div>
        )}

        {/* Step 6: Confirmation & Submission */}
        {getCurrentStepKey() === 'confirmation' && (
          <div className='space-y-3 sm:space-y-4'>
            <div className='mb-6 text-center'>
              <h2 className='mb-2 text-3xl font-bold text-primary'>
                {t('Were_Almost_There')}
              </h2>
              <p className='text-text-secondary'>
                {t('Choose_Type_Loan_Send_Request')}
              </p>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              {/* Loan without documents */}
              <button
                type='button'
                onClick={() => updateFormData('loanType', 'without-documents')}
                className={`rounded-lg border-2 p-6 text-left transition-all hover:shadow-lg ${
                  formData.loanType === 'without-documents'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 bg-background'
                }`}
              >
                <h3 className='mb-4 text-xl font-semibold text-primary'>
                  {t('Loan_Without_Documents')}
                </h3>
                <div className='space-y-2 text-sm text-text-secondary'>
                  <p>
                    <strong>{t('IBV_Technology')}</strong>
                    {t('IBV_Description')}
                  </p>
                  <ul className='ml-4 list-disc space-y-1'>
                    <li className='font-semibold text-primary'>{t('Fast_Approval')}</li>
                    <li className='font-semibold text-primary'>{t('Much_Simpler')}</li>
                    <li className='font-semibold text-primary'>{t('Hundred_Percent_Safe')}</li>
                    <li className='text-green-600'>{t('No_Paper_Document_Required')}</li>
                  </ul>
                  <p className='mt-4 italic'>
                    {t('IBV_Redirect_Notice')}
                  </p>
                </div>
              </button>

              {/* Loan with documents */}
              <button
                type='button'
                onClick={() => updateFormData('loanType', 'with-documents')}
                className={`rounded-lg border-2 p-6 text-left transition-all hover:shadow-lg ${
                  formData.loanType === 'with-documents'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 bg-background'
                }`}
              >
                <h3 className='mb-4 text-xl font-semibold text-primary'>
                  {t('Loan_With_Documents')}
                </h3>
                <div className='space-y-2 text-sm text-text-secondary'>
                  <p>
                    {t('Email_Documents_Description')}
                  </p>
                  <ul className='ml-4 list-disc space-y-1'>
                    <li className='font-semibold text-primary'>{t('Bank_Statement')}</li>
                    <li className='font-semibold text-primary'>{t('Last_Pay_Stub')}</li>
                    <li className='font-semibold text-primary'>{t('Specimen_Check')}</li>
                    <li className='font-semibold text-primary'>{t('Proof_Of_Identity')}</li>
                  </ul>
                  <p className='mt-4 text-xs font-semibold text-red-600'>
                    {t('Fraud_Warning')}
                  </p>
                </div>
              </button>
            </div>

            {/* Confirmation Checkbox */}
            <div className='mt-6'>
              <label className='flex items-start'>
                <input
                  type='checkbox'
                  checked={formData.confirmInformation}
                  onChange={e => updateFormData('confirmInformation', e.target.checked)}
                  className='mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary'
                />
                <span className='ml-3 text-sm text-text-secondary'>
                  {t('Confirm_Information_Accurate')} *
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
              disabled={!formData.loanType || !formData.confirmInformation}
            >
              {t('Confirm')} →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
