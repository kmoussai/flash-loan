'use client'

import { useEffect, useState } from 'react'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'
import type { Staff } from '@/src/lib/supabase/types'

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'intern' as 'admin' | 'support' | 'intern'
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/staff')
      
      if (!response.ok) {
        throw new Error('Failed to fetch staff')
      }
      
      const staffData = await response.json()
      setStaff(staffData)
      setError(null)
    } catch (err) {
      console.error('Error fetching staff:', err)
      setError('Failed to load staff members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          department: 'IT' // Default department
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Display detailed error information
        const errorDetails = [
          data.error || 'Failed to create staff member',
          data.errorCode ? `Code: ${data.errorCode}` : '',
          data.errorDetails ? `Details: ${data.errorDetails}` : '',
          data.message ? `Message: ${data.message}` : ''
        ].filter(Boolean).join(' | ')
        
        console.error('Full error response:', data)
        throw new Error(errorDetails)
      }
      
      // Log any warnings even on success
      if (data.warning) {
        console.warn('Warning:', data.warning, data.fetchError)
      }

      // Reset form and close modal
      setFormData({
        email: '',
        password: '',
        role: 'intern'
      })
      setShowAddForm(false)
      
      // Refresh staff list
      await fetchStaff()
    } catch (err: any) {
      console.error('Error creating staff:', err)
      setFormError(err.message || 'Failed to create staff member')
    } finally {
      setFormLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'support':
        return 'bg-blue-100 text-blue-800'
      case 'intern':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Staff Members
            </h1>
            <p className='text-xs text-gray-600'>
              Manage internal team members and their roles
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setShowAddForm(true)}
              className='rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md'
            >
              + Add Staff
            </button>
            <div className='rounded-lg bg-white px-4 py-2 shadow-sm'>
              <div className='flex items-center gap-2'>
                <span className='text-xl'>👨‍💼</span>
                <span className='text-2xl font-bold text-gray-900'>
                  {staff.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Staff Modal */}
        {showAddForm && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
            <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-2xl font-bold text-gray-900'>
                  Add New Staff Member
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setFormError(null)
                  }}
                  className='text-gray-400 hover:text-gray-600'
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className='mb-4 rounded-lg bg-red-50 p-3 text-red-600'>
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddStaff} className='space-y-4'>
                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    Email *
                  </label>
                  <input
                    type='email'
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    placeholder='staff@example.com'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    Password *
                  </label>
                  <input
                    type='password'
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    placeholder='Min. 6 characters'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    Role *
                  </label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        role: value as 'admin' | 'support' | 'intern'
                      })
                    }
                    options={[
                      { value: 'intern', label: 'Intern' },
                      { value: 'support', label: 'Support' },
                      { value: 'admin', label: 'Admin' }
                    ]}
                    placeholder='Select role'
                  />
                </div>

                <div className='flex space-x-3 pt-4'>
                  <button
                    type='button'
                    onClick={() => {
                      setShowAddForm(false)
                      setFormError(null)
                    }}
                    className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50'
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    disabled={formLoading}
                    className='flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400'
                  >
                    {formLoading ? 'Creating...' : 'Create Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Staff Table */}
        <div className='rounded-lg bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-4 py-2'>
            <div className='flex items-center justify-between'>
              <h2 className='text-sm font-semibold text-gray-900'>All Staff</h2>
              <span className='text-xs text-gray-500'>
                {staff.length} {staff.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>

          <div className='overflow-x-auto'>
            {loading ? (
              <div className='p-12 text-center'>
                <div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
                <p className='mt-4 text-gray-600'>Loading staff members...</p>
              </div>
            ) : error ? (
              <div className='p-12 text-center'>
                <span className='mb-4 block text-4xl'>⚠️</span>
                <p className='text-red-600'>{error}</p>
              </div>
            ) : staff.length === 0 ? (
              <div className='p-12 text-center'>
                <span className='mb-4 block text-4xl'>👨‍💼</span>
                <p className='text-gray-600'>No staff members found</p>
                <p className='mt-2 text-sm text-gray-400'>
                  Staff members will appear here once they are added to the
                  system
                </p>
              </div>
            ) : (
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Staff ID
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Role
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Department
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Joined
                    </th>
                    <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 bg-white'>
                  {staff.map(member => (
                    <tr
                      key={member.id}
                      className='transition-colors hover:bg-gray-50'
                    >
                      <td className='whitespace-nowrap px-4 py-2'>
                        <div className='flex items-center'>
                          <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600'>
                            {member.role === 'admin'
                              ? '👑'
                              : member.role === 'support'
                                ? '🎧'
                                : '📚'}
                          </div>
                          <div className='ml-3'>
                            <div className='font-mono text-sm text-gray-900'>
                              {member.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='whitespace-nowrap px-4 py-2'>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getRoleBadgeColor(member.role)}`}
                        >
                          {member.role.toUpperCase()}
                        </span>
                      </td>
                      <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>
                        {member.department || (
                          <span className='text-gray-400'>Not assigned</span>
                        )}
                      </td>
                      <td className='whitespace-nowrap px-4 py-2 text-xs text-gray-500'>
                        {formatDate(member.created_at)}
                      </td>
                      <td className='whitespace-nowrap px-4 py-2 text-sm'>
                        <button className='mr-2 text-blue-600 hover:text-blue-800'>
                          Edit
                        </button>
                        <button className='text-red-600 hover:text-red-800'>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid gap-3 md:grid-cols-3'>
          <div className='rounded-lg bg-red-50 p-3 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-red-800'>Admins</h3>
              <span className='text-lg'>👑</span>
            </div>
            <p className='text-2xl font-bold text-red-900'>
              {staff.filter(s => s.role === 'admin').length}
            </p>
          </div>

          <div className='rounded-lg bg-blue-50 p-3 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-blue-800'>
                Support Staff
              </h3>
              <span className='text-lg'>🎧</span>
            </div>
            <p className='text-2xl font-bold text-blue-900'>
              {staff.filter(s => s.role === 'support').length}
            </p>
          </div>

          <div className='rounded-lg bg-gray-50 p-3 shadow-sm'>
            <div className='mb-1 flex items-center justify-between'>
              <h3 className='text-xs font-medium text-gray-800'>Interns</h3>
              <span className='text-lg'>📚</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>
              {staff.filter(s => s.role === 'intern').length}
            </p>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

