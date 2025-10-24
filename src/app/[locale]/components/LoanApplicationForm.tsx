'use client'
import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Link } from '@/src/navigation'
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
  const params = useParams()
  const locale = params.locale as string

  // Update preferred language when locale changes
  useEffect(() => {
    if (locale && formData.preferredLanguage !== locale) {
      updateFormData('preferredLanguage', locale)
    }
  }, [locale])
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [ibvVerified, setIbvVerified] = useState(false)
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
      preferredLanguage: locale || 'en',
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
      title: t('Bank_Verification'),
      description: t('Verify_Bank_Account'),
      icon: (
        <svg
          className='h-6 w-6'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
          <path d='M7 11V7a5 5 0 0 1 10 0v4' />
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
      // For Quebec, 6 steps ending with IBV
      const stepKeys = ['personal', 'contact', 'financial', 'references', 'income', 'ibv']
      return stepKeys[currentStep - 1]
    } else {
      // For non-Quebec, skip financial (step 3), 5 steps ending with IBV
      const stepKeys = ['personal', 'contact', 'references', 'income', 'ibv']
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

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Prepare the data for API submission
      const submissionData = {
        // Personal Information
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        preferredLanguage: formData.preferredLanguage,
        
        // Address Information
        streetNumber: formData.streetNumber,
        streetName: formData.streetName,
        apartmentNumber: formData.apartmentNumber,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        movingDate: formData.movingDate,
        
        // Financial Obligations (Quebec only)
        ...(formData.province === 'Quebec' && {
          residenceStatus: formData.residenceStatus,
          grossSalary: formData.grossSalary,
          rentOrMortgageCost: formData.rentOrMortgageCost,
          heatingElectricityCost: formData.heatingElectricityCost,
          carLoan: formData.carLoan,
          furnitureLoan: formData.furnitureLoan,
        }),
        
        // References
        reference1FirstName: formData.reference1FirstName,
        reference1LastName: formData.reference1LastName,
        reference1Phone: formData.reference1Phone,
        reference1Relationship: formData.reference1Relationship,
        reference2FirstName: formData.reference2FirstName,
        reference2LastName: formData.reference2LastName,
        reference2Phone: formData.reference2Phone,
        reference2Relationship: formData.reference2Relationship,
        
        // Income Information
        incomeSource: formData.incomeSource,
        // Include income fields based on income source
        ...(formData.incomeSource === 'employed' && {
          occupation: formData.occupation,
          companyName: formData.companyName,
          supervisorName: formData.supervisorName,
          workPhone: formData.workPhone,
          post: formData.post,
          payrollFrequency: formData.payrollFrequency,
          dateHired: formData.dateHired,
          nextPayDate: formData.nextPayDate,
        }),
        ...(formData.incomeSource === 'employment-insurance' && {
          employmentInsuranceStartDate: formData.employmentInsuranceStartDate,
          nextDepositDate: formData.nextDepositDate,
        }),
        ...(formData.incomeSource === 'self-employed' && {
          paidByDirectDeposit: formData.paidByDirectDeposit,
          selfEmployedPhone: formData.selfEmployedPhone,
          depositsFrequency: formData.depositsFrequency,
          selfEmployedStartDate: formData.selfEmployedStartDate,
          nextDepositDate: formData.nextDepositDate,
        }),
        ...((['csst-saaq', 'parental-insurance', 'retirement-plan'].includes(formData.incomeSource)) && {
          nextDepositDate: formData.nextDepositDate,
        }),
        
        // Loan Details
        loanAmount: formData.loanAmount,
        loanType: 'without-documents', // All loans use IBV verification
        
        // Pre-qualification
        bankruptcyPlan: bankruptcyPlan,
        
        // IBV Verification completed
        ibvVerified: ibvVerified,
        
        // Confirmation & Consent
        confirmInformation: formData.confirmInformation,
        agreeTerms: formData.agreeTerms,
        agreePrivacy: formData.agreePrivacy,
        consentCredit: formData.consentCredit,
      }

      console.log('Submitting loan application:', submissionData)

      // Submit to API
      const response = await fetch('/api/loan-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      console.log('Application submitted successfully:', result)
      
      // Mark as submitted
    setIsSubmitted(true)
    
    // Clear localStorage after successful submission
    if (typeof window !== 'undefined') {
      localStorage.removeItem('loanFormData')
      localStorage.removeItem('loanFormCurrentStep')
      localStorage.removeItem('loanFormPreQualification')
      localStorage.removeItem('loanFormBankruptcyPlan')
      localStorage.removeItem('loanFormPreviousBorrower')
    }
    } catch (error: any) {
      console.error('Error submitting application:', error)
      setSubmitError(error.message || 'Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form to initial state (DEV only)
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      preferredLanguage: locale || 'en',
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
    })
    setCurrentStep(1)
    setBankruptcyPlan(false)
    setPreviousBorrower(false)
    setIbvVerified(false)
    setIsSubmitted(false)
    setSubmitError(null)
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('loanFormData')
      localStorage.removeItem('loanFormCurrentStep')
      localStorage.removeItem('loanFormPreQualification')
      localStorage.removeItem('loanFormBankruptcyPlan')
      localStorage.removeItem('loanFormPreviousBorrower')
    }
  }

  const fillRandomData = () => {
    const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Marc', 'Julie', 'Luc', 'Isabelle', 'André', 'Catherine']
    const lastNames = ['Tremblay', 'Gagnon', 'Roy', 'Côté', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagné']
    const streets = ['Rue Sainte-Catherine', 'Rue Saint-Denis', 'Boulevard René-Lévesque', 'Rue Sherbrooke', 'Avenue du Parc']
    const cities = ['Montreal', 'Laval', 'Quebec City', 'Gatineau', 'Longueuil']
    const provinces = ['Quebec', 'Ontario', 'British Columbia', 'Alberta', 'Manitoba']
    
    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const randomStreet = streets[Math.floor(Math.random() * streets.length)]
    const randomCity = cities[Math.floor(Math.random() * cities.length)]
    const randomProvince = provinces[Math.floor(Math.random() * provinces.length)]
    
    const randomData: FormData = {
      // Personal Information
      firstName: randomFirstName,
      lastName: randomLastName,
      email: `${randomFirstName.toLowerCase()}.${randomLastName.toLowerCase()}${Math.floor(Math.random() * 999)}@email.com`,
      phone: `${Math.floor(Math.random() * 2) === 0 ? '514' : '438'}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      dateOfBirth: `19${Math.floor(Math.random() * 30 + 70)}-${String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0')}`,
      preferredLanguage: Math.random() > 0.5 ? 'en' : 'fr',
      
      // Contact Details (Address)
      streetNumber: String(Math.floor(Math.random() * 9000 + 100)),
      streetName: randomStreet,
      apartmentNumber: Math.random() > 0.3 ? String(Math.floor(Math.random() * 500 + 1)) : '',
      city: randomCity,
      province: randomProvince,
      postalCode: `H${Math.floor(Math.random() * 9)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 9)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9)}`,
      movingDate: `20${Math.floor(Math.random() * 5 + 19)}-${String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0')}-15`,

      // Financial Obligations (Quebec only)
      residenceStatus: Math.random() > 0.5 ? 'tenant' : 'owner',
      grossSalary: String(Math.floor(Math.random() * 50000 + 30000)),
      rentOrMortgageCost: String(Math.floor(Math.random() * 1000 + 800)),
      heatingElectricityCost: String(Math.floor(Math.random() * 150 + 100)),
      carLoan: String(Math.floor(Math.random() * 500)),
      furnitureLoan: String(Math.floor(Math.random() * 200)),

      // References
      reference1FirstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      reference1LastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      reference1Phone: `514-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      reference1Relationship: ['friend', 'family', 'colleague', 'neighbor'][Math.floor(Math.random() * 4)],
      reference2FirstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      reference2LastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      reference2Phone: `514-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      reference2Relationship: ['friend', 'family', 'colleague', 'neighbor'][Math.floor(Math.random() * 4)],

      // Your Income (Employed example)
      incomeSource: 'employed',
      occupation: ['Software Developer', 'Sales Representative', 'Accountant', 'Teacher', 'Nurse', 'Manager'][Math.floor(Math.random() * 6)],
      companyName: ['Tech Corp', 'ABC Industries', 'XYZ Solutions', 'Global Services', 'Best Company'][Math.floor(Math.random() * 5)],
      supervisorName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      workPhone: `514-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      post: ['Full-time', 'Part-time', 'Contract'][Math.floor(Math.random() * 3)],
      payrollFrequency: ['weekly', 'bi-weekly', 'monthly'][Math.floor(Math.random() * 3)],
      dateHired: `20${Math.floor(Math.random() * 10 + 10)}-${String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0')}-15`,
      nextPayDate: `2025-${String(Math.floor(Math.random() * 2 + 1)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0')}`,
      employmentInsuranceStartDate: '',
      paidByDirectDeposit: '',
      selfEmployedPhone: '',
      depositsFrequency: '',
      selfEmployedStartDate: '',
      nextDepositDate: '',

      // Loan Details
      loanAmount: String(Math.floor(Math.random() * 10) * 100 + 500), // Random: 500, 600, 700...1500
      loanPurpose: '',
      repaymentPeriod: '',
      paymentFrequency: '',

      // Confirmation & Submission
      loanType: 'without-documents',
      confirmInformation: true,
      agreeTerms: true,
      agreePrivacy: true,
      consentCredit: true,
    }
    
    setFormData(randomData)
    setBankruptcyPlan(Math.random() > 0.8) // 20% chance of bankruptcy
    setIbvVerified(false) // Reset IBV verification when filling new data
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
      <div className='mx-auto max-w-5xl'>
        <div className='rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-[#097fa5]/10 p-6 sm:p-8 md:p-10'>
          {/* Header */}
          <div className='mb-8 text-center'>
            <div className='mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#333366] via-[#097fa5] to-[#0a95c2] shadow-xl shadow-[#097fa5]/30'>
              <svg className='h-8 w-8 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
              </svg>
            </div>
            <h2 className='mb-4 text-4xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent'>
              {t('Get_Quick_Loan_Quote')}
            </h2>
            <p className='text-lg text-gray-600'>
              {t('Answer_Simple_Questions')}
            </p>
          </div>

          {/* Requirements */}
          <div className='mb-8 grid gap-6 sm:gap-8 md:grid-cols-2'>
            {/* 18+ Requirement */}
            <div className='group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/30 p-6 text-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105'>
              <div className='mb-4 text-6xl font-bold bg-gradient-to-r from-[#333366] to-[#097fa5] bg-clip-text text-transparent'>18+</div>
              <p className='text-sm text-gray-600 font-medium'>{t('Must_Be_18')}</p>
            </div>

            {/* Canadian Resident Requirement */}
            <div className='group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/30 p-6 text-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105'>
              <div className='mb-4 text-6xl'>🍁</div>
              <p className='text-sm text-gray-600 font-medium'>
                {t('Must_Be_Canadian')}
              </p>
            </div>
          </div>

          {/* Bankruptcy Question */}
          <div className='mb-8'>
            <p className='mb-4 text-lg font-semibold text-[#333366]'>
              {t('Bankruptcy_Question')}
            </p>
            <div className='flex gap-4'>
              <button
                onClick={() => setBankruptcyPlan(true)}
                className={`flex-1 rounded-xl border-2 px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                  bankruptcyPlan
                    ? 'border-[#097fa5] bg-gradient-to-r from-[#333366] to-[#097fa5] text-white shadow-lg shadow-[#097fa5]/30'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#097fa5] hover:shadow-md'
                }`}
              >
                {t('Yes')}
              </button>
              <button
                onClick={() => setBankruptcyPlan(false)}
                className={`flex-1 rounded-xl border-2 px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                  !bankruptcyPlan
                    ? 'border-[#097fa5] bg-gradient-to-r from-[#333366] to-[#097fa5] text-white shadow-lg shadow-[#097fa5]/30'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#097fa5] hover:shadow-md'
                }`}
              >
                {t('No')}
              </button>
            </div>

            {/* Warning Message */}
            {bankruptcyPlan && (
              <div className='mt-4 rounded-xl border-2 border-red-500/50 bg-gradient-to-r from-red-50 to-red-100 p-4 shadow-lg'>
                <p className='text-sm font-semibold text-red-700'>
                  {t('Bankruptcy_Warning')}
                </p>
              </div>
            )}
          </div>

          {/* Previous Borrower Question */}
          <div className='mb-8'>
            <p className='mb-4 text-lg font-semibold text-[#333366]'>
              {t('Previous_Borrower_Question')}
            </p>
            <div className='flex gap-4'>
              <button
                onClick={() => setPreviousBorrower(true)}
                className={`flex-1 rounded-xl border-2 px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                  previousBorrower
                    ? 'border-[#097fa5] bg-gradient-to-r from-[#333366] to-[#097fa5] text-white shadow-lg shadow-[#097fa5]/30'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#097fa5] hover:shadow-md'
                }`}
              >
                {t('Yes')}
              </button>
              <button
                onClick={() => setPreviousBorrower(false)}
                className={`flex-1 rounded-xl border-2 px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                  !previousBorrower
                    ? 'border-[#097fa5] bg-gradient-to-r from-[#333366] to-[#097fa5] text-white shadow-lg shadow-[#097fa5]/30'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#097fa5] hover:shadow-md'
                }`}
              >
                {t('No')}
              </button>
            </div>
          </div>

          {/* Application Options */}
          <div className='space-y-4'>
            <div className='text-center mb-6'>
              <h3 className='text-xl font-semibold text-[#333366] mb-2'>
                {t('Choose_Application_Type')}
              </h3>
              <p className='text-gray-600'>
                {t('Select_Best_Option')}
              </p>
            </div>
            
            <div className='grid gap-4 md:grid-cols-2'>
              {/* Quick Apply Option */}
              <div className='group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 p-6 text-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105'>
                <div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg'>
                  <svg className='h-6 w-6 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
                  </svg>
                </div>
                <h4 className='mb-2 text-lg font-semibold text-green-800'>
                  {t('Quick_Apply')}
                </h4>
                <p className='mb-4 text-sm text-green-700'>
                  {t('Quick_Apply_Description')}
                </p>
                <Link href='/apply1'>
                  <Button
                    size='medium'
                    className='w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:scale-105 transition-all duration-300'
                  >
                    {t('Start_Quick_Apply')}
                  </Button>
                </Link>
              </div>

              {/* Full Application Option */}
              <div className='group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-6 text-center shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105'>
                <div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg'>
                  <svg className='h-6 w-6 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
                <h4 className='mb-2 text-lg font-semibold text-blue-800'>
                  {t('Full_Application')}
                </h4>
                <p className='mb-4 text-sm text-blue-700'>
                  {t('Full_Application_Description')}
                </p>
                <Button
                  size='medium'
                  onClick={() => setShowPreQualification(false)}
                  className='w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-300'
                >
                  {t('Start_Full_Application')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-5xl'>
      {/* Start Over Button */}
      <div className='mb-6 flex justify-end px-2 sm:px-0'>
        <button
          onClick={handleStartOver}
          className='rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 text-sm text-gray-600 transition-all duration-300 hover:from-[#097fa5]/10 hover:to-[#0a95c2]/10 hover:text-[#333366] hover:shadow-md'
        >
          ← {t('Back_To_PreQualification') || 'Back to Pre-qualification'}
        </button>
      </div>

      {/* Step Indicators - Desktop Version (hidden on mobile) */}
      <div className='mb-8 hidden sm:block'>
        <div className='relative mx-auto max-w-4xl'>
          {/* Background gradient line */}
          <div className='absolute top-6 left-6 right-6 h-0.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200'></div>
          
          <div className='relative flex items-center justify-between'>
          {stepsWithNumbers.map((step, index) => (
              <div key={step.number} className='flex flex-col items-center relative'>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500 shadow-lg z-10 ${
                    currentStep >= step.number
                      ? 'bg-gradient-to-br from-[#333366] via-[#097fa5] to-[#0a95c2] text-white shadow-xl shadow-[#097fa5]/30 scale-110'
                      : 'bg-white text-gray-400 border-2 border-gray-200 hover:border-[#097fa5]'
                  }`}
                >
                  {currentStep > step.number ? (
                    <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>
                <div className={`mt-3 text-center text-xs font-semibold transition-colors duration-300 ${
                  currentStep >= step.number ? 'text-[#333366]' : 'text-gray-500'
                }`}>
                  {step.title}
              </div>
                </div>
          ))}
          </div>
        </div>
      </div>

      {/* Mobile Step Indicator - Compact dots version */}
      <div className='mb-6 block px-2 sm:hidden'>
        {/* Progress Text */}
        <div className='mb-3 text-center text-sm font-semibold text-[#333366]'>
          {t('Step')} {currentStep} {t('Of')} {stepsWithNumbers.length}
        </div>
        {/* Dots */}
        <div className='flex items-center justify-center gap-2'>
          {stepsWithNumbers.map((step) => (
            <div
              key={step.number}
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                currentStep === step.number
                  ? 'w-8 bg-gradient-to-r from-[#333366] to-[#097fa5] shadow-lg shadow-[#097fa5]/30'
                  : currentStep > step.number
                  ? 'bg-gradient-to-r from-[#333366] to-[#097fa5] shadow-lg shadow-[#097fa5]/30'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        {/* Current Step Title */}
        <div className='mt-3 text-center text-sm font-bold text-[#333366]'>
          {stepsWithNumbers[currentStep - 1]?.title}
        </div>
      </div>

      {/* Form Content */}
      <div className='rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-[#097fa5]/10 p-6 sm:p-8'>
        {/* DEV ONLY: Developer Tools */}
        {process.env.NODE_ENV === 'development' && (
          <div className='mb-4 flex gap-3 justify-end'>
            <button
              onClick={resetForm}
              type='button'
              className='rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md hover:from-gray-700 hover:to-gray-800'
            >
              🔄 Reset Form
            </button>
            <button
              onClick={fillRandomData}
              type='button'
              className='rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md hover:from-purple-700 hover:to-pink-700'
            >
              🎲 Fill Random Data
            </button>
          </div>
        )}
        
        {/* Step Title - Hidden on mobile since it's shown in mobile indicator */}
        <div className='mb-8 hidden sm:mb-8 sm:block text-center'>
          <h2 className='mb-3 text-3xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent'>
            {stepsWithNumbers[currentStep - 1]?.title}
          </h2>
          <p className='text-gray-600 text-lg'>
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
                  placeholder='e.g., Jean'
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
                  placeholder='e.g., Tremblay'
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
                  {t('Phone_Number')} *
                </label>
                <input
                  type='tel'
                  value={formData.phone}
                  onChange={e => updateFormData('phone', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='514-555-1234'
                />
              </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-primary sm:mb-2 sm:text-sm'>
                  {t('Email_Address')} *
                </label>
                <input
                  type='email'
                  value={formData.email}
                  onChange={e => updateFormData('email', e.target.value)}
                  className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-background p-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 sm:p-3 sm:text-base'
                  placeholder='jean.tremblay@email.com'
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
                  options={CANADIAN_PROVINCES.map(province => ({
                    value: province,
                    label: province
                  }))}
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
                  placeholder='123'
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
                  placeholder='Rue Sainte-Catherine'
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
                  placeholder='Apt 5'
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
                      placeholder='First name'
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
                      placeholder='Last name'
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
                      placeholder='Phone number'
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
                      placeholder='Relationship'
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
                      placeholder='First name'
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
                      placeholder='Last name'
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
                      placeholder='Phone number'
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
                      placeholder='Relationship'
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
                      placeholder='514-555-1234'
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
                      placeholder='514-555-1234'
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

        {/* Step 6: Bank Verification (IBV) */}
        {getCurrentStepKey() === 'ibv' && (
          <div className='space-y-6'>
            <div className='mb-8 text-center'>
              <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#333366] via-[#097fa5] to-[#0a95c2] shadow-xl shadow-[#097fa5]/30'>
                <svg className='h-8 w-8 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
                  <path d='M7 11V7a5 5 0 0 1 10 0v4' />
                </svg>
              </div>
              <h2 className='mb-3 text-3xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent'>
                {t('Bank_Verification')}
              </h2>
              <p className='text-gray-600 text-lg'>
                {t('IBV_Step_Description')}
              </p>
            </div>

            {!ibvVerified ? (
              <>
                <div className='rounded-lg bg-blue-50 p-4 border border-blue-200'>
                  <div className='flex items-start'>
                    <div className='flex-shrink-0'>
                      <svg className='h-6 w-6 text-blue-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                    </div>
                    <div className='ml-3'>
                      <h3 className='text-sm font-medium text-blue-800'>
                        {t('Why_Verify_Bank')}
                </h3>
                      <div className='mt-2 text-sm text-blue-700'>
                        <ul className='list-disc ml-4 space-y-1'>
                          <li>{t('Instant_Approval')}</li>
                          <li>{t('Secure_Connection')}</li>
                          <li>{t('No_Documents_Needed')}</li>
                  </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated IBV iframe */}
                <div className='rounded-lg border-2 border-gray-300 bg-white shadow-lg overflow-hidden'>
                  <div className='bg-gradient-to-r from-blue-600 to-blue-700 p-3 text-white'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                        </svg>
                        <span className='text-sm font-semibold'>Secure Bank Verification</span>
                      </div>
                      <div className='flex items-center gap-1'>
                        <div className='h-2 w-2 bg-green-400 rounded-full animate-pulse'></div>
                        <span className='text-xs'>Encrypted</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className='p-6 space-y-4'>
                    <div className='text-center'>
                      <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                        Connect Your Bank Account
                      </h3>
                      <p className='text-sm text-gray-600'>
                        Select your financial institution to continue
                  </p>
                </div>

                    {/* Simulated bank selection */}
                    <div className='space-y-3'>
                      <div className='grid grid-cols-2 gap-3'>
                        <button
                          type='button'
                          className='flex items-center justify-center gap-2 rounded-lg border-2 border-gray-200 p-4 hover:border-blue-500 hover:bg-blue-50 transition-all'
                          onClick={() => {
                            setTimeout(() => setIbvVerified(true), 1500)
                          }}
                        >
                          <div className='h-8 w-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold'>
                            TD
                          </div>
                          <span className='text-sm font-medium'>TD Bank</span>
              </button>

              <button
                type='button'
                          className='flex items-center justify-center gap-2 rounded-lg border-2 border-gray-200 p-4 hover:border-blue-500 hover:bg-blue-50 transition-all'
                          onClick={() => {
                            setTimeout(() => setIbvVerified(true), 1500)
                          }}
                        >
                          <div className='h-8 w-8 bg-red-700 rounded-full flex items-center justify-center text-white font-bold'>
                            RBC
                          </div>
                          <span className='text-sm font-medium'>RBC</span>
                        </button>

                        <button
                          type='button'
                          className='flex items-center justify-center gap-2 rounded-lg border-2 border-gray-200 p-4 hover:border-blue-500 hover:bg-blue-50 transition-all'
                          onClick={() => {
                            setTimeout(() => setIbvVerified(true), 1500)
                          }}
                        >
                          <div className='h-8 w-8 bg-black rounded-full flex items-center justify-center text-white font-bold'>
                            BM
                          </div>
                          <span className='text-sm font-medium'>BMO</span>
                        </button>

                        <button
                          type='button'
                          className='flex items-center justify-center gap-2 rounded-lg border-2 border-gray-200 p-4 hover:border-blue-500 hover:bg-blue-50 transition-all'
                          onClick={() => {
                            setTimeout(() => setIbvVerified(true), 1500)
                          }}
                        >
                          <div className='h-8 w-8 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold'>
                            BN
                          </div>
                          <span className='text-sm font-medium'>Desjardins</span>
                        </button>
                      </div>

                      <button
                        type='button'
                        className='w-full rounded-lg border-2 border-gray-200 p-3 text-sm text-gray-600 hover:border-blue-500 hover:bg-blue-50 transition-all'
                        onClick={() => {
                          setTimeout(() => setIbvVerified(true), 1500)
                        }}
                      >
                        + More Banks
                      </button>
                    </div>

                    <div className='text-center pt-4 border-t border-gray-200'>
                      <p className='text-xs text-gray-500'>
                        🔒 Your banking credentials are never shared with us
                  </p>
                </div>
                  </div>
                </div>

                {/* Skip option (DEV only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className='text-center'>
                    <button
                      type='button'
                      onClick={() => setIbvVerified(true)}
                      className='text-sm text-gray-500 hover:text-gray-700 underline'
                    >
                      Skip verification (DEV)
              </button>
            </div>
                )}
              </>
            ) : (
              <div className='rounded-lg bg-green-50 p-6 border-2 border-green-200'>
                <div className='flex items-center justify-center mb-4'>
                  <div className='h-16 w-16 bg-green-500 rounded-full flex items-center justify-center'>
                    <svg className='h-10 w-10 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                    </svg>
                  </div>
                </div>
                <h3 className='text-xl font-bold text-green-800 text-center mb-2'>
                  {t('Bank_Verified_Successfully')}
                </h3>
                <p className='text-center text-green-700'>
                  {t('Your_Bank_Account_Verified')}
                </p>
              </div>
            )}

            {/* Confirmation - Only show when verified */}
            {ibvVerified && (
              <div className='mt-8 rounded-xl border-2 border-[#097fa5]/20 bg-gradient-to-r from-[#097fa5]/5 to-[#0a95c2]/5 p-6 shadow-lg'>
                <label className='flex items-start cursor-pointer group'>
                <input
                  type='checkbox'
                  checked={formData.confirmInformation}
                    onChange={e => {
                      const isChecked = e.target.checked
                      // When user accepts, set all consent fields to true
                      updateFormData('confirmInformation', isChecked)
                      updateFormData('agreeTerms', isChecked)
                      updateFormData('agreePrivacy', isChecked)
                      updateFormData('consentCredit', isChecked)
                    }}
                    className='mt-1 h-6 w-6 rounded border-2 border-gray-300 text-[#097fa5] focus:ring-2 focus:ring-[#097fa5] cursor-pointer transition-all group-hover:border-[#097fa5]'
                  />
                  <span className='ml-4 text-sm text-gray-700 font-medium'>
                    {t('Confirm_Information_Accurate')} <span className='text-red-500 font-bold'>*</span>
                </span>
              </label>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {submitError && (
          <div className='mt-6 rounded-lg bg-red-50 p-4 border border-red-200'>
            <div className='flex items-start'>
              <div className='flex-shrink-0'>
                <svg className='h-5 w-5 text-red-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>
                  {t('Submission_Error') || 'Error submitting application'}
                </h3>
                <p className='mt-1 text-sm text-red-700'>{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className='mt-8 flex justify-between gap-4'>
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            variant='secondary'
            size='large'
            className={`${currentStep === 1 ? 'invisible' : ''} bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 hover:from-gray-200 hover:to-gray-300 shadow-md transition-all duration-300`}
          >
            {t('Previous')}
          </Button>

          {getCurrentStepKey() === 'ibv' ? (
            <Button 
              onClick={handleSubmit} 
              size='large'
              disabled={!ibvVerified || !formData.confirmInformation || isSubmitting}
              className={`px-8 py-3 text-lg font-semibold shadow-lg transition-all duration-300 ${
                !ibvVerified || !formData.confirmInformation || isSubmitting
                  ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] text-white hover:shadow-xl hover:shadow-[#097fa5]/30 hover:scale-105'
              }`}
            >
              {isSubmitting 
                ? t('Submitting') + '...' 
                : !ibvVerified 
                  ? t('Complete_Verification_First')
                  : !formData.confirmInformation
                    ? t('Accept_Terms_To_Continue')
                    : t('Submit_Application')
              }
            </Button>
          ) : (
            <Button
              onClick={nextStep} 
              size='large'
              className='px-8 py-3 text-lg font-semibold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] text-white shadow-lg shadow-[#097fa5]/30 hover:shadow-xl hover:scale-105 transition-all duration-300'
            >
              {t('Continue')} →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
