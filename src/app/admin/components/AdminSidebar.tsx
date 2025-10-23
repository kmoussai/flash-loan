'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard',
    icon: (
      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' />
      </svg>
    )
  },
  { 
    name: 'Clients', 
    href: '/admin/clients',
    icon: (
      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' />
      </svg>
    )
  },
  { 
    name: 'Applications', 
    href: '/admin/applications',
    icon: (
      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
      </svg>
    )
  },
  { 
    name: 'Staff', 
    href: '/admin/staff',
    icon: (
      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
      </svg>
    )
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className='fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-[#333366] via-[#2a2d5a] to-[#1f2147] text-white shadow-2xl'>
      {/* Logo Section */}
      <div className='relative flex h-20 items-center justify-center border-b border-white/10'>
        <div className='absolute inset-0 bg-gradient-to-r from-[#097fa5]/20 to-transparent'></div>
        <div className='relative'>
          <h1 className='bg-gradient-to-r from-white to-[#097fa5] bg-clip-text text-xl font-bold text-transparent'>
            Flash-Loan
          </h1>
          <p className='text-center text-xs text-white/60'>Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className='mt-8 space-y-2 px-4'>
        {navigation.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex items-center space-x-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-[#097fa5] to-[#0a95c2] text-white shadow-lg shadow-[#097fa5]/30'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isActive && (
                <div className='absolute left-0 top-0 h-full w-1 rounded-r-full bg-white'></div>
              )}
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span className='font-medium'>{item.name}</span>
              {isActive && (
                <div className='absolute right-4'>
                  <div className='h-2 w-2 rounded-full bg-white'></div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Decoration */}
      <div className='absolute bottom-0 left-0 right-0 p-4'>
        <div className='rounded-xl bg-gradient-to-r from-[#097fa5]/20 to-[#0a95c2]/20 p-4 backdrop-blur-sm'>
          <p className='text-xs text-white/60'>Version 1.0.0</p>
          <p className='mt-1 text-xs font-medium text-white/80'>© 2025 Flash-Loan</p>
        </div>
      </div>
    </aside>
  )
}

