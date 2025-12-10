'use client'
import { usePathname } from '@/src/navigation'
import { Footer } from './Footer'

interface ConditionalFooterProps {
  locale: string
}

export default function ConditionalFooter({ locale }: ConditionalFooterProps) {
  const pathname = usePathname()
  
  // Routes where footer should be hidden
  const hideFooterRoutes = [
    '/apply',
    '/client/dashboard',
    '/quick-apply',
    'signin',
    'forgot-password',
    'reset-password'
  ]
  
  // Check if current route should hide footer
  const shouldHideFooter = hideFooterRoutes.some(route => pathname.includes(route))
  
  if (shouldHideFooter) {
    return null
  }
  
  return <Footer />
}


