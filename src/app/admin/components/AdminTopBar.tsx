'use client'

import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminTopBar() {
  const router = useRouter()
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className='fixed left-64 right-0 top-0 z-10 h-20 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl'>
      <div className='flex h-full items-center justify-between px-8'>
        {/* Search Bar */}
        <div className='flex flex-1 items-center'>
          <div className='relative w-96'>
            <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4'>
              <svg className='h-5 w-5 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            </div>
            <input
              type='text'
              placeholder='Search applications, clients...'
              className='w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-[#097fa5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#097fa5]/20'
            />
          </div>
        </div>

        {/* Right Section */}
        <div className='flex items-center space-x-4'>
          {/* Notifications */}
          <button className='relative rounded-xl p-2 text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900'>
            <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
            </svg>
            <span className='absolute right-1 top-1 flex h-2 w-2'>
              <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-[#097fa5] opacity-75'></span>
              <span className='relative inline-flex h-2 w-2 rounded-full bg-[#097fa5]'></span>
            </span>
          </button>

          {/* User Info */}
          <div className='flex items-center space-x-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 py-2 pl-4 pr-2'>
            <div className='text-right'>
              <p className='text-sm font-medium text-gray-900'>Admin User</p>
              <p className='text-xs text-gray-500'>{userEmail}</p>
            </div>
            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#333366] to-[#097fa5] text-white shadow-lg'>
              <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className='group flex items-center space-x-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-600 hover:to-red-700 hover:shadow-xl'
          >
            <svg className='h-4 w-4 transition-transform group-hover:scale-110' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}

