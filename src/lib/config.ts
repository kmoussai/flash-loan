export function getAppUrl(): string {
  // First check explicit APP_URL or NEXT_PUBLIC_APP_URL
  const fromEnv = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.replace(/\/$/, '')
  
  // Check NEXT_PUBLIC_SITE_URL (commonly used in production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }
  
  // Check VERCEL_URL (available in Vercel deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Fallback to localhost only in development
  return 'http://localhost:3000'
}


