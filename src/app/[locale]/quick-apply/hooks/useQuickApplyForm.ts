import { useState, useEffect, useCallback } from 'react'
import type { QuickApplyFormData, QuickApplyUpdateHandler } from '../types'
import { provinceNameToCode } from '../constants/provinces'

const STORAGE_KEY = 'microLoanFormData'
const STEP_STORAGE_KEY = 'microLoanCurrentStep'

const getDefaultFormData = (locale: string): QuickApplyFormData => ({
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

export function useQuickApplyForm(initialLocale: string) {
  // Always start with defaults to avoid hydration mismatch
  const [formData, setFormData] = useState<QuickApplyFormData>(() =>
    getDefaultFormData(initialLocale)
  )

  // Load form data from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const normalizedProvince = provinceNameToCode(parsed?.province)
          setFormData(prev => ({
            ...getDefaultFormData(initialLocale),
            ...parsed,
            province: normalizedProvince
          }))
        } catch {
          // Invalid data, keep defaults
        }
      }
    }
  }, [initialLocale])

  // Always start with default to avoid hydration mismatch
  const [currentStep, setCurrentStep] = useState(1)
  
  // Load step from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STEP_STORAGE_KEY)
      if (saved) {
        try {
          const step = parseInt(saved, 10)
          if (step >= 1 && step <= 5) {
            setCurrentStep(step)
          }
        } catch {
          // Invalid step, keep default
        }
      }
    }
  }, [])

  const [isPrefilling, setIsPrefilling] = useState(false)

  // Update preferred language when locale changes
  useEffect(() => {
    if (initialLocale && formData.preferredLanguage !== initialLocale) {
      updateFormData('preferredLanguage', initialLocale)
    }
  }, [initialLocale, formData.preferredLanguage])

  // Save form data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    }
  }, [formData])

  // Save current step to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STEP_STORAGE_KEY, currentStep.toString())
    }
  }, [currentStep])

  const updateFormData: QuickApplyUpdateHandler = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData(getDefaultFormData(initialLocale))
    setCurrentStep(1)
    // Clear localStorage to ensure fresh start
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STEP_STORAGE_KEY)
    }
  }, [initialLocale])

  const nextStep = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  return {
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    isPrefilling,
    setIsPrefilling,
    updateFormData,
    resetForm,
    nextStep,
    prevStep
  }
}

