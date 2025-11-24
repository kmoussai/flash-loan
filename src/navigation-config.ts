import { Pathnames } from 'next-intl/navigation'
import { locales } from './i18n'

export const localePrefix = 'always'

export const pathnames = {
  '/': '/',
  '/about': '/about',
  '/how-it-works': '/how-it-works',
  '/repayment': '/repayment',
  '/contact': '/contact',
  '/apply': '/apply',
  '/quick-apply': '/quick-apply',
  '/dashboard': '/dashboard',
  '/upload-documents': '/upload-documents',
  '/client/dashboard': '/client/dashboard',
  '/client/dashboard/change-password': '/client/dashboard/change-password',
  '/auth/signin': '/auth/signin',
  '/auth/forgot-password': '/auth/forgot-password',
  '/auth/reset-password': '/auth/reset-password',
  '/admin/dashboard': '/admin/dashboard',
} satisfies Pathnames<typeof locales>

