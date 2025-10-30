export function getAppUrl(): string {
  const fromEnv = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.replace(/\/$/, '')
  // Fallback to localhost for dev
  return 'http://localhost:3000'
}


