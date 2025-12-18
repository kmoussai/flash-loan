'use client'

import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'
import { AdminSidebarProvider, useAdminSidebar } from './AdminSidebarContext'

function AdminDashboardContent({
  children
}: {
  children: React.ReactNode
}) {
  const { isSidebarOpen } = useAdminSidebar()

  return (
    <div className='flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 overflow-hidden'>
      <AdminSidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-16'
        }`}
      >
        <AdminTopBar />
        <main className='flex-1 overflow-auto mt-16 p-4 lg:p-6'>{children}</main>
      </div>
    </div>
  )
}

export default function AdminDashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <AdminSidebarProvider>
      <AdminDashboardContent>{children}</AdminDashboardContent>
    </AdminSidebarProvider>
  )
}

