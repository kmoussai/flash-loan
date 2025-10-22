'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { name: 'Clients', href: '/admin/clients', icon: '👥' },
  { name: 'Staff', href: '/admin/staff', icon: '👨‍💼' },
  // { name: 'Applications', href: '/admin/applications', icon: '📝' },
  // { name: 'Settings', href: '/admin/settings', icon: '⚙️' }
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className='fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white'>
      <div className='flex h-16 items-center justify-center border-b border-gray-800'>
        <h1 className='text-xl font-bold'>Flash-Loan Admin</h1>
      </div>
      <nav className='mt-8 space-y-1 px-4'>
        {navigation.map(item => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors ${
              pathname === item.href
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className='text-xl'>{item.icon}</span>
            <span className='font-medium'>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

