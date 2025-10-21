'use client'
import { usePathname } from 'next/navigation'

/**
 * Conditional Wrapper Component
 * 
 * Applies max-width container on regular pages
 * but allows full-width on specific routes (like /apply)
 */
interface ConditionalWrapperProps {
  children: React.ReactNode
}

export default function ConditionalWrapper({ children }: ConditionalWrapperProps) {
  const pathname = usePathname()
  
  // Routes that should be full-width
  const fullWidthRoutes = ['/apply']
  
  // Check if current route should be full-width
  const isFullWidth = fullWidthRoutes.some(route => pathname.includes(route))
  
  if (isFullWidth) {
    return <>{children}</>
  }
  
  return <div className='mx-auto max-w-screen-2xl'>{children}</div>
}

