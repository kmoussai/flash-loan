'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminSidebar } from './AdminSidebarContext'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard',
    icon: (
      <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' />
      </svg>
    )
  },
  { 
    name: 'Clients', 
    href: '/admin/clients',
    icon: (
      <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' />
      </svg>
    )
  },
  { 
    name: 'Applications', 
    href: '/admin/applications',
    icon: (
      <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
      </svg>
    )
  },
  { 
    name: 'Loans', 
    href: '/admin/loan',
    icon: (
      <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
      </svg>
    )
  },
  { 
    name: 'Deposits', 
    href: '/admin/deposits',
    icon: (
      <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
      </svg>
    )
  },
  { 
    name: 'Collections', 
    href: '/admin/collections',
    icon: (
      <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
      </svg>
    )
  },
  { 
    name: 'Staff', 
    href: '/admin/staff',
    icon: (
      <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
      </svg>
    )
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { isSidebarOpen } = useAdminSidebar()

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-[#333366] via-[#2a2d5a] to-[#1f2147] text-white shadow-2xl transition-all duration-300 z-30 ${
        isSidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Logo Section */}
      <div className={`relative flex h-16 items-center justify-center border-b border-white/10 transition-all duration-300 ${
        isSidebarOpen ? 'px-0' : 'px-0'
      }`}>
        <div className='absolute inset-0 bg-gradient-to-r from-[#097fa5]/20 to-transparent'></div>
        <div className={`relative transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 h-0 overflow-hidden'}`}>
          <h1 className='bg-gradient-to-r from-white to-[#097fa5] bg-clip-text text-lg font-bold text-transparent'>
            Flash-Loan
          </h1>
          <p className='text-center text-[10px] text-white/60'>Admin Portal</p>
        </div>
        {!isSidebarOpen && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='h-8 w-8 rounded-lg bg-gradient-to-br from-[#097fa5] to-[#0a95c2] flex items-center justify-center'>
              <span className='text-white font-bold text-sm'>FL</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`mt-4 space-y-1 transition-all duration-300 ${
        isSidebarOpen ? 'px-3' : 'px-2'
      }`}>
        {navigation.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex items-center rounded-lg transition-all duration-200 ${
                isSidebarOpen ? 'space-x-2.5 px-3 py-2' : 'justify-center px-2 py-2'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-[#097fa5] to-[#0a95c2] text-white shadow-md shadow-[#097fa5]/30'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              title={!isSidebarOpen ? item.name : undefined}
            >
              {isActive && (
                <div className='absolute left-0 top-0 h-full w-0.5 rounded-r-full bg-white'></div>
              )}
              <div className={`transition-transform duration-200 flex-shrink-0 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                {item.icon}
              </div>
              <span className={`text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                isSidebarOpen ? 'opacity-100 max-w-full' : 'opacity-0 w-0 overflow-hidden'
              }`}>
                {item.name}
              </span>
              {isActive && isSidebarOpen && (
                <div className='absolute right-3'>
                  <div className='h-1.5 w-1.5 rounded-full bg-white'></div>
                </div>
              )}
              {/* Tooltip for collapsed state */}
              {!isSidebarOpen && (
                <div className='absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50'>
                  {item.name}
                  <div className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full border-4 border-transparent border-r-gray-900'></div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Decoration */}
      <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
        isSidebarOpen ? 'p-3' : 'p-2'
      }`}>
        <div className={`rounded-lg bg-gradient-to-r from-[#097fa5]/20 to-[#0a95c2]/20 backdrop-blur-sm transition-all duration-300 ${
          isSidebarOpen ? 'p-2.5' : 'p-2'
        }`}>
          <div className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <p className='text-[10px] text-white/60'>Version 1.0.0</p>
            <p className='mt-0.5 text-[10px] font-medium text-white/80'>© 2025 Flash-Loan</p>
          </div>
          {!isSidebarOpen && (
            <div className='flex items-center justify-center'>
              <div className='h-1 w-1 rounded-full bg-white/60'></div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

