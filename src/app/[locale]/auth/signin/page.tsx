'use client'

import { createClient } from '@/src/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/src/navigation'
import Button from '../../components/Button'
import Image from 'next/image'

export default function SignInPage() {
  const t = useTranslations('')
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if user is a client (not staff) by querying directly
        const { data: staffData } = await supabase
          .from('staff')
          .select('id')
          .eq('id', user.id)
          .single()
        
        // If not staff, check if they're a client
        if (!staffData) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single()
          
          if (userData) {
            router.push('/client/dashboard')
            router.refresh()
          }
        }
      }
    }
    checkUser()
  }, [supabase, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (data.session) {
        // Check if user is a client (not staff/admin) by querying directly
        const { data: staffData } = await supabase
          .from('staff')
          .select('id')
          .eq('id', data.user.id)
          .single()
        
        if (staffData) {
          // Staff/admin users should use admin login
          setError(t('Invalid_Client_Account') || 'This account is for staff/admin use. Please use the admin login.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        
        // Check if they're a client
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single()
        
        if (userData) {
          router.push('/client/dashboard')
          router.refresh()
        } else {
          setError(t('Invalid_Client_Account') || 'This account is not registered as a client.')
          await supabase.auth.signOut()
          setLoading(false)
        }
      }
    } catch (err: any) {
      setError(err.message || (t('Login_Error') || 'An unexpected error occurred'))
      setLoading(false)
    }
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
              {t('Sign_In') || 'Sign In'}
            </h1>
            <p className='text-text-secondary text-sm sm:text-base'>
              {t('Sign_In_Subtitle') || 'Sign in to access your dashboard'}
            </p>
          </div>

          <form onSubmit={handleLogin} className='space-y-6'>
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

            <div>
              <label
                htmlFor='password'
                className='mb-2 block text-sm font-medium text-primary'
              >
                {t('Password') || 'Password'}
              </label>
              <input
                id='password'
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className='w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                placeholder='••••••••'
                autoComplete='current-password'
              />
            </div>

            <Button
              type='submit'
              variant='primary'
              size='large'
              className='w-full'
              disabled={loading}
            >
              {loading ? (t('Signing_In') || 'Signing in...') : (t('Sign_In') || 'Sign In')}
            </Button>
          </form>

          <div className='mt-6 text-center space-y-2'>
            <Link 
              href='/auth/forgot-password'
              className='block text-sm text-primary hover:text-primary/80 transition-colors font-medium'
            >
              {t('Forgot_Password') || 'Forgot Password?'}
            </Link>
            <Link 
              href='/'
              className='block text-sm text-text-secondary hover:text-primary transition-colors'
            >
              {t('Back_To_Home') || '← Back to Home'}
            </Link>
          </div>

          <div className='mt-4 text-center text-xs text-text-secondary'>
            <p>{t('Protected_By_Auth') || 'Protected by secure authentication'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

