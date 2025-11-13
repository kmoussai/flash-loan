'use client'
import {
  createLocalizedPathnamesNavigation,
  Pathnames
} from 'next-intl/navigation'
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
  '/auth/signin': '/auth/signin',
  '/auth/forgot-password': '/auth/forgot-password',
  '/auth/reset-password': '/auth/reset-password',
  '/admin/dashboard': '/admin/dashboard',
} satisfies Pathnames<typeof locales>

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createLocalizedPathnamesNavigation({ locales, localePrefix, pathnames })
