'use client'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import { useParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import Button from '../components/Button'
import Step1PersonalInfo from './components/Step1PersonalInfo'
import Step2Address from './components/Step2Address'
import Step3LoanDetails from './components/Step3LoanDetails'
import Step4Confirmation from './components/Step4Confirmation'
import Step5BankVerification from './components/Step5BankVerification'
import StepProgress from './components/StepProgress'
import SuccessScreen from './components/SuccessScreen'
import DevelopmentTools from './components/DevelopmentTools'
import { useQuickApplyForm } from './hooks/useQuickApplyForm'
import { useFormPrefill } from './hooks/useFormPrefill'
import { useIbvVerification } from './hooks/useIbvVerification'
import { useIbvVerificationHandler, createIbvVerificationCallbacks } from './hooks/useIbvVerificationHandler'
import { isStepValid } from './utils/formValidation'
import { submitQuickApplyForm } from './utils/formSubmission'
import { generateRandomFormData } from './utils/devTools'
import type { ZumrailsConnection } from '@/src/lib/ibv/zumrails'

export default function MicroLoanApplicationPage() {
  const t = useTranslations('')
  const params = useParams()
  const locale = params.locale as string

  // Form state management
  const {
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    isPrefilling,
    setIsPrefilling,
    updateFormData,
    resetForm: resetFormState,
    nextStep,
    prevStep
  } = useQuickApplyForm(locale)

  // IBV verification state
  const ibvState = useIbvVerification()

  // Application submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [hasSubmittedApplication, setHasSubmittedApplication] = useState(false)
  const [applicationReferenceNumber, setApplicationReferenceNumber] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)

  // Prefill form data if user is authenticated
  useFormPrefill({
    formData,
    setFormData,
    setIsPrefilling,
    locale
  })

  // Handle IBV data fetching after verification
  useIbvVerificationHandler({
    ibvVerified: ibvState.ibvVerified,
    applicationId,
    zumrailsRequestId: ibvState.zumrailsRequestId,
    lastVerifiedSubmissionRequestId: ibvState.lastVerifiedSubmissionRequestId,
    hasSubmittedApplication,
    isSubmitted,
    verifiedFetchInFlight: ibvState.verifiedFetchInFlight,
    setLastVerifiedSubmissionRequestId: ibvState.setLastVerifiedSubmissionRequestId,
    setIsSubmitted: (submitted) => {
      setIsSubmitted(submitted)
      // Reset form when submission is complete (after IBV verification)
      if (submitted) {
        resetFormState()
      }
    }
  })

  // Create IBV verification callbacks
  const ibvCallbacks = createIbvVerificationCallbacks({
    applicationId,
    setZumrailsRequestId: ibvState.setZumrailsRequestId,
    setIbvVerified: ibvState.setIbvVerified,
    setIbvSubmissionOverride: ibvState.setIbvSubmissionOverride,
    setIsVerifying: ibvState.setIsVerifying,
    setIsSubmitted,
    hasSubmittedApplication
  })

  // Development tools
  const fillRandomData = useCallback(() => {
    const randomData = generateRandomFormData(locale)
    setFormData(randomData)
  }, [locale, setFormData])

  const resetForm = useCallback(() => {
    resetFormState()
    ibvState.resetIbvState()
    setIsSubmitted(false)
    setHasSubmittedApplication(false)
    setApplicationReferenceNumber(null)
    setApplicationId(null)
  }, [resetFormState, ibvState])

  // Form submission
  const handleSubmit = useCallback(async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('[Submit] Already submitting, ignoring duplicate call')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitQuickApplyForm(formData)

      if (!result.success) {
        alert(`Error: ${result.error || 'Failed to submit application'}`)
        return
      }

      setHasSubmittedApplication(true)
      setApplicationReferenceNumber(result.referenceNumber || null)
      setApplicationId(result.applicationId || null)

      // If server initiated IBV and we have a connect token, set up for Step 5
      if (result.ibv?.required) {
        const connectToken = result.ibv.connectToken
        
        console.log('[Quick Apply] IBV initiation data:', {
          hasIbv: !!result.ibv,
          required: result.ibv?.required,
          hasConnectToken: !!connectToken,
          connectTokenType: typeof connectToken,
          connectTokenLength: connectToken?.length,
          connectTokenPreview: connectToken ? connectToken.substring(0, 50) + '...' : null
        })
        
        if (connectToken && typeof connectToken === 'string' && connectToken.trim().length > 0) {
          ibvState.setServerIbvConnectToken(connectToken.trim())
          // Move to Step 5 for IBV verification
          setCurrentStep(5)
        } else {
          console.error('[Quick Apply] Invalid connectToken received:', connectToken)
          // IBV required but no token available, mark as submitted and reset form
          setIsSubmitted(true)
          resetFormState()
        }
      } else {
        // No IBV required, mark as submitted and reset form
        setIsSubmitted(true)
        resetFormState()
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Error submitting application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isSubmitting, ibvState, setCurrentStep])

  // Step validation
  const validateCurrentStep = useCallback(() => {
    return isStepValid(currentStep, formData, {
      ibvVerified: ibvState.ibvVerified,
      ibvSubmissionOverride: ibvState.ibvSubmissionOverride,
      zumrailsRequestId: ibvState.zumrailsRequestId
    })
  }, [currentStep, formData, ibvState])

  // If form is submitted, show success message
  if (isSubmitted) {
    return <SuccessScreen referenceNumber={applicationReferenceNumber} />
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
        <DevelopmentTools
          onFillRandomData={fillRandomData}
          onResetForm={resetForm}
        />

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
          {currentStep === 5 && ibvState.serverIbvConnectToken && (
            <Step5BankVerification
              connectToken={ibvState.serverIbvConnectToken}
              applicationId={applicationId}
              onVerificationSuccess={ibvCallbacks.onVerificationSuccess}
              onVerificationError={ibvCallbacks.onVerificationError}
              onVerificationCancel={ibvCallbacks.onVerificationCancel}
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
                onClick={nextStep}
                disabled={!validateCurrentStep() || isSubmitting}
                size='large'
                className='ml-auto bg-gradient-to-r from-[#333366] via-[#097fa5] to-[#0a95c2] px-8 py-4 text-white shadow-xl shadow-[#097fa5]/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100'
              >
                {t('Next')}
              </Button>
            )}
            {currentStep === 4 && (
              <Button
                onClick={handleSubmit}
                disabled={!validateCurrentStep() || isSubmitting}
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
