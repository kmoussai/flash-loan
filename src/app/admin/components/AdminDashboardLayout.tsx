'use client'

import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'

export default function AdminDashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20'>
      <AdminSidebar />
      <div className='ml-64 flex-1'>
        <AdminTopBar />
        <main className='mt-20 p-8'>{children}</main>
      </div>
    </div>
  )
}

