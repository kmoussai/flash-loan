'use client'
import { createLocalizedPathnamesNavigation } from 'next-intl/navigation'
import { locales } from './i18n'
import { localePrefix, pathnames } from './navigation-config'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createLocalizedPathnamesNavigation({ locales, localePrefix, pathnames })
