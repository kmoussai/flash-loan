'use client'

import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.session && data.user) {
        // Check if user is staff using client-side Supabase client
        const { data: staffData } = await supabase
          .from('staff')
          .select('id')
          .eq('id', data.user.id)
          .single()
        
        if (staffData) {
          // User is staff - proceed to admin dashboard
          router.push('/admin/dashboard')
          router.refresh()
        } else {
          // Check if user is a client
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single()
          
          if (userData) {
            // Client trying to access admin - redirect to client dashboard
            const locale = window.location.pathname.split('/')[1] || 'en'
            router.push(`/${locale}/dashboard`)
            setError('Access denied: You do not have permission to access the admin panel.')
          } else {
            setError('Access denied: User account not found.')
          }
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800'>
      <div className='w-full max-w-md'>
        <div className='rounded-2xl bg-white p-8 shadow-2xl'>
          <div className='mb-8 text-center'>
            <h1 className='mb-2 text-3xl font-bold text-gray-900'>
              Flash-Loan Admin
            </h1>
            <p className='text-gray-600'>Sign in to access the admin panel</p>
          </div>

          <form onSubmit={handleLogin} className='space-y-6'>
            {error && (
              <div className='rounded-lg bg-red-50 p-4 text-sm text-red-600'>
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor='email'
                className='mb-2 block text-sm font-medium text-gray-700'
              >
                Email Address
              </label>
              <input
                id='email'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className='w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='admin@flash-loan.ca'
              />
            </div>

            <div>
              <label
                htmlFor='password'
                className='mb-2 block text-sm font-medium text-gray-700'
              >
                Password
              </label>
              <input
                id='password'
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className='w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='••••••••'
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className='mt-6 text-center text-sm text-gray-600'>
            <p>Protected by Supabase Authentication</p>
          </div>
        </div>
      </div>
    </div>
  )
}

