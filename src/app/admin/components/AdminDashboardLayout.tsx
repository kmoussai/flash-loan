'use client'

import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'

export default function AdminDashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-screen bg-gray-50'>
      <AdminSidebar />
      <div className='ml-64 flex-1'>
        <AdminTopBar />
        <main className='mt-16 p-8'>{children}</main>
      </div>
    </div>
  )
}

