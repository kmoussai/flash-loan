import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../[locale]/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Flash-Loan Admin Panel',
  description: 'Admin panel for Flash-Loan management'
}

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={inter.className}>
        <div className='min-h-screen bg-gray-50'>{children}</div>
      </body>
    </html>
  )
}

