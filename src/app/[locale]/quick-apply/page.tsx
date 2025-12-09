'use client'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import Button from '../components/Button'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  restoreInveriteConnection,
  type InveriteConnection
} from '@/src/lib/ibv/inverite'
import type { ZumrailsConnection } from '@/src/lib/ibv/zumrails'
import {
  createIbvProviderData,
  determineIbvStatus
} from '@/src/lib/supabase/ibv-helpers'
import Step1PersonalInfo from './components/Step1PersonalInfo'
import Step2Address from './components/Step2Address'
import Step3LoanDetails from './components/Step3LoanDetails'
import Step4Confirmation from './components/Step4Confirmation'
import Step5BankVerification from './components/Step5BankVerification'
import StepProgress from './components/StepProgress'
import type { QuickApplyFormData, QuickApplyUpdateHandler } from './types'
import { PROVINCE_CODES, provinceNameToCode } from './constants/provinces'
import { validateMinimumAge } from '@/src/lib/utils/age'

export default function MicroLoanApplicationPage() {
  const t = useTranslations('')
  const params = useParams()
  const locale = params.locale as string

  const [formData, setFormData] = useState<QuickApplyFormData>(() => {
    const defaults: QuickApplyFormData = {
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
      country: 'Canada',
      rentCost: '',
      loanAmount: '',
      confirmInformation: false
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('microLoanFormData')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const normalizedProvince = provinceNameToCode(parsed?.province)
          return {
            ...defaults,
            ...parsed,
            province: normalizedProvince
          }
        } catch {
          return defaults
        }
      }
    }

    return defaults
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showIBV, setShowIBV] = useState(false)
  const [ibvVerified, setIbvVerified] = useState(false)
  const [ibvStep, setIbvStep] = useState(1)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [inveriteConnection, setInveriteConnection] =
    useState<InveriteConnection | null>(null)
  const [inveriteRequestGuid, setInveriteRequestGuid] = useState<string | null>(
    null
  )
  const [ibvSubmissionOverride, setIbvSubmissionOverride] = useState<
    'pending' | 'failed' | null
  >(null)
  const [hasSubmittedApplication, setHasSubmittedApplication] = useState(false)
  const [lastSubmittedRequestGuid, setLastSubmittedRequestGuid] = useState<
    string | null
  >(null)
  const [applicationReferenceNumber, setApplicationReferenceNumber] = useState<
    string | null
  >(null)
  const [lastVerifiedSubmissionGuid, setLastVerifiedSubmissionGuid] = useState<
    string | null
  >(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [serverIbvIframeUrl, setServerIbvIframeUrl] = useState<string | null>(
    null
  )
  const [serverIbvProvider, setServerIbvProvider] = useState<string | null>(
    null
  )
  const verifiedFetchInFlight = useRef(false)

  // Development mode detection
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Update preferred language when locale changes
  useEffect(() => {
    if (locale && formData.preferredLanguage !== locale) {
      updateFormData('preferredLanguage', locale)
    }
  }, [locale, formData.preferredLanguage])

  // Prefill form data if user is authenticated
  useEffect(() => {
    const prefillFormData = async () => {
      if (typeof window === 'undefined') return

      // Only prefill if form is empty
      if (formData.firstName || formData.email) {
        return
      }

      setIsPrefilling(true)

      try {
        // Check authentication status
        const authResponse = await fetch('/api/user/auth-status')
        if (!authResponse.ok) {
          setIsPrefilling(false)
          return
        }

        const authData = await authResponse.json()
        if (!authData.authenticated || !authData.isClient) {
          setIsPrefilling(false)
          return
        }

        // Fetch user profile data
        const profileResponse = await fetch('/api/user/profile')
        if (!profileResponse.ok) {
          setIsPrefilling(false)
          return
        }

        const { user, address } = await profileResponse.json()

        // Prefill form data
        setFormData(prev => ({
          ...prev,
          // Personal Information
          firstName: user.first_name || prev.firstName,
          lastName: user.last_name || prev.lastName,
          email: user.email || prev.email,
          phone: user.phone || prev.phone,
          dateOfBirth: user.date_of_birth || prev.dateOfBirth,
          preferredLanguage:
            user.preferred_language || prev.preferredLanguage || locale || 'en',
          // Address Information
          streetNumber: address?.street_number || prev.streetNumber,
          streetName: address?.street_name || prev.streetName,
          apartmentNumber: address?.apartment_number || prev.apartmentNumber,
          city: address?.city || prev.city,
          province: address?.province || prev.province,
          postalCode: address?.postal_code || prev.postalCode,
          movingDate: address?.moving_date || prev.movingDate,
          country: prev.country || 'Canada'
        }))
      } catch (error) {
        // Silently fail - user can still fill the form manually
        console.error('Error prefilling form data:', error)
      } finally {
        setIsPrefilling(false)
      }
    }

    prefillFormData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  // On page load: reset form and clear any Inverite session from storage
  useEffect(() => {
    // Clear persisted storage (but keep form data if user is authenticated)
    try {
      localStorage.removeItem('inveriteConnection')
      sessionStorage.removeItem('inverite_init_session_id')
      // Only clear form data if form is empty (user not authenticated)
      const saved = localStorage.getItem('microLoanFormData')
      if (
        !saved ||
        (!JSON.parse(saved).firstName && !JSON.parse(saved).email)
      ) {
        localStorage.removeItem('microLoanFormData')
      }
    } catch {}

    // Reset Inverite-related state (but keep form data)
    setCurrentStep(1)
    setInveriteConnection(null)
    setInveriteRequestGuid(null)
    setIbvVerified(false)
    setShowIBV(false)
    setIbvStep(1)
    setIsVerifying(false)
    setIsSubmitted(false)
    setIbvSubmissionOverride(null)
    setHasSubmittedApplication(false)
    setLastSubmittedRequestGuid(null)
  }, [])

  // Restore Inverite connection from storage on mount
  useEffect(() => {
    const restored = restoreInveriteConnection()
    if (restored) {
      setInveriteConnection(restored)
      setIbvVerified(true)
      setIbvSubmissionOverride(null)
      if (restored.requestGuid) {
        setInveriteRequestGuid(restored.requestGuid)
      }
    }
  }, [])

  // Save form data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('microLoanFormData', JSON.stringify(formData))
    }
  }, [formData])

  const updateFormData: QuickApplyUpdateHandler = (field, value) => {
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
    const provinces = PROVINCE_CODES
    const streetNames = [
      'Maple',
      'Elm',
      'Saint-Laurent',
      'Crescent',
      'Sherbrooke',
      'Peel',
      'Queen',
      'King'
    ]
    const cities = [
      'Montréal',
      'Laval',
      'Longueuil',
      'Québec',
      'Gatineau',
      'Sherbrooke'
    ]
    const postalCodes = ['H2X 1Y4', 'H3B 2Y7', 'H4N 3K6', 'H1A 0A1']
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
    const randomStreetName =
      streetNames[Math.floor(Math.random() * streetNames.length)]
    const randomCity = cities[Math.floor(Math.random() * cities.length)]
    const randomPostalCode =
      postalCodes[Math.floor(Math.random() * postalCodes.length)]

    const randomMovingDate = () => {
      const today = new Date()
      const pastMonths = Math.floor(Math.random() * 24)
      today.setMonth(today.getMonth() - pastMonths)
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(Math.min(today.getDate(), 28)).padStart(2, '0')
      return `${today.getFullYear()}-${month}-${day}`
    }

    // Remove accents for email generation
    const cleanFirstName = randomFirstName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const cleanLastName = randomLastName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    const randomData: QuickApplyFormData = {
      firstName: randomFirstName,
      lastName: randomLastName,
      email: `${cleanFirstName.toLowerCase()}.${cleanLastName.toLowerCase()}${Math.floor(Math.random() * 999)}@email.com`,
      phone: `${Math.floor(Math.random() * 2) === 0 ? '514' : '438'}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      dateOfBirth: `19${Math.floor(Math.random() * 30 + 70)}-${String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0')}`,
      preferredLanguage: locale || 'en',
      streetNumber: String(Math.floor(Math.random() * 900) + 100),
      streetName: `${randomStreetName} ${Math.random() > 0.5 ? 'Street' : 'Avenue'}`,
      apartmentNumber:
        Math.random() > 0.5 ? `${Math.floor(Math.random() * 20) + 1}` : '',
      city: randomCity,
      province: randomProvince,
      postalCode: randomPostalCode,
      movingDate: randomMovingDate(),
      country: 'Canada',
      rentCost: String(Math.floor(Math.random() * 1000 + 500)),
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
      streetNumber: '',
      streetName: '',
      apartmentNumber: '',
      city: '',
      province: '',
      postalCode: '',
      movingDate: '',
      country: 'Canada',
      rentCost: '',
      loanAmount: '',
      confirmInformation: false
    })
    setCurrentStep(1)
    // Reset Inverite state
    setInveriteConnection(null)
    setInveriteRequestGuid(null)
    setIbvVerified(false)
    setIbvSubmissionOverride(null)
    setShowIBV(false)
    setIbvStep(1)
    setIsVerifying(false)
    setIsSubmitted(false)

    // Clear Inverite session data from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('inveriteConnection')
      sessionStorage.removeItem('inverite_init_session_id')
    }
  }

  const nextStep = () => {
    if (currentStep < 5) {
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

  const handleSubmit = async () => {
    // Prevent duplicate submissions - early return if already submitting
    if (isSubmitting) {
      console.log('[Submit] Already submitting, ignoring duplicate call')
      return
    }

    // Mark as submitting immediately to prevent race conditions
    setIsSubmitting(true)

    try {
      // Submit application WITHOUT IBV data - server will initiate IBV if needed
      const response = await fetch('/api/loan-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isQuickApply: true,

          // Personal Information (from form)
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          preferredLanguage: formData.preferredLanguage,

          // Address Information
          streetNumber: formData.streetNumber,
          streetName: formData.streetName,
          apartmentNumber: formData.apartmentNumber || null,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
          country: formData.country,
          movingDate: formData.movingDate,
          rentCost: formData.rentCost || null,

          // Loan Details
          loanAmount: formData.loanAmount,

          // Request IBV but don't provide data - server will initiate
          ibvProvider: 'inverite',
          ibvStatus: 'pending', // Server will initiate IBV request

          // Other required fields
          bankruptcyPlan: false,
          confirmInformation: formData.confirmInformation
        })
      })

      const responseBody = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          (responseBody as any)?.error || 'Failed to submit application'
        alert(`Error: ${message}`)
        return
      }

      // Clear form data
      localStorage.removeItem('microLoanFormData')
      localStorage.removeItem('inveriteConnection')
      setHasSubmittedApplication(true)

      const referenceNumber =
        (responseBody as any)?.data?.referenceNumber ?? null
      const applicationIdFromResponse =
        (responseBody as any)?.data?.applicationId ?? null
      const ibvData = (responseBody as any)?.data?.ibv

      setApplicationReferenceNumber(referenceNumber)
      setApplicationId(applicationIdFromResponse)

      // If server initiated IBV and we have an iframe URL, set up for Step 5
      if (ibvData?.required) {
        const iframeUrl = ibvData.iframeUrl || ibvData.startUrl
        const provider = ibvData.provider || 'zumrails'
        if (iframeUrl) {
          setServerIbvIframeUrl(iframeUrl)
          setServerIbvProvider(provider)
          // Move to Step 5 for IBV verification
          setCurrentStep(5)
        } else {
          // IBV required but no URL available, mark as submitted
          setIsSubmitted(true)
        }
      } else {
        // No IBV required, mark as submitted
        setIsSubmitted(true)
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Error submitting application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // For Zumrails: Data fetching is handled by webhook when Insights "Completed" event is received
  // For Inverite: Still fetch from frontend after verification
  useEffect(() => {
    if (!ibvVerified) return
    if (!applicationId) return
    if (!inveriteRequestGuid) return
    if (verifiedFetchInFlight.current) return
    if (lastVerifiedSubmissionGuid === inveriteRequestGuid) {
      if (hasSubmittedApplication && !isSubmitted) {
        setIsSubmitted(true)
      }
      return
    }

    const provider = serverIbvProvider || 'zumrails'

    // Zumrails: Data fetching is handled by webhook, just mark as submitted
    if (provider === 'zumrails') {
      setLastVerifiedSubmissionGuid(inveriteRequestGuid)
      if (hasSubmittedApplication && !isSubmitted) {
        setIsSubmitted(true)
      }
      return
    }

    // Inverite: Fetch data from frontend after verification
    if (provider === 'inverite') {
      const fetchVerifiedData = async () => {
        verifiedFetchInFlight.current = true
        try {
          const fetchUrl = `/api/inverite/fetch/${encodeURIComponent(
            inveriteRequestGuid
          )}?application_id=${encodeURIComponent(applicationId)}`

          const res = await fetch(fetchUrl)
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            console.warn(
              '[Quick Apply] Failed to fetch Inverite data after verification',
              res.status,
              text
            )
            return
          }

          setLastVerifiedSubmissionGuid(inveriteRequestGuid)
          setIsSubmitted(true)
        } catch (error) {
          console.error(
            '[Quick Apply] Error fetching Inverite data after verification',
            error
          )
        } finally {
          verifiedFetchInFlight.current = false
        }
      }

      void fetchVerifiedData()
    }
  }, [
    ibvVerified,
    applicationId,
    inveriteRequestGuid,
    lastVerifiedSubmissionGuid,
    hasSubmittedApplication,
    isSubmitted,
    serverIbvProvider
  ])

  const isStepValid = useCallback(() => {
    switch (currentStep) {
      case 1:
        // Validate all required fields and age (must be at least 18)
        const hasAllFields =
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.phone &&
          formData.dateOfBirth
        if (!hasAllFields) return false

        // Validate age if date of birth is provided
        if (formData.dateOfBirth) {
          const ageValidation = validateMinimumAge(formData.dateOfBirth, 18)
          return ageValidation.isValid
        }
        return false
      case 2:
        return (
          formData.streetNumber &&
          formData.streetName &&
          formData.city &&
          formData.province &&
          formData.postalCode &&
          formData.country &&
          formData.movingDate
        )
      case 3:
        return formData.loanAmount
      case 4:
        return formData.confirmInformation
      case 5:
        return (
          ibvVerified ||
          Boolean(ibvSubmissionOverride) ||
          Boolean(inveriteRequestGuid) ||
          Boolean(inveriteConnection)
        )
      default:
        return false
    }
  }, [formData])

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
                {applicationReferenceNumber || '—'}
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
          <div className='sm:hidden'>
            <StepProgress currentStep={currentStep} totalSteps={5} />
          </div>
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

        <div className='mb-8 hidden sm:block'>
          <StepProgress currentStep={currentStep} totalSteps={5} />
        </div>

        {/* Form Container */}
        <div className='relative rounded-2xl border border-white/20 bg-white/80 p-4 shadow-xl shadow-[#097fa5]/10 backdrop-blur-xl sm:p-6 md:p-8'>
          {/* Loading Overlay */}
          {isPrefilling && (
            <div className='absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm'>
              <div className='flex flex-col items-center space-y-4'>
                <div className='h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#097fa5]'></div>
                <p className='text-sm font-medium text-gray-700'>
                  {t('Loading_Your_Information')}
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <Step1PersonalInfo
              formData={formData}
              onUpdate={updateFormData}
              disabled={isPrefilling}
            />
          )}

          {/* Step 2: Address Details */}
          {currentStep === 2 && (
            <Step2Address formData={formData} onUpdate={updateFormData} />
          )}

          {/* Step 3: Loan Details */}
          {currentStep === 3 && (
            <Step3LoanDetails formData={formData} onUpdate={updateFormData} />
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <Step4Confirmation formData={formData} onUpdate={updateFormData} />
          )}

          {/* Step 5: Bank Verification */}
          {currentStep === 5 && serverIbvIframeUrl && (
            <Step5BankVerification
              iframeUrl={serverIbvIframeUrl}
              ibvProvider={(serverIbvProvider as any) || 'zumrails'}
              applicationId={applicationId}
              onVerificationSuccess={({ provider, connection }) => {
                if (provider === 'inverite') {
                  const inveriteConn = connection as InveriteConnection
                  setInveriteConnection(inveriteConn)
                  if (inveriteConn.requestGuid) {
                    setInveriteRequestGuid(inveriteConn.requestGuid)
                  }
                  setIbvVerified(true)
                  setIbvSubmissionOverride(null)
                } else if (provider === 'zumrails') {
                  const zumrailsConn = connection as ZumrailsConnection
                  
                  // Update request ID and connection data in database
                  // Store all identifiers from CONNECTIONSUCCESSFULLYCOMPLETED response:
                  // - requestid: Primary identifier for webhook matching
                  // - cardid: Card/connection identifier
                  // - userid: User identifier
                  if (applicationId && zumrailsConn.requestId) {
                    fetch('/api/zumrails/update-request-id', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        applicationId,
                        requestId: zumrailsConn.requestId,
                        cardId: zumrailsConn.cardId,
                        userId: zumrailsConn.userId
                      })
                    }).catch(error => {
                      console.error('[Zumrails] Failed to update request ID:', error)
                    })
                  }
                  
                  // Store request ID for reference (legacy compatibility)
                  if (zumrailsConn.requestId) {
                    setInveriteRequestGuid(zumrailsConn.requestId)
                  }
                  
                  setIbvVerified(true)
                  setIbvSubmissionOverride(null)
                }
                setIsVerifying(false)
                // Show success step immediately after verification success
                // Application should already be submitted if we reached step 5
                if (hasSubmittedApplication || applicationId) {
                  setIsSubmitted(true)
                }
              }}
              onVerificationError={() => {
                setIbvVerified(false)
                setIsVerifying(false)
                setIbvSubmissionOverride('failed')
                alert('Bank verification failed. Please try again.')
              }}
              onVerificationCancel={() => {
                setIsVerifying(false)
                // Handle connector closed - allow user to retry or go back
                // For now, just reset verification state
                // User can resubmit or continue with the application
                setIbvVerified(false)
                setIbvSubmissionOverride(null)
                // Optionally show a message or allow retry
                // You can customize this behavior based on requirements
              }}
            />
          )}

          {/* Navigation Buttons */}
          <div className='mt-8 flex flex-col gap-4 sm:flex-row'>
            {currentStep > 1 && currentStep < 5 && (
              <Button
                onClick={prevStep}
                variant='secondary'
                size='large'
                className='px-8 py-4'
              >
                {t('Back')}
              </Button>
            )}
            {currentStep < 4 && (
              <Button
                onClick={() => nextStep()}
                disabled={!isStepValid() || isSubmitting}
                size='large'
                className='ml-auto bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] px-8 py-4 text-white shadow-xl shadow-[#097fa5]/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
              >
                {t('Next')}
              </Button>
            )}
            {currentStep === 4 && (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid() || isSubmitting}
                size='large'
                className='ml-auto bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] px-8 py-4 text-white shadow-xl shadow-[#097fa5]/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
              >
                {isSubmitting ? t('Submitting') : t('Submit_Application')}
              </Button>
            )}
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
