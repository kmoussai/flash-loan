import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Link } from '@/src/navigation'
import Image from 'next/image'
import LoanApplicationForm from '../components/LoanApplicationForm'
import LangSwitcher from '../components/LangSwitcher'

/**
 * Apply Page - Loan Application
 * 
 * Full-width loan application page with:
 * - No header navigation
 * - Small hero section with logo
 * - Centered multi-step form
 * - Clean, focused layout
 */
interface ApplyPageProps {
  params: {
    locale: string
  }
}

export default async function ApplyPage({
  params: { locale }
}: ApplyPageProps) {
  setRequestLocale(locale)
  const t = await getTranslations('')

  // Check for redirect URL in environment variables
  const redirectUrl = process.env.REDIRECT_URL
  if (redirectUrl) {
    redirect(redirectUrl)
  }

  return (
    <div className='min-h-screen bg-background'>
      {/* Compact Hero Section with Logo */}
      <section className='bg-gradient-to-br from-primary/10 to-secondary/10 py-4 sm:py-6 md:py-8'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6'>
          {/* Mobile Layout: Logo and Lang Switcher in corners, title below */}
          <div className='sm:hidden'>
            {/* Top Row: Logo and Language Switcher */}
            <div className='mb-3 flex items-center justify-between'>
              <Link href='/'>
                <div className='relative h-10 w-28'>
                  <Image
                    src='/images/FlashLoanLogo.png'
                    alt='Flash-Loan Logo'
                    width={128}
                    height={48}
                    className='h-full w-full object-contain'
                    priority
                  />
                </div>
              </Link>
              <LangSwitcher />
            </div>
            {/* Bottom Row: Centered Title */}
            <div className='text-center'>
              <h1 className='text-xl font-bold text-primary'>
                {t('Apply_Page_Title')}
              </h1>
            </div>
          </div>

          {/* Desktop Layout: All in one row */}
          <div className='hidden sm:flex sm:items-center sm:justify-between sm:gap-4'>
            {/* Logo */}
            <Link href='/'>
              <div className='relative h-12 w-32'>
                <Image
                  src='/images/FlashLoanLogo.png'
                  alt='Flash-Loan Logo'
                  width={128}
                  height={48}
                  className='h-full w-full object-contain'
                  priority
                />
              </div>
            </Link>
            
            {/* Page Title */}
            <div className='flex-1 text-center'>
              <h1 className='text-2xl font-bold text-primary md:text-3xl'>
                {t('Apply_Page_Title')}
              </h1>
            </div>

            {/* Language Switcher */}
            <div className='flex w-32 justify-end'>
              <LangSwitcher />
            </div>
          </div>
        </div>
      </section>

      {/* Application Form Section - Full Width */}
      <section className='py-3 sm:py-4 md:py-6'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6'>
          <LoanApplicationForm />
        </div>
      </section>
    </div>
  )
}

