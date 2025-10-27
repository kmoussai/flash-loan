'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import Select from '@/src/app/[locale]/components/Select'
import type { LoanApplication, ApplicationStatus } from '@/src/lib/supabase/types'

// Extended type for application with client details
interface ApplicationWithDetails extends LoanApplication {
  users: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    preferred_language: string | null
    kyc_status: string
    date_of_birth: string | null
    residence_status: string | null
    gross_salary: number | null
    rent_or_mortgage_cost: number | null
    heating_electricity_cost: number | null
    car_loan: number | null
    furniture_loan: number | null
  } | null
  addresses: {
    id: string
    street_number: string | null
    street_name: string | null
    apartment_number: string | null
    city: string
    province: string
    postal_code: string
    moving_date: string | null
  }[] | null
  references: {
    id: string
    first_name: string
    last_name: string
    phone: string
    relationship: string
  }[] | null
}

export default function ApplicationDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const applicationId = params.id as string
  
  const [application, setApplication] = useState<ApplicationWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails()
    }
  }, [applicationId])

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/applications/${applicationId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch application details')
      }
      
      const data = await response.json()
      setApplication(data.application)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching application:', err)
      setError(err.message || 'Failed to load application details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const getAddressString = () => {
    if (!application?.addresses || application.addresses.length === 0) return 'N/A'
    const addr = application.addresses[0]
    return `${addr.street_number || ''} ${addr.street_name || ''}${addr.apartment_number ? `, Apt ${addr.apartment_number}` : ''}, ${addr.city}, ${addr.province} ${addr.postal_code}`.trim()
  }

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className='flex h-96 items-center justify-center'>
          <div className='text-center'>
            <div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
            <p className='mt-4 text-gray-600'>Loading application details...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  if (error || !application) {
    return (
      <AdminDashboardLayout>
        <div className='flex h-96 items-center justify-center'>
          <div className='text-center'>
            <span className='mb-4 block text-4xl'>⚠️</span>
            <p className='text-red-600'>{error || 'Application not found'}</p>
            <button
              onClick={() => router.push('/admin/applications')}
              className='mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
            >
              Back to Applications
            </button>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => router.push('/admin/applications')}
                className='flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50'
              >
                ←
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>
                  Application Details
                </h1>
                <p className='text-xs text-gray-600'>
                  Application #{application.id.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
          
          <div className='flex items-center gap-3'>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeColor(application.application_status)}`}
            >
              {application.application_status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Client Information Card */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
            <span className='text-xl'>👤</span>
            <h2 className='text-lg font-semibold text-gray-900'>Client Information</h2>
          </div>
          
          <div className='grid gap-6 md:grid-cols-2'>
            <div>
              <label className='text-xs font-medium text-gray-500'>Full Name</label>
              <p className='mt-1 text-sm font-medium text-gray-900'>
                {application.users?.first_name} {application.users?.last_name}
              </p>
            </div>
            
            <div>
              <label className='text-xs font-medium text-gray-500'>Email</label>
              <p className='mt-1 text-sm text-gray-900'>{application.users?.email || 'N/A'}</p>
            </div>
            
            <div>
              <label className='text-xs font-medium text-gray-500'>Phone</label>
              <p className='mt-1 text-sm text-gray-900'>{application.users?.phone || 'N/A'}</p>
            </div>
            
            <div>
              <label className='text-xs font-medium text-gray-500'>Date of Birth</label>
              <p className='mt-1 text-sm text-gray-900'>{formatDate(application.users?.date_of_birth || null)}</p>
            </div>
            
            <div>
              <label className='text-xs font-medium text-gray-500'>Preferred Language</label>
              <p className='mt-1 text-sm text-gray-900'>{application.users?.preferred_language || 'N/A'}</p>
            </div>
            
            <div>
              <label className='text-xs font-medium text-gray-500'>KYC Status</label>
              <p className='mt-1 text-sm text-gray-900 uppercase'>{application.users?.kyc_status || 'N/A'}</p>
            </div>
          </div>

          {/* Address */}
          {application.addresses && application.addresses.length > 0 && (
            <div className='mt-6 border-t border-gray-200 pt-6'>
              <label className='text-xs font-medium text-gray-500'>Address</label>
              <p className='mt-1 text-sm text-gray-900'>{getAddressString()}</p>
              {application.addresses[0].moving_date && (
                <p className='mt-1 text-xs text-gray-500'>
                  Moved in: {formatDate(application.addresses[0].moving_date)}
                </p>
              )}
            </div>
          )}

          {/* Financial Obligations (if Quebec) */}
          {(application.users?.residence_status || application.users?.gross_salary) && (
            <div className='mt-6 border-t border-gray-200 pt-6'>
              <label className='text-xs font-medium text-gray-500'>Financial Obligations</label>
              <div className='mt-2 grid gap-2 text-sm'>
                {application.users?.residence_status && (
                  <p className='text-gray-700'>Residence: <span className='font-medium'>{application.users.residence_status}</span></p>
                )}
                {application.users?.gross_salary && (
                  <p className='text-gray-700'>Gross Salary: <span className='font-medium'>{formatCurrency(application.users.gross_salary)}</span></p>
                )}
                {application.users?.rent_or_mortgage_cost && (
                  <p className='text-gray-700'>Rent/Mortgage: <span className='font-medium'>{formatCurrency(application.users.rent_or_mortgage_cost)}</span></p>
                )}
                {application.users?.heating_electricity_cost && (
                  <p className='text-gray-700'>Heating/Electricity: <span className='font-medium'>{formatCurrency(application.users.heating_electricity_cost)}</span></p>
                )}
                {application.users?.car_loan && (
                  <p className='text-gray-700'>Car Loan: <span className='font-medium'>{formatCurrency(application.users.car_loan)}</span></p>
                )}
                {application.users?.furniture_loan && (
                  <p className='text-gray-700'>Furniture Loan: <span className='font-medium'>{formatCurrency(application.users.furniture_loan)}</span></p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loan Information Card */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
            <span className='text-xl'>💰</span>
            <h2 className='text-lg font-semibold text-gray-900'>Loan Information</h2>
          </div>
          
          <div className='grid gap-6 md:grid-cols-2'>
            <div>
              <label className='text-xs font-medium text-gray-500'>Loan Amount</label>
              <p className='mt-1 text-lg font-bold text-gray-900'>
                {formatCurrency(application.loan_amount)}
              </p>
            </div>
            
            <div>
              <label className='text-xs font-medium text-gray-500'>Loan Type</label>
              <p className='mt-1 text-sm text-gray-900 capitalize'>
                {application.loan_type === 'with-documents' ? 'With Documents' : 'Without Documents'}
              </p>
            </div>
            
            <div>
              <label className='text-xs font-medium text-gray-500'>Income Source</label>
              <p className='mt-1 text-sm text-gray-900 capitalize'>
                {application.income_source.replace(/-/g, ' ')}
              </p>
            </div>
            
            <div>
              <label className='text-xs font-medium text-gray-500'>Bankruptcy Plan</label>
              <p className='mt-1 text-sm text-gray-900'>
                {application.bankruptcy_plan ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          {/* Income Fields */}
          {application.income_fields && Object.keys(application.income_fields).length > 0 && (
            <div className='mt-6 border-t border-gray-200 pt-6'>
              <label className='text-xs font-medium text-gray-500'>Income Details</label>
              <div className='mt-2 grid gap-2 text-sm'>
                {Object.entries(application.income_fields).map(([key, value]) => (
                  <p key={key} className='text-gray-700'>
                    <span className='font-medium capitalize'>{key.replace(/_/g, ' ')}:</span> {String(value)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Flinks Information Card */}
        {application.flinks_login_id && (
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
              <span className='text-xl'>🔐</span>
              <h2 className='text-lg font-semibold text-gray-900'>Flinks Verification</h2>
            </div>
            
            <div className='grid gap-6 md:grid-cols-2'>
              <div>
                <label className='text-xs font-medium text-gray-500'>Institution</label>
                <p className='mt-1 text-sm text-gray-900'>{application.flinks_institution || 'N/A'}</p>
              </div>
              
              <div>
                <label className='text-xs font-medium text-gray-500'>Verification Status</label>
                <p className='mt-1'>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    application.flinks_verification_status === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : application.flinks_verification_status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {application.flinks_verification_status?.toUpperCase() || 'PENDING'}
                  </span>
                </p>
              </div>

              {application.flinks_connected_at && (
                <div>
                  <label className='text-xs font-medium text-gray-500'>Connected At</label>
                  <p className='mt-1 text-sm text-gray-900'>{formatDateTime(application.flinks_connected_at)}</p>
                </div>
              )}
            </div>

            {application.flinks_login_id && (
              <div className='mt-4 rounded-md bg-gray-50 p-3 text-xs'>
                <p className='text-gray-500'>Login ID: <span className='font-mono text-gray-900'>{application.flinks_login_id}</span></p>
              </div>
            )}
          </div>
        )}

        {/* References Card */}
        {application.references && application.references.length > 0 && (
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
              <span className='text-xl'>📋</span>
              <h2 className='text-lg font-semibold text-gray-900'>References</h2>
            </div>
            
            <div className='space-y-4'>
              {application.references.map((ref, index) => (
                <div key={ref.id} className='rounded-lg border border-gray-200 p-4'>
                  <div className='mb-2 flex items-center gap-2'>
                    <span className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600'>
                      {index + 1}
                    </span>
                    <h3 className='font-medium text-gray-900'>{ref.first_name} {ref.last_name}</h3>
                  </div>
                  <div className='grid gap-2 text-sm'>
                    <p className='text-gray-600'>Phone: {ref.phone}</p>
                    <p className='text-gray-600'>Relationship: {ref.relationship}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Card */}
        <div className='rounded-lg bg-white p-6 shadow-sm'>
          <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
            <span className='text-xl'>📅</span>
            <h2 className='text-lg font-semibold text-gray-900'>Timeline</h2>
          </div>
          
          <div className='space-y-3 text-sm'>
            <div className='flex items-center gap-3'>
              <span className='text-gray-500'>Created:</span>
              <span className='font-medium text-gray-900'>{formatDateTime(application.created_at)}</span>
            </div>
            
            {application.submitted_at && (
              <div className='flex items-center gap-3'>
                <span className='text-gray-500'>Submitted:</span>
                <span className='font-medium text-gray-900'>{formatDateTime(application.submitted_at)}</span>
              </div>
            )}
            
            {application.approved_at && (
              <div className='flex items-center gap-3'>
                <span className='text-gray-500'>Approved:</span>
                <span className='font-medium text-green-600'>{formatDateTime(application.approved_at)}</span>
              </div>
            )}
            
            {application.rejected_at && (
              <div className='flex items-center gap-3'>
                <span className='text-gray-500'>Rejected:</span>
                <span className='font-medium text-red-600'>{formatDateTime(application.rejected_at)}</span>
              </div>
            )}
            
            <div className='flex items-center gap-3'>
              <span className='text-gray-500'>Last Updated:</span>
              <span className='font-medium text-gray-900'>{formatDateTime(application.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Staff Notes (if any) */}
        {application.staff_notes && (
          <div className='rounded-lg bg-white p-6 shadow-sm'>
            <div className='mb-4 flex items-center gap-2 border-b border-gray-200 pb-3'>
              <span className='text-xl'>📝</span>
              <h2 className='text-lg font-semibold text-gray-900'>Staff Notes</h2>
            </div>
            <p className='text-sm text-gray-700'>{application.staff_notes}</p>
          </div>
        )}

        {/* Rejection Reason (if any) */}
        {application.rejection_reason && (
          <div className='rounded-lg bg-red-50 p-6 shadow-sm border border-red-200'>
            <div className='mb-4 flex items-center gap-2 border-b border-red-200 pb-3'>
              <span className='text-xl'>❌</span>
              <h2 className='text-lg font-semibold text-red-900'>Rejection Reason</h2>
            </div>
            <p className='text-sm text-red-700'>{application.rejection_reason}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex items-center justify-end gap-3'>
          <button
            onClick={() => router.push('/admin/applications')}
            className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
          >
            Back to Applications
          </button>
          
          <button
            className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
            onClick={() => {
              // TODO: Implement process action
              alert('Process functionality coming soon')
            }}
          >
            Process Application
          </button>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

