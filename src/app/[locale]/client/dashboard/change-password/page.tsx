'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/src/navigation'
import { createClient } from '@/src/lib/supabase/client'
import Button from '@/src/app/[locale]/components/Button'

export default function ChangePasswordPage() {
  const t = useTranslations('')
  const router = useRouter()
  const supabase = createClient()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('All_Fields_Required') || 'All fields are required')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError(t('Password_Too_Short') || 'Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('Passwords_Do_Not_Match') || 'Passwords do not match')
      setLoading(false)
      return
    }

    if (currentPassword === newPassword) {
      setError(t('New_Password_Must_Be_Different') || 'New password must be different from current password')
      setLoading(false)
      return
    }

    try {
      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        setError(t('Authentication_Error') || 'Authentication error. Please sign in again.')
        setLoading(false)
        return
      }

      // Try to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (signInError) {
        setError(t('Current_Password_Incorrect') || 'Current password is incorrect')
        setLoading(false)
        return
      }

      // Change password via API
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('Password_Change_Error') || 'An error occurred while changing your password')
        setLoading(false)
        return
      }

      // Re-authenticate the user with the new password to ensure a fresh session
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: newPassword
      })

      if (reauthError) {
        setError(
          t('Authentication_Error') ||
            'Password changed, but there was an issue updating your session. Please sign in again with your new password.'
        )
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.replace('/client/dashboard')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message || t('Password_Change_Error') || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent'></div>
          <p className='text-gray-600'>{t('Loading') || 'Loading...'}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background px-6'>
        <div className='w-full max-w-md rounded-lg bg-white p-8 shadow-lg'>
          <div className='mb-4 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
              <svg
                className='h-6 w-6 text-green-600'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
            <h1 className='mb-2 text-2xl font-bold text-gray-900'>
              {t('Password_Changed_Success') || 'Password Changed Successfully!'}
            </h1>
            <p className='text-gray-600'>
              {t('Password_Changed_Success_Message') || 'Your password has been successfully changed. Redirecting to dashboard...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-6 py-12'>
      <div className='w-full max-w-md rounded-lg bg-white p-8 shadow-lg'>
        <div className='mb-6 text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100'>
            <svg
              className='h-6 w-6 text-yellow-600'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              />
            </svg>
          </div>
          <h1 className='mb-2 text-2xl font-bold text-gray-900'>
            {t('Change_Password_Required') || 'Password Change Required'}
          </h1>
          <p className='text-sm text-gray-600'>
            {t('Change_Password_Required_Message') || 'For security reasons, you must change your password before accessing your dashboard.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600'>
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor='currentPassword'
              className='mb-2 block text-sm font-medium text-gray-700'
            >
              {t('Current_Password') || 'Current Password'}
            </label>
            <input
              id='currentPassword'
              type='password'
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-2'
              placeholder={t('Enter_Current_Password') || 'Enter your current password'}
              autoComplete='current-password'
            />
          </div>

          <div>
            <label
              htmlFor='newPassword'
              className='mb-2 block text-sm font-medium text-gray-700'
            >
              {t('New_Password') || 'New Password'}
            </label>
            <input
              id='newPassword'
              type='password'
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-2'
              placeholder={t('Enter_New_Password') || 'Enter new password'}
              autoComplete='new-password'
            />
            <p className='mt-1 text-xs text-gray-500'>
              {t('Password_Min_Length') || 'Password must be at least 6 characters'}
            </p>
          </div>

          <div>
            <label
              htmlFor='confirmPassword'
              className='mb-2 block text-sm font-medium text-gray-700'
            >
              {t('Confirm_Password') || 'Confirm Password'}
            </label>
            <input
              id='confirmPassword'
              type='password'
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-2'
              placeholder={t('Confirm_New_Password') || 'Confirm new password'}
              autoComplete='new-password'
            />
          </div>

          <Button
            type='submit'
            variant='primary'
            size='large'
            className='w-full'
            disabled={loading}
          >
            {loading
              ? t('Changing') || 'Changing...'
              : t('Change_Password') || 'Change Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}


