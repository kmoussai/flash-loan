'use client'
import { usePathname } from 'next/navigation'
import { Header } from './Header'

/**
 * Conditional Header Component
 * 
 * Hides the header on specific routes (like /apply)
 * to provide a clean, focused user experience
 */
interface ConditionalHeaderProps {
  locale: string
}

export default function ConditionalHeader({ locale }: ConditionalHeaderProps) {
  const pathname = usePathname()
  
  // Routes where header should be hidden
  const hideHeaderRoutes = ['/apply', '/dashboard']
  
  // Check if current route should hide header
  const shouldHideHeader = hideHeaderRoutes.some(route => pathname.includes(route))
  
  if (shouldHideHeader) {
    return null
  }
  
  return <Header locale={locale} />
}

