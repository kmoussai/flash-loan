'use client'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import Button from '../components/Button'
import Select from '../components/Select'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

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

  // Development mode detection
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Update preferred language when locale changes
  useEffect(() => {
    if (locale && formData.preferredLanguage !== locale) {
      updateFormData('preferredLanguage', locale)
    }
  }, [locale, formData.preferredLanguage])

  // Save form data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('microLoanFormData', JSON.stringify(formData))
    }
  }, [formData])

  const updateFormData = (field: keyof MicroLoanFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Development helper functions
  const fillRandomData = () => {
    const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Michel', 'Isabelle', 'Andre', 'Nathalie', 'David', 'Julie']
    const lastNames = ['Tremblay', 'Gagnon', 'Roy', 'Cote', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagne']
    const provinces = ['Quebec', 'Ontario', 'British Columbia', 'Alberta', 'Manitoba', 'Nova Scotia', 'New Brunswick', 'Saskatchewan']
    const loanAmounts = ['250', '300', '400', '500', '600', '750', '800', '900', '1000', '1250', '1500']
    
    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const randomProvince = provinces[Math.floor(Math.random() * provinces.length)]
    const randomLoanAmount = loanAmounts[Math.floor(Math.random() * loanAmounts.length)]
    
    // Remove accents for email generation
    const cleanFirstName = randomFirstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const cleanLastName = randomLastName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    
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
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowIBV(true)
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
    const streets = ['Main Street', 'King Street', 'Queen Street', 'First Avenue', 'Second Avenue', 'Park Avenue', 'Oak Street', 'Pine Street']
    const cities = ['Montreal', 'Toronto', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City']
    const occupations = ['Software Developer', 'Teacher', 'Nurse', 'Engineer', 'Manager', 'Sales Representative', 'Accountant', 'Marketing Specialist']
    const companies = ['Tech Corp', 'Global Solutions', 'Innovation Inc', 'Future Systems', 'Digital Works', 'Creative Agency', 'Business Partners', 'Enterprise Ltd']
    const supervisors = ['John Smith', 'Marie Dubois', 'David Johnson', 'Sarah Wilson', 'Michael Brown', 'Lisa Davis', 'Robert Miller', 'Jennifer Garcia']
    const posts = ['Senior Developer', 'Team Lead', 'Manager', 'Specialist', 'Coordinator', 'Analyst', 'Consultant', 'Director']
    
    const randomStreet = streets[Math.floor(Math.random() * streets.length)]
    const randomCity = cities[Math.floor(Math.random() * cities.length)]
    const randomOccupation = occupations[Math.floor(Math.random() * occupations.length)]
    const randomCompany = companies[Math.floor(Math.random() * companies.length)]
    const randomSupervisor = supervisors[Math.floor(Math.random() * supervisors.length)]
    const randomPost = posts[Math.floor(Math.random() * posts.length)]
    
    return {
      streetNumber: String(Math.floor(Math.random() * 9000 + 100)),
      streetName: randomStreet,
      city: randomCity,
      postalCode: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}`,
      movingDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      occupation: randomOccupation,
      companyName: randomCompany,
      supervisorName: randomSupervisor,
      workPhone: `${Math.floor(Math.random() * 2) === 0 ? '514' : '438'}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      post: randomPost,
      payrollFrequency: ['weekly', 'bi-weekly', 'monthly'][Math.floor(Math.random() * 3)],
      dateHired: new Date(Date.now() - Math.floor(Math.random() * 5 * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      nextPayDate: new Date(Date.now() + Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      grossSalary: String(Math.floor(Math.random() * 5000 + 2000)),
      rentOrMortgageCost: String(Math.floor(Math.random() * 1500 + 500)),
      heatingElectricityCost: String(Math.floor(Math.random() * 300 + 100)),
      carLoan: String(Math.floor(Math.random() * 500)),
      furnitureLoan: String(Math.floor(Math.random() * 200))
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Generate random data for missing fields after IBV verification
      const randomData = generateRandomData()
      
      const response = await fetch('/api/loan-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
          
          // Other required fields
          bankruptcyPlan: false,
          confirmInformation: formData.confirmInformation
        }),
      })

      if (response.ok) {
        // Clear form data
        localStorage.removeItem('microLoanFormData')
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
        return formData.firstName && formData.lastName && formData.email && formData.phone && formData.dateOfBirth
      case 2:
        return formData.province && formData.loanAmount
      case 3:
        return formData.confirmInformation
      default:
        return false
    }
  }

  // If form is submitted, show success message
  if (isSubmitted) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 py-8 px-4'>
        <div className='mx-auto max-w-2xl'>
          <div className='rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-[#097fa5]/10 p-6 sm:p-8 text-center'>
            <div className='mb-8 flex justify-center'>
              <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl shadow-green-500/30'>
                <span className='text-4xl text-white'>✓</span>
              </div>
            </div>
            <h2 className='mb-4 text-3xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent'>
              {t('Application_Submitted')}
            </h2>
            <p className='mb-6 text-lg text-gray-600'>
              {t('Application_Success_Message')}
            </p>
            <div className='rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 mb-6'>
              <p className='text-sm text-green-700 mb-2'>
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
                  <svg className='w-4 h-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                  <span>{t('Bank_Verification_Complete')}</span>
                </div>
                <div className='flex items-center justify-center space-x-2'>
                  <svg className='w-4 h-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                  <span>{t('Application_Under_Review')}</span>
                </div>
                <div className='flex items-center justify-center space-x-2'>
                  <svg className='w-4 h-4 text-blue-500' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                  </svg>
                  <span>{t('Approval_Notification')}</span>
                </div>
              </div>
            </div>
            <div className='mt-8'>
              <Link href='/' className='inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] text-white font-medium rounded-lg shadow-lg shadow-[#097fa5]/30 hover:shadow-xl hover:scale-105 transition-all duration-300'>
                <svg className='w-5 h-5 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' />
                </svg>
                {t('Back_To_Home')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showIBV) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 py-8 px-4'>
        <div className='mx-auto max-w-4xl'>
          <div className='rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-[#097fa5]/10 p-6 sm:p-8'>
            <div className='mb-8 text-center'>
              <div className='mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#333366] via-[#097fa5] to-[#0a95c2] shadow-xl shadow-[#097fa5]/30'>
                <svg className='h-8 w-8 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                </svg>
              </div>
              <h2 className='mb-4 text-3xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent'>
                {t('Bank_Verification')}
              </h2>
              <p className='text-lg text-gray-600 mb-6'>
                {t('IBV_Step_Description')}
              </p>
            </div>

            {/* Mock Bank Verification Interface */}
            <div className='mb-8'>
              <div className='w-full h-96 rounded-xl border border-gray-200 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 p-8'>
                {!isVerifying ? (
                  <div className='text-center'>
                    <div className='mb-6'>
                      <div className='inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg'>
                        <svg className='h-10 w-10 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                        </svg>
                      </div>
                    </div>
                    <h3 className='text-2xl font-bold text-gray-800 mb-4'>Connect Your Bank Account</h3>
                    <p className='text-gray-600 mb-6'>Securely verify your bank account to complete your loan application</p>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6'>
                      <div className='p-4 bg-white rounded-lg shadow-sm border border-gray-200'>
                        <div className='text-sm font-medium text-gray-500'>Bank Name</div>
                        <div className='text-lg font-semibold text-gray-800 truncate'>RBC Royal Bank</div>
                      </div>
                      <div className='p-4 bg-white rounded-lg shadow-sm border border-gray-200'>
                        <div className='text-sm font-medium text-gray-500'>Account Type</div>
                        <div className='text-lg font-semibold text-gray-800 truncate'>Chequing Account</div>
                      </div>
                    </div>
                    <div className='text-sm text-gray-500 mb-6'>
                      <div className='flex items-center justify-center space-x-2'>
                        <svg className='w-4 h-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                        </svg>
                        <span>256-bit SSL encryption</span>
                      </div>
                    </div>
                  </div>
                ) : ibvVerified ? (
                  <div className='text-center'>
                    <div className='mb-6'>
                      <div className='inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg'>
                        <svg className='animate-spin h-10 w-10 text-white' fill='none' viewBox='0 0 24 24'>
                          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                        </svg>
                      </div>
                    </div>
                    <h3 className='text-2xl font-bold text-blue-800 mb-4'>
                      Submitting Application...
                    </h3>
                    <p className='text-gray-600 mb-6'>
                      Your bank verification is complete. We&apos;re now submitting your loan application.
                    </p>
                    <div className='rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4'>
                      <p className='text-sm text-blue-700'>
                        ✓ Bank verification completed<br/>
                        ✓ Application data prepared<br/>
                        ⏳ Submitting to our system...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='text-center'>
                    <div className='mb-6'>
                      <div className='inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg animate-pulse'>
                        <svg className='h-10 w-10 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                        </svg>
                      </div>
                    </div>
                    <h3 className='text-2xl font-bold text-gray-800 mb-4'>
                      {ibvStep === 1 && 'Connecting to Bank...'}
                      {ibvStep === 2 && 'Verifying Account...'}
                      {ibvStep === 3 && 'Validating Information...'}
                      {ibvStep === 4 && 'Verification Complete!'}
                    </h3>
                    <div className='w-full bg-gray-200 rounded-full h-2 mb-4'>
                      <div 
                        className='bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-1000'
                        style={{ width: `${(ibvStep / 4) * 100}%` }}
                      />
                    </div>
                    <p className='text-gray-600'>
                      {ibvStep === 1 && 'Establishing secure connection with your bank...'}
                      {ibvStep === 2 && 'Verifying your account details and balance...'}
                      {ibvStep === 3 && 'Validating your financial information...'}
                      {ibvStep === 4 && 'Your bank account has been successfully verified!'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {!ibvVerified && (
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <Button
                  onClick={() => setShowIBV(false)}
                  variant='secondary'
                  size='large'
                  className='px-8 py-4'
                  disabled={isVerifying}
                >
                  {t('Back')}
                </Button>
                <Button
                  onClick={handleIBVComplete}
                  size='large'
                  className='px-8 py-4 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] text-white shadow-xl shadow-[#097fa5]/30 hover:shadow-2xl hover:scale-105 transition-all duration-300'
                  disabled={isVerifying}
                >
                  {isVerifying ? t('Verifying') : t('Complete_Verification')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 py-8 px-4'>
      <div className='mx-auto max-w-2xl'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <div className='mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#333366] via-[#097fa5] to-[#0a95c2] shadow-xl shadow-[#097fa5]/30'>
            <svg className='h-8 w-8 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1' />
            </svg>
          </div>
          <h1 className='mb-4 text-4xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent'>
            {t('Quick_Micro_Loan')}
          </h1>
          <p className='text-lg text-gray-600'>
            {t('Get_Approved_In_Minutes')}
          </p>
        </div>

        {/* Development Tools */}
        {isDevelopment && (
          <div className='mb-6 flex flex-col sm:flex-row gap-3 justify-center'>
            <button
              onClick={fillRandomData}
              className='px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105'
            >
              🎲 Fill Random Data
            </button>
            <button
              onClick={resetForm}
              className='px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105'
            >
              🔄 Reset Form
            </button>
          </div>
        )}

        {/* Progress Bar */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <span className='text-sm font-medium text-gray-600'>Step {currentStep} of 3</span>
            <span className='text-sm font-medium text-gray-600'>{Math.round((currentStep / 3) * 100)}% Complete</span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div 
              className='bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] h-2 rounded-full transition-all duration-300'
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className='rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-[#097fa5]/10 p-6 sm:p-8'>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className='space-y-6'>
              <div className='text-center mb-6'>
                <h2 className='text-2xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent mb-2'>
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
                    onChange={e => updateFormData('firstName', e.target.value)}
                    className='w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
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
                    onChange={e => updateFormData('lastName', e.target.value)}
                    className='w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
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
                    onChange={e => updateFormData('email', e.target.value)}
                    className='w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
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
                    onChange={e => updateFormData('phone', e.target.value)}
                    className='w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
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
                    onChange={e => updateFormData('dateOfBirth', e.target.value)}
                    className='w-full rounded-lg border border-gray-300 bg-background p-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                  />
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-primary'>
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
            </div>
          )}

          {/* Step 2: Loan Details */}
          {currentStep === 2 && (
            <div className='space-y-6'>
              <div className='text-center mb-6'>
                <h2 className='text-2xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent mb-2'>
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

              <div className='rounded-xl bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-6'>
                <h3 className='text-lg font-semibold text-green-800 mb-2'>
                  {t('Why_Choose_Micro_Loan')}
                </h3>
                <ul className='text-sm text-green-700 space-y-2'>
                  <li className='flex items-center'>
                    <svg className='w-4 h-4 mr-2 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                    </svg>
                    {t('Fast_Approval')}
                  </li>
                  <li className='flex items-center'>
                    <svg className='w-4 h-4 mr-2 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                    </svg>
                    {t('No_Credit_Check')}
                  </li>
                  <li className='flex items-center'>
                    <svg className='w-4 h-4 mr-2 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                    </svg>
                    {t('Secure_Bank_Verification')}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <div className='space-y-6'>
              <div className='text-center mb-6'>
                <h2 className='text-2xl font-bold bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] bg-clip-text text-transparent mb-2'>
                  {t('Final_Confirmation')}
                </h2>
                <p className='text-gray-600'>{t('Review_And_Confirm')}</p>
              </div>

              <div className='rounded-xl bg-gray-50 p-6 space-y-4'>
                <h3 className='text-lg font-semibold text-primary mb-4'>{t('Application_Summary')}</h3>
                <div className='grid gap-3 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>{t('Name')}:</span>
                    <span className='font-medium'>{formData.firstName} {formData.lastName}</span>
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
                    <span className='font-medium text-green-600'>${formData.loanAmount}</span>
                  </div>
                </div>
              </div>

              <div className='flex items-start space-x-3'>
                <input
                  type='checkbox'
                  id='confirmInformation'
                  checked={formData.confirmInformation}
                  onChange={e => updateFormData('confirmInformation', e.target.checked)}
                  className='mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded'
                />
                <label htmlFor='confirmInformation' className='text-sm text-gray-700'>
                  {t('Confirm_Information_Accurate')}
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className='flex flex-col sm:flex-row gap-4 mt-8'>
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
              onClick={nextStep}
              disabled={!isStepValid()}
              size='large'
              className='px-8 py-4 bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] text-white shadow-xl shadow-[#097fa5]/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ml-auto'
            >
              {currentStep === 3 ? t('Continue_To_Verification') : t('Next')}
            </Button>
          </div>
        </div>

        {/* Back to main apply page */}
        <div className='mt-8 text-center'>
          <Link href='/apply' className='text-primary hover:text-secondary transition-colors duration-200 text-sm'>
            {t('Back_To_Full_Application')}
          </Link>
        </div>
      </div>
    </div>
  )
}
