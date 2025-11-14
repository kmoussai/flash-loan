'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/src/navigation'
import Button from '../../../components/Button'

interface SignInFormProps {
  locale: string
}

export default function SignInForm({ locale }: SignInFormProps) {
  const t = useTranslations('')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.error || t('Login_Error') || 'An unexpected error occurred'
        )
        setLoading(false)
        return
      }

      if (data.success) {
        router.push(`/client/dashboard`)
      }
    } catch (err: any) {
      setError(
        err.message || t('Login_Error') || 'An unexpected error occurred'
      )
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className='space-y-6'>
      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600'>
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
          className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
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
          className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-primary focus:border-primary focus:outline-none focus:ring-2'
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
        {loading
          ? t('Signing_In') || 'Signing in...'
          : t('Sign_In') || 'Sign In'}
      </Button>
    </form>
  )
}
