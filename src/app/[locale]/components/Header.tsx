'use client'
import { Link } from '@/src/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { FC, useEffect, useState } from 'react'
import LangSwitcher from './LangSwitcher'
import Button from './Button'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  locale: string
}

export const Header: FC<Props> = ({ locale }) => {
  const t = useTranslations('')
  const router = useRouter()
  const supabase = createClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Check if user is a client (not staff) by querying directly
          // Check staff table first
          const { data: staffData } = await supabase
            .from('staff')
            .select('id')
            .eq('id', user.id)
            .single()
          
          if (staffData) {
            // User is staff, not a client
            setIsAuthenticated(false)
            setIsClient(false)
          } else {
            // Check users table
            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .eq('id', user.id)
              .single()
            
            setIsAuthenticated(!!user)
            setIsClient(!!userData)
          }
        } else {
          setIsAuthenticated(false)
          setIsClient(false)
        }
      } catch (error) {
        setIsAuthenticated(false)
        setIsClient(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkAuth()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className='border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur'>
      <div className='mx-auto flex w-full max-w-none flex-row items-center justify-between px-6 py-4'>
        {/* Logo and Brand */}
        <Link lang={locale} href='/'>
          <div className='flex flex-row items-center space-x-3'>
            <div className='relative h-12 w-32'>
              <Image
                src='/images/FlashLoanLogo.png'
                alt='Flash-Loan Logo'
                width={48}
                height={48}
                className='h-full w-full object-contain'
                priority
              />
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className='hidden items-center space-x-8 md:flex'>
          <Link
            lang={locale}
            href='/'
            className='text-sm font-medium text-text-secondary transition-colors hover:text-primary'
          >
            {t('Home')}
          </Link>
          <Link
            lang={locale}
            href='/about'
            className='text-sm font-medium text-text-secondary transition-colors hover:text-primary'
          >
            {t('About')}
          </Link>
          <Link
            lang={locale}
            href='/how-it-works'
            className='text-sm font-medium text-text-secondary transition-colors hover:text-primary'
          >
            {t('How_It_Works')}
          </Link>
          <Link
            lang={locale}
            href='/repayment'
            className='text-sm font-medium text-text-secondary transition-colors hover:text-primary'
          >
            {t('Repayment')}
          </Link>
          <Link
            lang={locale}
            href='/contact'
            className='text-sm font-medium text-text-secondary transition-colors hover:text-primary'
          >
            {t('Contact')}
          </Link>
          
        </nav>

        {/* Right side actions */}
        <div className='flex items-center space-x-3'>
          {/* Auth Buttons */}
          {!loading && (
            <>
              {isAuthenticated && isClient ? (
                <Link lang={locale} href='/dashboard'>
                  <Button
                    variant='secondary'
                    size='small'
                    className='inline-flex'
                  >
                    {t('Dashboard') || 'Dashboard'}
                  </Button>
                </Link>
              ) : (
                /* Login Button */
                <Link lang={locale} href='/auth/signin'>
                  <Button
                    variant='secondary'
                    size='small'
                    className='hidden sm:inline-flex'
                  >
                    {t('Sign_In') || 'Sign In'}
                  </Button>
                </Link>
              )}
            </>
          )}
          
          {/* Apply Now Button - Links to apply page */}
          <Link lang={locale} href='/apply'>
            <Button
              variant='primary'
              size='medium'
              className='hidden sm:inline-flex'
            >
              {t('Apply_Now')}
            </Button>
          </Link>

          {/* Language Switcher */}
          <LangSwitcher />
        </div>
      </div>
    </header>
  )
}
