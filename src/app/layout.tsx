import type { Metadata } from 'next'

// Get the base URL for metadata
const getMetadataBase = (): string => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // In development, use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  return 'https://prod.flash-loan.ca'
}

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBase()),
  title: 'Flash-Loan - Fast and Reliable Personal Loans',
  description: 'Get fast and reliable personal loans and micro-credits in Canada. No credit check required.',
  icons: {
    icon: [
      { url: '/images/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/images/favicon-32x32.png',
    apple: '/images/apple-touch-icon.png',
    other: [
      { rel: 'icon', url: '/images/icon-192x192.png', sizes: '192x192' },
      { rel: 'icon', url: '/images/icon-512x512.png', sizes: '512x512' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
