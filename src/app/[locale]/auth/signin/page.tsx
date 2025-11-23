import { redirect } from '@/src/navigation-server'
import { getTranslations } from 'next-intl/server'
import { createServerSupabaseClient } from '@/src/lib/supabase/server'
import { getUserType } from '@/src/lib/supabase/db-helpers'
import Link from 'next/link'
import Image from 'next/image'
import SignInForm from './components/SignInForm'

interface SignInPageProps {
  params: {
    locale: string
  }
}

export default async function SignInPage({ params: { locale } }: SignInPageProps) {
  const t = await getTranslations('')
  const supabase = await createServerSupabaseClient()
  
  // Check if user is already authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Check if user is a client (not staff)
    const userType = await getUserType(user.id, true)
    
    if (userType === 'client') {
      // Already authenticated as client, redirect to dashboard
      redirect('/client/dashboard')
    }
    // If staff, they should use admin login, so we'll show the signin form
  }

  return (
    <div className='min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6'>
      <div className='w-full max-w-md'>
        <div className='rounded-2xl bg-background-secondary border border-gray-200 p-6 sm:p-8 shadow-lg'>
          {/* Logo */}
          <div className='mb-8 flex justify-center'>
            <Link href={`/${locale}`}>
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

          <SignInForm locale={locale} />

          <div className='mt-6 text-center space-y-2'>
            <Link 
              href={`/${locale}/auth/forgot-password`}
              className='block text-sm text-primary hover:text-primary/80 transition-colors font-medium'
            >
              {t('Forgot_Password') || 'Forgot Password?'}
            </Link>
            <Link 
              href={`/${locale}`}
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

