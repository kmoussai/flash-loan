'use client'
import { Link } from '@/src/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { FC } from 'react'
import LangSwitcher from './LangSwitcher'
import Button from './Button'

interface Props {
  locale: string
}

export const Header: FC<Props> = ({ locale }) => {
  const t = useTranslations('')

  return (
    <header className='border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur'>
      <div className='mx-auto flex w-full max-w-none flex-row items-center justify-between px-6 py-4'>
        {/* Logo and Brand */}
        <Link lang={locale} href='/'>
          <div className='flex flex-row items-center space-x-3'>
            <div className='relative h-12 w-32'>
              <Image
                src='https://flash-loan.ca/wp-content/uploads/2025/01/FlashLoanLogo.png'
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
          {/* Apply Now Button */}
          <Button
            variant='primary'
            size='medium'
            className='hidden sm:inline-flex'
          >
            {t('Apply_Now')}
          </Button>

          {/* Language Switcher */}
          <LangSwitcher />
        </div>
      </div>
    </header>
  )
}
