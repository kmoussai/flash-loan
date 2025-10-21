'use client'
import { useTranslations } from 'next-intl'
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
export default function ApplyPage() {
  const t = useTranslations('')

  return (
    <div className='min-h-screen bg-background'>
      {/* Compact Hero Section with Logo */}
      <section className='bg-gradient-to-br from-primary/10 to-secondary/10 py-8'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='flex flex-col items-center gap-4 sm:flex-row sm:justify-between'>
            {/* Logo */}
            <Link href='/'>
              <div className='relative h-12 w-32'>
                <Image
                  src='https://flash-loan.ca/wp-content/uploads/2025/01/FlashLoanLogo.png'
                  alt='Flash-Loan Logo'
                  width={128}
                  height={48}
                  className='h-full w-full object-contain'
                  priority
                />
              </div>
            </Link>
            
            {/* Page Title */}
            <div className='text-center sm:flex-1 sm:text-center'>
              <h1 className='text-2xl font-bold text-primary sm:text-3xl'>
                {t('Apply_Page_Title')}
              </h1>
            </div>

            {/* Language Switcher */}
            <div className='w-32 flex justify-end'>
              <LangSwitcher />
            </div>
          </div>
        </div>
      </section>

      {/* Application Form Section - Full Width */}
      <section className='py-12'>
        <div className='mx-auto max-w-7xl px-6'>
          <LoanApplicationForm />
        </div>
      </section>
    </div>
  )
}

