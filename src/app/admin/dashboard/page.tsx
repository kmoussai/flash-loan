'use client'

import AdminDashboardLayout from '../components/AdminDashboardLayout'

export default function AdminDashboardPage() {
  return (
    <AdminDashboardLayout>
      <div className='space-y-4'>
        {/* Welcome Section */}
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <h1 className='mb-1 text-2xl font-bold text-gray-900'>
            Welcome to Admin Dashboard
          </h1>
          <p className='text-sm text-gray-600'>
            Manage your Flash-Loan applications, users, and settings
          </p>
        </div>

        {/* Stats Grid */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-gray-600'>
                Total Applications
              </h3>
              <span className='text-xl'>📝</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>0</p>
            <p className='mt-0.5 text-xs text-gray-500'>No data yet</p>
          </div>

          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-gray-600'>
                Pending Review
              </h3>
              <span className='text-xl'>⏳</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>0</p>
            <p className='mt-0.5 text-xs text-gray-500'>No pending applications</p>
          </div>

          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-gray-600'>Approved</h3>
              <span className='text-xl'>✅</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>0</p>
            <p className='mt-0.5 text-xs text-gray-500'>No approved applications</p>
          </div>

          <div className='rounded-lg bg-white p-4 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-gray-600'>
                Active Users
              </h3>
              <span className='text-xl'>👥</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>0</p>
            <p className='mt-0.5 text-xs text-gray-500'>No users yet</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <h2 className='mb-3 text-lg font-semibold text-gray-900'>
            Recent Activity
          </h2>
          <div className='rounded-lg border border-gray-200 p-6 text-center'>
            <p className='text-sm text-gray-500'>No recent activity to display</p>
            <p className='mt-1 text-xs text-gray-400'>
              Activities will appear here once users start applying for loans
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className='rounded-lg bg-white p-4 shadow-sm'>
          <h2 className='mb-3 text-lg font-semibold text-gray-900'>
            Quick Actions
          </h2>
          <div className='grid gap-3 md:grid-cols-3'>
            <button className='rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50'>
              <span className='mb-1 block text-2xl'>📋</span>
              <span className='text-sm font-medium text-gray-700'>
                View Applications
              </span>
            </button>
            <button className='rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50'>
              <span className='mb-1 block text-2xl'>👤</span>
              <span className='text-sm font-medium text-gray-700'>Manage Users</span>
            </button>
            <button className='rounded-lg border-2 border-dashed border-gray-300 p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50'>
              <span className='mb-1 block text-2xl'>⚙️</span>
              <span className='text-sm font-medium text-gray-700'>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

