'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface AdminSidebarContextType {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(
  undefined
)

export function AdminSidebarProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-open')
    if (saved !== null) {
      setIsSidebarOpen(saved === 'true')
    }
  }, [])

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('admin-sidebar-open', String(isSidebarOpen))
  }, [isSidebarOpen])

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev)
  }

  const setSidebarOpen = (open: boolean) => {
    setIsSidebarOpen(open)
  }

  return (
    <AdminSidebarContext.Provider
      value={{ isSidebarOpen, toggleSidebar, setSidebarOpen }}
    >
      {children}
    </AdminSidebarContext.Provider>
  )
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext)
  if (context === undefined) {
    throw new Error(
      'useAdminSidebar must be used within an AdminSidebarProvider'
    )
  }
  return context
}
