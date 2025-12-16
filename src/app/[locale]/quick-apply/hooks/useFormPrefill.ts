import { useEffect } from 'react'
import type { QuickApplyFormData } from '../types'

interface UseFormPrefillOptions {
  formData: QuickApplyFormData
  setFormData: React.Dispatch<React.SetStateAction<QuickApplyFormData>>
  setIsPrefilling: React.Dispatch<React.SetStateAction<boolean>>
  locale: string
}

export function useFormPrefill({
  formData,
  setFormData,
  setIsPrefilling,
  locale
}: UseFormPrefillOptions) {
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
}

