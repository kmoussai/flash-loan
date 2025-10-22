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
    <header className='fixed left-64 right-0 top-0 z-10 h-16 border-b border-gray-200 bg-white'>
      <div className='flex h-full items-center justify-between px-8'>
        <div>
          <h2 className='text-lg font-semibold text-gray-800'>
            Admin Dashboard
          </h2>
        </div>
        <div className='flex items-center space-x-4'>
          <span className='text-sm text-gray-600'>{userEmail}</span>
          <button
            onClick={handleLogout}
            className='rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700'
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

