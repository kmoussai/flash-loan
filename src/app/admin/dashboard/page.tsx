'use client'

import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Link from 'next/link'

export default function AdminDashboardPage() {
  return (
    <AdminDashboardLayout>
      <div className='space-y-6'>
        {/* Welcome Section with Gradient */}
        <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#333366] via-[#097fa5] to-[#0a95c2] p-8 text-white shadow-lg'>
          <div className='relative z-10'>
            <h1 className='mb-2 text-3xl font-bold'>
              Welcome to Flash-Loan Admin
            </h1>
            <p className='text-lg text-white/90'>
              Manage applications, users, and grow your business
            </p>
          </div>
          <div className='absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl'></div>
          <div className='absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl'></div>
        </div>

        {/* Stats Grid with Modern Cards */}
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {/* Total Applications */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
                <span className='rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600'>
                  +0%
                </span>
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Total Applications
              </h3>
              <p className='text-3xl font-bold text-gray-900'>0</p>
              <p className='mt-2 text-xs text-gray-500'>No applications yet</p>
            </div>
          </div>

          {/* Pending Review */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                <span className='rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600'>
                  Live
                </span>
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Pending Review
              </h3>
              <p className='text-3xl font-bold text-gray-900'>0</p>
              <p className='mt-2 text-xs text-gray-500'>Awaiting review</p>
            </div>
          </div>

          {/* Approved */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                <span className='rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600'>
                  +0%
                </span>
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Approved
              </h3>
              <p className='text-3xl font-bold text-gray-900'>0</p>
              <p className='mt-2 text-xs text-gray-500'>Successfully approved</p>
            </div>
          </div>

          {/* Active Users */}
          <div className='group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl'>
            <div className='absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-2xl transition-transform duration-300 group-hover:scale-150'></div>
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'>
                  <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' />
                  </svg>
                </div>
                <span className='rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600'>
                  New
                </span>
              </div>
              <h3 className='mb-1 text-sm font-medium text-gray-600'>
                Active Users
              </h3>
              <p className='text-3xl font-bold text-gray-900'>0</p>
              <p className='mt-2 text-xs text-gray-500'>Registered users</p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className='grid gap-6 lg:grid-cols-2'>
          {/* Recent Activity */}
          <div className='rounded-2xl bg-white p-6 shadow-md'>
            <div className='mb-6 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-gray-900'>
                Recent Activity
              </h2>
              <Link
                href='/admin/applications'
                className='text-sm font-medium text-[#097fa5] hover:text-[#333366] transition-colors'
              >
                View All →
              </Link>
            </div>
            <div className='flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-12'>
              <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200'>
                <svg className='h-8 w-8 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                </svg>
              </div>
              <p className='mb-2 text-sm font-medium text-gray-900'>No recent activity</p>
              <p className='text-center text-xs text-gray-500'>
                Activities will appear here once users start applying for loans
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className='rounded-2xl bg-white p-6 shadow-md'>
            <h2 className='mb-6 text-xl font-bold text-gray-900'>
              Quick Actions
            </h2>
            <div className='space-y-3'>
              <Link
                href='/admin/applications'
                className='group flex items-center justify-between rounded-xl border-2 border-gray-100 p-4 transition-all duration-300 hover:border-[#097fa5] hover:bg-gradient-to-r hover:from-[#097fa5]/5 hover:to-transparent'
              >
                <div className='flex items-center space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white'>
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                    </svg>
                  </div>
                  <span className='font-medium text-gray-700'>View Applications</span>
                </div>
                <svg className='h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </Link>

              <Link
                href='/admin/clients'
                className='group flex items-center justify-between rounded-xl border-2 border-gray-100 p-4 transition-all duration-300 hover:border-[#097fa5] hover:bg-gradient-to-r hover:from-[#097fa5]/5 hover:to-transparent'
              >
                <div className='flex items-center space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white'>
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' />
                    </svg>
                  </div>
                  <span className='font-medium text-gray-700'>Manage Clients</span>
                </div>
                <svg className='h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </Link>

              <Link
                href='/admin/staff'
                className='group flex items-center justify-between rounded-xl border-2 border-gray-100 p-4 transition-all duration-300 hover:border-[#097fa5] hover:bg-gradient-to-r hover:from-[#097fa5]/5 hover:to-transparent'
              >
                <div className='flex items-center space-x-4'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white'>
                    <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                    </svg>
                  </div>
                  <span className='font-medium text-gray-700'>Manage Staff</span>
                </div>
                <svg className='h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

