'use client'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import Button from '../components/Button'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  restoreInveriteConnection,
  addInveriteListener,
  persistInveriteConnection,
  type InveriteConnection
} from '@/src/lib/ibv/inverite'
import { createIbvProviderData, determineIbvStatus } from '@/src/lib/supabase/ibv-helpers'
import Step1PersonalInfo from './components/Step1PersonalInfo'
import Step2LoanDetails from './components/Step2LoanDetails'
import Step3Confirmation from './components/Step3Confirmation'
import Step4BankVerification from './components/Step4BankVerification'

interface MicroLoanFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  preferredLanguage: string
  province: string
  loanAmount: string
  confirmInformation: boolean
}

export default function MicroLoanApplicationPage() {
  const t = useTranslations('')
  const params = useParams()
  const locale = params.locale as string

  const [formData, setFormData] = useState<MicroLoanFormData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('microLoanFormData')
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
      province: '',
      loanAmount: '',
      confirmInformation: false
    }
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showIBV, setShowIBV] = useState(false)
  const [ibvVerified, setIbvVerified] = useState(false)
  const [ibvStep, setIbvStep] = useState(1)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [inveriteConnection, setInveriteConnection] = useState<InveriteConnection | null>(null)
  const [inveriteRequestGuid, setInveriteRequestGuid] = useState<string | null>(null)

  // Development mode detection
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Update preferred language when locale changes
  useEffect(() => {
    if (locale && formData.preferredLanguage !== locale) {
      updateFormData('preferredLanguage', locale)
    }
  }, [locale, formData.preferredLanguage])

  // Restore Inverite connection from storage on mount
  useEffect(() => {
    const restored = restoreInveriteConnection()
    if (restored) {
      setInveriteConnection(restored)
      setIbvVerified(true)
    }
  }, [])

  // Inverite event listener
  useEffect(() => {
    if (currentStep !== 4) return

    const cleanup = addInveriteListener(true, {
      onSuccess: (connection) => {
        setInveriteConnection(connection)
        // Store requestGuid if available
        if (connection.requestGuid) {
          setInveriteRequestGuid(connection.requestGuid)
        }
        persistInveriteConnection(connection)
        setIbvVerified(true)
        setIsVerifying(false)
        handleSubmit(connection)
      },
      onError: () => {
        setInveriteConnection(prev => (prev ? { ...prev, verificationStatus: 'failed' } : null))
        setIbvVerified(false)
        setIsVerifying(false)
        alert('Bank verification failed. Please try again.')
      },
      onCancel: () => {
        setInveriteConnection(prev => (prev ? { ...prev, verificationStatus: 'cancelled' } : null))
        setIsVerifying(false)
      }
    })

    return cleanup
  }, [currentStep])

  // Save form data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('microLoanFormData', JSON.stringify(formData))
    }
  }, [formData])

  const updateFormData = (
    field: keyof MicroLoanFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Development helper functions
  const fillRandomData = () => {
    const firstNames = [
      'Jean',
      'Marie',
      'Pierre',
      'Sophie',
      'Michel',
      'Isabelle',
      'Andre',
      'Nathalie',
      'David',
      'Julie'
    ]
    const lastNames = [
      'Tremblay',
      'Gagnon',
      'Roy',
      'Cote',
      'Bouchard',
      'Gauthier',
      'Morin',
      'Lavoie',
      'Fortin',
      'Gagne'
    ]
    const provinces = [
      'Quebec',
      'Ontario',
      'British Columbia',
      'Alberta',
      'Manitoba',
      'Nova Scotia',
      'New Brunswick',
      'Saskatchewan'
    ]
    const loanAmounts = [
      '250',
      '300',
      '400',
      '500',
      '600',
      '750',
      '800',
      '900',
      '1000',
      '1250',
      '1500'
    ]

    const randomFirstName =
      firstNames[Math.floor(Math.random() * firstNames.length)]
    const randomLastName =
      lastNames[Math.floor(Math.random() * lastNames.length)]
    const randomProvince =
      provinces[Math.floor(Math.random() * provinces.length)]
    const randomLoanAmount =
      loanAmounts[Math.floor(Math.random() * loanAmounts.length)]

    // Remove accents for email generation
    const cleanFirstName = randomFirstName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const cleanLastName = randomLastName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    const randomData: MicroLoanFormData = {
      firstName: randomFirstName,
      lastName: randomLastName,
      email: `${cleanFirstName.toLowerCase()}.${cleanLastName.toLowerCase()}${Math.floor(Math.random() * 999)}@email.com`,
      phone: `${Math.floor(Math.random() * 2) === 0 ? '514' : '438'}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      dateOfBirth: `19${Math.floor(Math.random() * 30 + 70)}-${String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0')}`,
      preferredLanguage: locale || 'en',
      province: randomProvince,
      loanAmount: randomLoanAmount,
      confirmInformation: true
    }

    setFormData(randomData)
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      preferredLanguage: locale || 'en',
      province: '',
      loanAmount: '',
      confirmInformation: false
    })
    setCurrentStep(1)
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const simulateBankVerification = () => {
    setIsVerifying(true)
    setIbvStep(1)

    // Simulate the verification process
    setTimeout(() => {
      setIbvStep(2)
      setTimeout(() => {
        setIbvStep(3)
        setTimeout(() => {
          setIbvStep(4)
          setTimeout(() => {
            setIbvVerified(true)
            setIsVerifying(false)
            // Submit directly after verification is complete
            handleSubmit()
          }, 1000)
        }, 1500)
      }, 1500)
    }, 1500)
  }

  const handleIBVComplete = () => {
    simulateBankVerification()
  }

  const generateRandomData = () => {
    const streets = [
      'Main Street',
      'King Street',
      'Queen Street',
      'First Avenue',
      'Second Avenue',
      'Park Avenue',
      'Oak Street',
      'Pine Street'
    ]
    const cities = [
      'Montreal',
      'Toronto',
      'Vancouver',
      'Calgary',
      'Ottawa',
      'Edmonton',
      'Winnipeg',
      'Quebec City'
    ]
    const occupations = [
      'Software Developer',
      'Teacher',
      'Nurse',
      'Engineer',
      'Manager',
      'Sales Representative',
      'Accountant',
      'Marketing Specialist'
    ]
    const companies = [
      'Tech Corp',
      'Global Solutions',
      'Innovation Inc',
      'Future Systems',
      'Digital Works',
      'Creative Agency',
      'Business Partners',
      'Enterprise Ltd'
    ]
    const supervisors = [
      'John Smith',
      'Marie Dubois',
      'David Johnson',
      'Sarah Wilson',
      'Michael Brown',
      'Lisa Davis',
      'Robert Miller',
      'Jennifer Garcia'
    ]
    const posts = [
      'Senior Developer',
      'Team Lead',
      'Manager',
      'Specialist',
      'Coordinator',
      'Analyst',
      'Consultant',
      'Director'
    ]

    const randomStreet = streets[Math.floor(Math.random() * streets.length)]
    const randomCity = cities[Math.floor(Math.random() * cities.length)]
    const randomOccupation =
      occupations[Math.floor(Math.random() * occupations.length)]
    const randomCompany =
      companies[Math.floor(Math.random() * companies.length)]
    const randomSupervisor =
      supervisors[Math.floor(Math.random() * supervisors.length)]
    const randomPost = posts[Math.floor(Math.random() * posts.length)]

    return {
      streetNumber: String(Math.floor(Math.random() * 9000 + 100)),
      streetName: randomStreet,
      city: randomCity,
      postalCode: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}`,
      movingDate: new Date(
        Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)
      )
        .toISOString()
        .split('T')[0],
      occupation: randomOccupation,
      companyName: randomCompany,
      supervisorName: randomSupervisor,
      workPhone: `${Math.floor(Math.random() * 2) === 0 ? '514' : '438'}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      post: randomPost,
      payrollFrequency: ['weekly', 'bi-weekly', 'monthly'][
        Math.floor(Math.random() * 3)
      ],
      dateHired: new Date(
        Date.now() - Math.floor(Math.random() * 5 * 365 * 24 * 60 * 60 * 1000)
      )
        .toISOString()
        .split('T')[0],
      nextPayDate: new Date(
        Date.now() + Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
      )
        .toISOString()
        .split('T')[0],
      grossSalary: String(Math.floor(Math.random() * 5000 + 2000)),
      rentOrMortgageCost: String(Math.floor(Math.random() * 1500 + 500)),
      heatingElectricityCost: String(Math.floor(Math.random() * 300 + 100)),
      carLoan: String(Math.floor(Math.random() * 500)),
      furnitureLoan: String(Math.floor(Math.random() * 200))
    }
  }

  const handleSubmit = async (inveriteData?: InveriteConnection) => {
    setIsSubmitting(true)
    try {
      // Generate random data for missing fields after IBV verification
      const randomData = generateRandomData()
      
      // Use provided Inverite data or fall back to state
      const finalInveriteData = inveriteData || inveriteConnection

      // Ensure requestGuid is included if we have it stored separately
      const enhancedInveriteData = finalInveriteData
        ? {
            ...finalInveriteData,
            requestGuid: finalInveriteData.requestGuid || inveriteRequestGuid || undefined
          }
        : null

      // Create IBV provider data using helper function
      const ibvProviderData = enhancedInveriteData 
        ? createIbvProviderData('inverite', enhancedInveriteData)
        : null
      
      const ibvStatus = finalInveriteData
        ? determineIbvStatus('inverite', finalInveriteData.verificationStatus)
        : null

      const response = await fetch('/api/loan-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Personal Information (from form)
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          preferredLanguage: formData.preferredLanguage,

          // Address Information (generated after IBV)
          streetNumber: randomData.streetNumber,
          streetName: randomData.streetName,
          apartmentNumber: '',
          city: randomData.city,
          province: formData.province,
          postalCode: randomData.postalCode,
          movingDate: randomData.movingDate,

          // Loan Details
          loanAmount: formData.loanAmount,
          loanType: 'without-documents',
          incomeSource: 'employed',

          // References (generated after IBV)
          reference1FirstName: 'John',
          reference1LastName: 'Doe',
          reference1Phone: '514-555-0001',
          reference1Relationship: 'Friend',
          reference2FirstName: 'Jane',
          reference2LastName: 'Smith',
          reference2Phone: '514-555-0002',
          reference2Relationship: 'Colleague',

          // Quebec-specific fields (only if Quebec)
          ...(formData.province === 'Quebec' && {
            residenceStatus: 'tenant',
            grossSalary: randomData.grossSalary,
            rentOrMortgageCost: randomData.rentOrMortgageCost,
            heatingElectricityCost: randomData.heatingElectricityCost,
            carLoan: randomData.carLoan,
            furnitureLoan: randomData.furnitureLoan
          }),

          // Income fields (generated after IBV)
          occupation: randomData.occupation,
          companyName: randomData.companyName,
          supervisorName: randomData.supervisorName,
          workPhone: randomData.workPhone,
          post: randomData.post,
          payrollFrequency: randomData.payrollFrequency,
          dateHired: randomData.dateHired,
          nextPayDate: randomData.nextPayDate,

          // Modular IBV data (provider-agnostic)
          ibvProvider: finalInveriteData ? 'inverite' : null,
          ibvStatus: ibvStatus,
          ibvProviderData: ibvProviderData,
          ibvVerifiedAt: ibvStatus === 'verified' ? new Date().toISOString() : null,

          // Other required fields
          bankruptcyPlan: false,
          confirmInformation: formData.confirmInformation
        })
      })

      if (response.ok) {
        // Clear form data and Inverite connection
        localStorage.removeItem('microLoanFormData')
        localStorage.removeItem('inveriteConnection')
        // Show success message
        setIsSubmitted(true)
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error || 'Failed to submit application'}`)
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Error submitting application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.phone &&
          formData.dateOfBirth
        )
      case 2:
        return formData.province && formData.loanAmount
      case 3:
        return formData.confirmInformation
      case 4:
        return ibvVerified
      default:
        return false
    }
  }

  // If form is submitted, show success message
  if (isSubmitted) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 px-4 py-8'>
        <div className='mx-auto max-w-2xl'>
          <div className='rounded-2xl border border-white/20 bg-white/80 p-6 text-center shadow-xl shadow-[#097fa5]/10 backdrop-blur-xl sm:p-8'>
            <div className='mb-8 flex justify-center'>
              <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl shadow-green-500/30'>
                <span className='text-4xl text-white'>✓</span>
              </div>
            </div>
            <h2 className='mb-4 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-3xl font-bold text-transparent'>
              {t('Application_Submitted')}
            </h2>
            <p className='mb-6 text-lg text-gray-600'>
              {t('Application_Success_Message')}
            </p>
            <div className='mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6'>
              <p className='mb-2 text-sm text-green-700'>
                {t('Application_Reference')}
              </p>
              <p className='text-2xl font-bold text-green-800'>
                FL-{Date.now().toString().slice(-8)}
              </p>
            </div>
            <div className='space-y-4'>
              <p className='text-sm text-gray-600'>
                {t('Application_Next_Steps')}
              </p>
              <div className='grid gap-3 text-sm text-gray-600'>
                <div className='flex items-center justify-center space-x-2'>
                  <svg
                    className='h-4 w-4 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>{t('Bank_Verification_Complete')}</span>
                </div>
                <div className='flex items-center justify-center space-x-2'>
                  <svg
                    className='h-4 w-4 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>{t('Application_Under_Review')}</span>
                </div>
                <div className='flex items-center justify-center space-x-2'>
                  <svg
                    className='h-4 w-4 text-blue-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>{t('Approval_Notification')}</span>
                </div>
              </div>
            </div>
            <div className='mt-8'>
              <Link
                href='/'
                className='inline-flex items-center rounded-lg bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] px-6 py-3 font-medium text-white shadow-lg shadow-[#097fa5]/30 transition-all duration-300 hover:scale-105 hover:shadow-xl'
              >
                <svg
                  className='mr-2 h-5 w-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
                  />
                </svg>
                {t('Back_To_Home')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 px-4 py-4 sm:py-8'>
      <div className='mx-auto max-w-2xl'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <div className='mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#333366] via-[#097fa5] to-[#0a95c2] shadow-xl shadow-[#097fa5]/30'>
            <svg
              className='h-8 w-8 text-white'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
              />
            </svg>
          </div>
          <h1 className='mb-4 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-4xl font-bold text-transparent'>
            {t('Quick_Micro_Loan')}
          </h1>
          <p className='text-lg text-gray-600'>
            {t('Get_Approved_In_Minutes')}
          </p>
        </div>

        {/* Development Tools */}
        {isDevelopment && (
          <div className='mb-6 flex flex-col justify-center gap-3 sm:flex-row'>
            <button
              onClick={fillRandomData}
              className='rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg'
            >
              🎲 Fill Random Data
            </button>
            <button
              onClick={resetForm}
              className='rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg'
            >
              🔄 Reset Form
            </button>
          </div>
        )}

        {/* Progress Bar */}
        <div className='mb-8'>
          <div className='mb-4 flex items-center justify-between'>
            <span className='text-sm font-medium text-gray-600'>
              Step {currentStep} of 4
            </span>
            <span className='text-sm font-medium text-gray-600'>
              {Math.round((currentStep / 4) * 100)}% Complete
            </span>
          </div>
          <div className='h-2 w-full rounded-full bg-gray-200'>
            <div
              className='h-2 rounded-full bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] transition-all duration-300'
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className='rounded-2xl border border-white/20 bg-white/80 p-4 shadow-xl shadow-[#097fa5]/10 backdrop-blur-xl sm:p-6 md:p-8'>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <Step1PersonalInfo formData={formData} onUpdate={updateFormData} />
          )}

          {/* Step 2: Loan Details */}
          {currentStep === 2 && (
            <Step2LoanDetails formData={formData} onUpdate={updateFormData} />
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <Step3Confirmation formData={formData} onUpdate={updateFormData} />
          )}

          {/* Step 4: Bank Verification */}
          {currentStep === 4 && (
            <Step4BankVerification 
              formData={formData} 
              ibvVerified={ibvVerified}
              onRequestGuidReceived={(requestGuid) => setInveriteRequestGuid(requestGuid)}
            />
          )}

          {/* Navigation Buttons */}
          <div className='mt-8 flex flex-col gap-4 sm:flex-row'>
            {currentStep > 1 && (
              <Button
                onClick={prevStep}
                variant='secondary'
                size='large'
                className='px-8 py-4'
              >
                {t('Back')}
              </Button>
            )}
            <Button
              onClick={() => currentStep === 4 ? handleSubmit() : nextStep()}
              disabled={!isStepValid()}
              size='large'
              className='ml-auto bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] px-8 py-4 text-white shadow-xl shadow-[#097fa5]/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
            >
              {currentStep === 3
                ? t('Continue_To_Verification')
                : currentStep === 4
                  ? t('Submit_Application')
                  : t('Next')}
            </Button>
          </div>
        </div>

        {/* Back to main apply page */}
        <div className='mt-8 text-center'>
          <Link
            href='/apply'
            className='text-sm text-primary transition-colors duration-200 hover:text-secondary'
          >
            {t('Back_To_Full_Application')}
          </Link>
        </div>
      </div>
    </div>
  )
}

