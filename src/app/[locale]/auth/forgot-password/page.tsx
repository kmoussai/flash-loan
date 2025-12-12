'use client'

import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from '@/src/navigation'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'
import Button from '../../components/Button'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const t = useTranslations('')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Get the base URL - prefer NEXT_PUBLIC_SITE_URL if set, otherwise use window.location.origin
      // window.location.origin is most reliable for client-side components as it reflects the actual origin
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')
      
      // Construct redirect URL with locale support
      const redirectUrl = `${baseUrl}/${locale}/auth/reset-password`
      
      console.log('[Password Reset] Redirect URL:', redirectUrl)

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      // Success - show confirmation message
      setSuccess(true)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || (t('Password_Reset_Error') || 'An unexpected error occurred'))
      setLoading(false)
    }
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
                {t('Email_Sent') || 'Email Sent!'}
              </h1>
              
              <p className='mb-6 text-text-secondary text-sm sm:text-base'>
                {t('Password_Reset_Email_Sent') || 'We\'ve sent a password reset link to'}
              </p>
              
              <p className='mb-6 font-semibold text-primary'>
                {email}
              </p>
              
              <p className='mb-8 text-text-secondary text-sm'>
                {t('Password_Reset_Instructions') || 'Please check your email and click the link to reset your password. The link will expire in 1 hour.'}
              </p>

              <div className='space-y-3'>
                <Link href='/auth/signin'>
                  <Button variant='primary' size='large' className='w-full'>
                    {t('Back_To_Sign_In') || 'Back to Sign In'}
                  </Button>
                </Link>
                <Link href='/'>
                  <Button variant='secondary' size='medium' className='w-full'>
                    {t('Back_To_Home') || '← Back to Home'}
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
              {t('Forgot_Password') || 'Forgot Password?'}
            </h1>
            <p className='text-text-secondary text-sm sm:text-base'>
              {t('Forgot_Password_Subtitle') || 'Enter your email address and we\'ll send you a link to reset your password'}
            </p>
          </div>

          <form onSubmit={handleResetRequest} className='space-y-6'>
            {error && (
              <div className='rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600'>
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor='email'
                className='mb-2 block text-sm font-medium text-primary'
              >
                {t('Email_Address') || 'Email Address'}
              </label>
              <input
                id='email'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className='w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                placeholder={t('Email_Placeholder') || 'your@email.com'}
                autoComplete='email'
              />
            </div>

            <Button
              type='submit'
              variant='primary'
              size='large'
              className='w-full'
              disabled={loading}
            >
              {loading ? (t('Sending') || 'Sending...') : (t('Send_Reset_Link') || 'Send Reset Link')}
            </Button>
          </form>

          <div className='mt-6 text-center space-y-2'>
            <Link 
              href='/auth/signin'
              className='block text-sm text-text-secondary hover:text-primary transition-colors'
            >
              {t('Back_To_Sign_In') || '← Back to Sign In'}
            </Link>
            <Link 
              href='/'
              className='block text-sm text-text-secondary hover:text-primary transition-colors'
            >
              {t('Back_To_Home') || '← Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

