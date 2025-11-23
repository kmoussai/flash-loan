import { createLocalizedPathnamesNavigation } from 'next-intl/navigation'
import { locales } from './i18n'
import { localePrefix, pathnames } from './navigation-config'

// Re-export redirect for server components
// This file is server-only, so redirect can be used in server components
export const { redirect } = createLocalizedPathnamesNavigation({ 
  locales, 
  localePrefix, 
  pathnames 
})

