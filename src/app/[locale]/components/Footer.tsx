'use client'
import { useTranslations } from 'next-intl'
import { Link } from '@/src/navigation'

export const Footer = () => {
  const t = useTranslations('')

  return (
    <footer className='bg-white border-t border-gray-200 py-12'>
      <div className='mx-auto max-w-7xl px-6'>
        {/* Footer Links */}
        <nav className='mb-8 flex flex-wrap justify-center gap-6 text-sm'>
          <Link 
            href='/' 
            className='text-gray-600 hover:text-primary transition-colors'
          >
            {t('Home')}
          </Link>
          <Link 
            href='/privacy-policy' 
            className='text-gray-600 hover:text-primary transition-colors'
          >
            {t('Privacy_Policy_Page')}
          </Link>
          <Link 
            href='/cookie-policy' 
            className='text-gray-600 hover:text-primary transition-colors'
          >
            {t('Cookie_Policy')}
          </Link>
          <Link 
            href='/repayment' 
            className='text-gray-600 hover:text-primary transition-colors'
          >
            {t('Repayment')}
          </Link>
          <Link 
            href='/about' 
            className='text-gray-600 hover:text-primary transition-colors'
          >
            {t('About')}
          </Link>
          <Link 
            href='/contact' 
            className='text-gray-600 hover:text-primary transition-colors'
          >
            {t('Contact')}
          </Link>
          <Link 
            href='/how-it-works' 
            className='text-gray-600 hover:text-primary transition-colors'
          >
            {t('How_It_Works')}
          </Link>
        </nav>

        {/* Copyright */}
        <div className='text-center text-sm text-gray-600'>
          <p>
            {t('Copyright')} © {new Date().getFullYear()} Flash-Loan.{' '}
            <Link 
              href='/privacy-policy' 
              className='text-gray-600 hover:text-primary transition-colors underline'
            >
              {t('Privacy_Policy_Page')}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
