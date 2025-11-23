'use client'

import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from '@/src/navigation'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import Button from '../../components/Button'
import Image from 'next/image'

export default function ResetPasswordPage() {
  const t = useTranslations('')
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)

  // Check if we have a valid password reset token
  useEffect(() => {
    const checkToken = async () => {
      try {
        // Check if user has a valid session (they clicked the reset link)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // Try to get the hash from URL parameters
          const hash = window.location.hash
          if (hash) {
            // Parse the hash to get tokens
            const hashParams = new URLSearchParams(hash.substring(1))
            const accessToken = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')
            
            if (accessToken && refreshToken) {
              // Set the session with the tokens from the URL
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              
              if (sessionError) {
                setError(t('Invalid_Reset_Link') || 'Invalid or expired reset link. Please request a new one.')
                setValidating(false)
                return
              }
            }
          } else {
            setError(t('Invalid_Reset_Link') || 'Invalid or expired reset link. Please request a new one.')
            setValidating(false)
            return
          }
        }
        
        setValidating(false)
      } catch (err: any) {
        setError(t('Invalid_Reset_Link') || 'Invalid or expired reset link. Please request a new one.')
        setValidating(false)
      }
    }
    
    checkToken()
  }, [supabase, t])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(t('Passwords_Do_Not_Match') || 'Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError(t('Password_Too_Short') || 'Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      // Success
      setSuccess(true)
      setLoading(false)

      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        router.push('/auth/signin')
      }, 3000)
    } catch (err: any) {
      setError(err.message || (t('Password_Reset_Error') || 'An unexpected error occurred'))
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6'>
        <div className='w-full max-w-md'>
          <div className='rounded-2xl bg-background-secondary border border-gray-200 p-6 sm:p-8 shadow-lg text-center'>
            <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent'></div>
            <p className='text-text-secondary'>{t('Validating_Reset_Link') || 'Validating reset link...'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6'>
        <div className='w-full max-w-md'>
          <div className='rounded-2xl bg-background-secondary border border-gray-200 p-6 sm:p-8 shadow-lg'>
            {/* Logo */}
            <div className='mb-8 flex justify-center'>
              <Link href='/'>
                <div className='relative h-16 w-40'>
                  <Image
                    src='/images/FlashLoanLogo.png'
                    alt='Flash-Loan Logo'
                    width={160}
                    height={64}
                    className='h-full w-full object-contain'
                    priority
                  />
                </div>
              </Link>
            </div>

            <div className='text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
                  <svg className='h-8 w-8 text-green-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                  </svg>
                </div>
              </div>
              
              <h1 className='mb-4 text-2xl sm:text-3xl font-bold text-primary'>
                {t('Password_Reset_Success') || 'Password Reset Successful!'}
              </h1>
              
              <p className='mb-8 text-text-secondary text-sm sm:text-base'>
                {t('Password_Reset_Success_Message') || 'Your password has been successfully reset. You will be redirected to sign in shortly.'}
              </p>

              <Link href='/auth/signin'>
                <Button variant='primary' size='large' className='w-full'>
                  {t('Go_To_Sign_In') || 'Go to Sign In'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !password && !confirmPassword) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6'>
        <div className='w-full max-w-md'>
          <div className='rounded-2xl bg-background-secondary border border-gray-200 p-6 sm:p-8 shadow-lg'>
            {/* Logo */}
            <div className='mb-8 flex justify-center'>
              <Link href='/'>
                <div className='relative h-16 w-40'>
                  <Image
                    src='/images/FlashLoanLogo.png'
                    alt='Flash-Loan Logo'
                    width={160}
                    height={64}
                    className='h-full w-full object-contain'
                    priority
                  />
                </div>
              </Link>
            </div>

            <div className='text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
                  <svg className='h-8 w-8 text-red-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </div>
              </div>
              
              <h1 className='mb-4 text-2xl sm:text-3xl font-bold text-primary'>
                {t('Invalid_Reset_Link') || 'Invalid Reset Link'}
              </h1>
              
              <p className='mb-8 text-text-secondary text-sm sm:text-base'>
                {error}
              </p>

              <div className='space-y-3'>
                <Link href='/auth/forgot-password'>
                  <Button variant='primary' size='large' className='w-full'>
                    {t('Request_New_Reset_Link') || 'Request New Reset Link'}
                  </Button>
                </Link>
                <Link href='/auth/signin'>
                  <Button variant='secondary' size='medium' className='w-full'>
                    {t('Back_To_Sign_In') || 'Back to Sign In'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6'>
      <div className='w-full max-w-md'>
        <div className='rounded-2xl bg-background-secondary border border-gray-200 p-6 sm:p-8 shadow-lg'>
          {/* Logo */}
          <div className='mb-8 flex justify-center'>
            <Link href='/'>
              <div className='relative h-16 w-40'>
                <Image
                  src='/images/FlashLoanLogo.png'
                  alt='Flash-Loan Logo'
                  width={160}
                  height={64}
                  className='h-full w-full object-contain'
                  priority
                />
              </div>
            </Link>
          </div>

          <div className='mb-8 text-center'>
            <h1 className='mb-2 text-2xl sm:text-3xl font-bold text-primary'>
              {t('Reset_Password') || 'Reset Password'}
            </h1>
            <p className='text-text-secondary text-sm sm:text-base'>
              {t('Reset_Password_Subtitle') || 'Enter your new password below'}
            </p>
          </div>

          <form onSubmit={handleReset} className='space-y-6'>
            {error && (
              <div className='rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600'>
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor='password'
                className='mb-2 block text-sm font-medium text-primary'
              >
                {t('New_Password') || 'New Password'}
              </label>
              <input
                id='password'
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className='w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                placeholder={t('Enter_New_Password') || 'Enter new password'}
                autoComplete='new-password'
              />
              <p className='mt-1 text-xs text-text-secondary'>
                {t('Password_Min_Length') || 'Password must be at least 6 characters'}
              </p>
            </div>

            <div>
              <label
                htmlFor='confirmPassword'
                className='mb-2 block text-sm font-medium text-primary'
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
                className='w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
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
              {loading ? (t('Resetting') || 'Resetting...') : (t('Reset_Password') || 'Reset Password')}
            </Button>
          </form>

          <div className='mt-6 text-center'>
            <Link 
              href='/auth/signin'
              className='text-sm text-text-secondary hover:text-primary transition-colors'
            >
              {t('Back_To_Sign_In') || '← Back to Sign In'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

