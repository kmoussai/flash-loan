'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Link, useRouter } from '@/src/navigation'
import Button from '../components/Button'
import Select from '../components/Select'
import type {
  User,
  LoanApplication,
  ApplicationStatus,
  IdDocument,
  DocumentType,
  DocumentStatus
} from '@/src/lib/supabase/types'
import { createClient } from '@/src/lib/supabase/client'

interface DashboardData {
  user: User
  loanApplications: LoanApplication[]
}

interface IdDocumentWithUrl extends IdDocument {
  signed_url: string | null
}

export default function ClientDashboardPage() {
  const t = useTranslations('')
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    preferred_language: 'en',
    date_of_birth: ''
  })
  const [idDocuments, setIdDocuments] = useState<IdDocumentWithUrl[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    document_type: '' as DocumentType | '',
    document_name: '',
    expires_at: '',
    file: null as File | null
  })

  const formatIncomeSource = (source?: string | null) => {
    if (!source) {
      return 'Not provided'
    }

    const labels: Record<string, string> = {
      employed: 'Employed',
      'employment-insurance': 'Employment Insurance',
      'self-employed': 'Self-Employed',
      'csst-saaq': 'CSST/SAAQ',
      'parental-insurance': 'Parental Insurance',
      'retirement-plan': 'Retirement Plan'
    }

    return labels[source] || source
  }

  useEffect(() => {
    fetchDashboardData()
    fetchIdDocuments()
  }, [])

  // Auto-fill document name based on document type (except for "other")
  useEffect(() => {
    if (uploadForm.document_type && uploadForm.document_type !== 'other') {
      // Helper function to get document type label
      const getDocumentTypeLabelForForm = (type: DocumentType): string => {
        const labels: Record<DocumentType, string> = {
          drivers_license: t('Drivers_License') || "Driver's License",
          passport: t('Passport') || 'Passport',
          health_card: t('Health_Card') || 'Health Card',
          social_insurance:
            t('Social_Insurance_Number') || 'Social Insurance Number',
          permanent_resident_card:
            t('Permanent_Resident_Card') || 'Permanent Resident Card',
          citizenship_card: t('Citizenship_Card') || 'Citizenship Card',
          birth_certificate: t('Birth_Certificate') || 'Birth Certificate',
          other: t('Other') || 'Other'
        }
        return labels[type] || type
      }

      const typeLabel = getDocumentTypeLabelForForm(uploadForm.document_type)
      setUploadForm(prev => ({
        ...prev,
        document_name: typeLabel
      }))
    } else if (uploadForm.document_type === 'other') {
      // Clear document name when switching to "other" to allow manual entry
      setUploadForm(prev => ({
        ...prev,
        document_name: ''
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadForm.document_type])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client/dashboard')

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to sign in based on locale
          const locale = window.location.pathname.split('/')[1] || 'en'
          window.location.href = `/${locale}/auth/signin`
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load dashboard')
      }

      const dashboardData = await response.json()
      setData(dashboardData)

      // Initialize form with user data
      if (dashboardData.user) {
        setProfileForm({
          first_name: dashboardData.user.first_name || '',
          last_name: dashboardData.user.last_name || '',
          email: dashboardData.user.email || '',
          phone: dashboardData.user.phone || '',
          preferred_language: dashboardData.user.preferred_language || 'en',
          date_of_birth: dashboardData.user.date_of_birth || ''
        })
      }

      setError(null)
    } catch (err: any) {
      console.error('Error fetching dashboard:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUpdating(true)

      const response = await fetch('/api/client/dashboard', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const result = await response.json()
      setData(prev => (prev ? { ...prev, user: result.user } : null))
      setEditingProfile(false)

      // Show success message (you can add a toast notification here)
      alert(t('Profile_Updated_Successfully') || 'Profile updated successfully')
    } catch (err: any) {
      console.error('Error updating profile:', err)
      alert(err.message || 'Failed to update profile')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: ApplicationStatus) => {
    const statusClasses: Record<ApplicationStatus, string> = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      pre_approved: 'bg-green-100 text-green-800 border-green-200',
      contract_pending: 'bg-purple-100 text-purple-800 border-purple-200',
      contract_signed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const statusLabels: Record<ApplicationStatus, string> = {
      pending: t('Status_Pending') || 'Pending',
      processing: t('Status_Processing') || 'Processing',
      pre_approved: t('Status_Pre_Approved') || 'Pre-Approved',
      contract_pending: t('Status_Contract_Pending') || 'Contract Pending',
      contract_signed: t('Status_Contract_Signed') || 'Contract Signed',
      approved: t('Status_Approved') || 'Approved',
      rejected: t('Status_Rejected') || 'Rejected',
      cancelled: t('Status_Cancelled') || 'Cancelled'
    }

    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}
      >
        {statusLabels[status]}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const fetchIdDocuments = async () => {
    try {
      setLoadingDocuments(true)
      const response = await fetch('/api/client/id-documents')

      if (!response.ok) {
        throw new Error('Failed to load documents')
      }

      const result = await response.json()
      setIdDocuments(result.documents || [])
    } catch (err: any) {
      console.error('Error fetching ID documents:', err)
    } finally {
      setLoadingDocuments(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !uploadForm.file ||
      !uploadForm.document_type ||
      !uploadForm.document_name
    ) {
      alert(t('Please_Fill_All_Fields') || 'Please fill all required fields')
      return
    }

    try {
      setUploadingDocument(true)

      const formData = new FormData()
      formData.append('file', uploadForm.file)
      formData.append('document_type', uploadForm.document_type)
      formData.append('document_name', uploadForm.document_name)
      if (uploadForm.expires_at) {
        formData.append('expires_at', uploadForm.expires_at)
      }

      const response = await fetch('/api/client/id-documents', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload document')
      }

      const result = await response.json()

      // Refresh documents list
      await fetchIdDocuments()

      // Reset form
      setUploadForm({
        document_type: '' as DocumentType | '',
        document_name: '',
        expires_at: '',
        file: null
      })
      setShowUploadForm(false)

      alert(
        t('Document_Uploaded_Successfully') || 'Document uploaded successfully'
      )
    } catch (err: any) {
      console.error('Error uploading document:', err)
      alert(err.message || 'Failed to upload document')
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    const confirmMessage =
      t('Confirm_Delete_Document') ||
      'Are you sure you want to delete this document?'
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(
        `/api/client/id-documents?id=${documentId}`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete document')
      }

      // Refresh documents list
      await fetchIdDocuments()
      alert(
        t('Document_Deleted_Successfully') || 'Document deleted successfully'
      )
    } catch (err: any) {
      console.error('Error deleting document:', err)
      alert(err.message || 'Failed to delete document')
    }
  }

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels: Record<DocumentType, string> = {
      drivers_license: t('Drivers_License') || "Driver's License",
      passport: t('Passport') || 'Passport',
      health_card: t('Health_Card') || 'Health Card',
      social_insurance:
        t('Social_Insurance_Number') || 'Social Insurance Number',
      permanent_resident_card:
        t('Permanent_Resident_Card') || 'Permanent Resident Card',
      citizenship_card: t('Citizenship_Card') || 'Citizenship Card',
      birth_certificate: t('Birth_Certificate') || 'Birth Certificate',
      other: t('Other') || 'Other'
    }
    return labels[type] || type
  }

  const getDocumentStatusBadge = (status: DocumentStatus) => {
    const statusClasses: Record<DocumentStatus, string> = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200'
    }

    const statusLabels: Record<DocumentStatus, string> = {
      pending: t('Status_Pending') || 'Pending',
      under_review: t('Status_Under_Review') || 'Under Review',
      approved: t('Status_Approved') || 'Approved',
      rejected: t('Status_Rejected') || 'Rejected',
      expired: t('Status_Expired') || 'Expired'
    }

    return (
      <span
        className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses[status]}`}
      >
        {statusLabels[status]}
      </span>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent'></div>
          <p className='text-lg font-medium text-text-secondary'>
            {t('Loading') || 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8'>
        <div className='mx-auto max-w-4xl'>
          <div className='rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center shadow-sm sm:p-8'>
            <div className='mb-4 flex justify-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
                <svg
                  className='h-8 w-8 text-red-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
            </div>
            <p className='mb-2 text-lg font-bold text-red-800'>
              {t('Error_Loading_Dashboard') || 'Error Loading Dashboard'}
            </p>
            <p className='mb-6 text-sm text-red-600'>{error}</p>
            <Button
              onClick={fetchDashboardData}
              variant='primary'
              size='medium'
              className='min-h-[44px]'
            >
              {t('Try_Again') || 'Try Again'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  // Calculate stats
  const totalApplications = data.loanApplications.length
  const pendingApplications = data.loanApplications.filter(app =>
    [
      'pending',
      'processing',
      'pre_approved',
      'contract_pending',
      'contract_signed'
    ].includes(app.application_status)
  ).length
  const approvedApplications = data.loanApplications.filter(
    app => app.application_status === 'approved'
  ).length

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 pb-8'>
      {/* Sticky Header */}
      <div className='sticky top-0 z-10 border-b border-gray-200 bg-white/80 shadow-sm backdrop-blur-md'>
        <div className='mx-auto max-w-4xl px-4 py-4 sm:px-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold text-primary sm:text-3xl'>
                {t('My_Dashboard') || 'My Dashboard'}
              </h1>
              <p className='mt-1 hidden text-sm text-text-secondary sm:block'>
                {t('Dashboard_Subtitle') ||
                  'View your profile and loan applications'}
              </p>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='secondary'
                size='small'
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                  router.refresh()
                }}
                className='min-h-[44px] px-4'
              >
                <svg
                  className='mr-1.5 h-5 w-5 sm:mr-0 sm:hidden'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                  />
                </svg>
                <span className='hidden sm:inline'>
                  {t('Sign_Out') || 'Sign Out'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-4xl px-4 pt-6 sm:px-6'>
        {/* Quick Stats */}
        <div className='mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4'>
          <div className='from-primary/10 to-primary/5 border-primary/20 rounded-xl border bg-gradient-to-br p-4 sm:p-5'>
            <div className='mb-2 flex items-center justify-between'>
              <div className='bg-primary/20 flex h-10 w-10 items-center justify-center rounded-lg'>
                <svg
                  className='h-6 w-6 text-primary'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
              </div>
            </div>
            <p className='text-2xl font-bold text-primary sm:text-3xl'>
              {totalApplications}
            </p>
            <p className='mt-1 text-xs text-text-secondary sm:text-sm'>
              {t('Total_Applications') || 'Total Applications'}
            </p>
          </div>
          <div className='rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 sm:p-5'>
            <div className='mb-2 flex items-center justify-between'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20'>
                <svg
                  className='h-6 w-6 text-blue-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
            </div>
            <p className='text-2xl font-bold text-blue-600 sm:text-3xl'>
              {pendingApplications}
            </p>
            <p className='mt-1 text-xs text-text-secondary sm:text-sm'>
              {t('In_Progress') || 'In Progress'}
            </p>
          </div>
          <div className='col-span-2 rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 sm:col-span-1 sm:p-5'>
            <div className='mb-2 flex items-center justify-between'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20'>
                <svg
                  className='h-6 w-6 text-green-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
            </div>
            <p className='text-2xl font-bold text-green-600 sm:text-3xl'>
              {approvedApplications}
            </p>
            <p className='mt-1 text-xs text-text-secondary sm:text-sm'>
              {t('Approved') || 'Approved'}
            </p>
          </div>
        </div>

        {/* Personal Details Card */}
        <div className='mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm'>
          <div className='from-primary/5 to-secondary/5 border-b border-gray-200 bg-gradient-to-r px-4 py-4 sm:px-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary/20 flex h-10 w-10 items-center justify-center rounded-lg'>
                  <svg
                    className='h-6 w-6 text-primary'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                    />
                  </svg>
                </div>
                <h2 className='text-lg font-bold text-primary sm:text-xl'>
                  {t('Personal_Details') || 'Personal Details'}
                </h2>
              </div>
              {!editingProfile && (
                <Button
                  variant='secondary'
                  size='small'
                  onClick={() => setEditingProfile(true)}
                  className='min-h-[44px] px-4'
                >
                  <svg
                    className='mr-2 h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                    />
                  </svg>
                  {t('Edit') || 'Edit'}
                </Button>
              )}
            </div>
          </div>
          <div className='p-4 sm:p-6'>
            {editingProfile ? (
              <form onSubmit={handleUpdateProfile} className='space-y-5'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('First_Name') || 'First Name'}
                    </label>
                    <input
                      type='text'
                      value={profileForm.first_name}
                      onChange={e =>
                        setProfileForm({
                          ...profileForm,
                          first_name: e.target.value
                        })
                      }
                      className='focus:ring-primary/20 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-primary focus:outline-none focus:ring-2'
                      required
                    />
                  </div>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('Last_Name') || 'Last Name'}
                    </label>
                    <input
                      type='text'
                      value={profileForm.last_name}
                      onChange={e =>
                        setProfileForm({
                          ...profileForm,
                          last_name: e.target.value
                        })
                      }
                      className='focus:ring-primary/20 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-primary focus:outline-none focus:ring-2'
                      required
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('Email_Address') || 'Email Address'}
                    </label>
                    <input
                      type='email'
                      value={profileForm.email}
                      onChange={e =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value
                        })
                      }
                      className='focus:ring-primary/20 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-primary focus:outline-none focus:ring-2'
                      required
                    />
                  </div>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('Phone_Number') || 'Phone Number'}
                    </label>
                    <input
                      type='tel'
                      value={profileForm.phone}
                      onChange={e =>
                        setProfileForm({
                          ...profileForm,
                          phone: e.target.value
                        })
                      }
                      className='focus:ring-primary/20 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-primary focus:outline-none focus:ring-2'
                      required
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('Date_of_Birth') || 'Date of Birth'}
                    </label>
                    <input
                      type='date'
                      value={profileForm.date_of_birth}
                      onChange={e =>
                        setProfileForm({
                          ...profileForm,
                          date_of_birth: e.target.value
                        })
                      }
                      className='focus:ring-primary/20 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-primary focus:outline-none focus:ring-2'
                    />
                  </div>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('Your_Language') || 'Preferred Language'}
                    </label>
                    <Select
                      value={profileForm.preferred_language}
                      onValueChange={value =>
                        setProfileForm({
                          ...profileForm,
                          preferred_language: value
                        })
                      }
                      placeholder={t('Select_Language') || 'Select Language'}
                      options={[
                        { value: 'en', label: t('English') || 'English' },
                        { value: 'fr', label: t('French') || 'French' }
                      ]}
                      className='text-base'
                    />
                  </div>
                </div>

                <div className='flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row'>
                  <Button
                    type='submit'
                    variant='primary'
                    size='medium'
                    disabled={updating}
                    className='min-h-[48px] flex-1 sm:flex-none'
                  >
                    {updating
                      ? t('Saving') || 'Saving...'
                      : t('Save_Changes') || 'Save Changes'}
                  </Button>
                  <Button
                    type='button'
                    variant='secondary'
                    size='medium'
                    onClick={() => {
                      setEditingProfile(false)
                      // Reset form to original data
                      if (data.user) {
                        setProfileForm({
                          first_name: data.user.first_name || '',
                          last_name: data.user.last_name || '',
                          email: data.user.email || '',
                          phone: data.user.phone || '',
                          preferred_language:
                            data.user.preferred_language || 'en',
                          date_of_birth: data.user.date_of_birth || ''
                        })
                      }
                    }}
                    disabled={updating}
                    className='min-h-[48px] flex-1 sm:flex-none'
                  >
                    {t('Cancel') || 'Cancel'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div className='rounded-xl border border-gray-100 bg-gray-50 p-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                      {t('First_Name') || 'First Name'}
                    </p>
                    <p className='text-base font-semibold text-primary sm:text-lg'>
                      {data.user.first_name || 'N/A'}
                    </p>
                  </div>
                  <div className='rounded-xl border border-gray-100 bg-gray-50 p-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                      {t('Last_Name') || 'Last Name'}
                    </p>
                    <p className='text-base font-semibold text-primary sm:text-lg'>
                      {data.user.last_name || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div className='rounded-xl border border-gray-100 bg-gray-50 p-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                      {t('Email_Address') || 'Email Address'}
                    </p>
                    <p className='break-all text-base font-semibold text-primary sm:text-lg'>
                      {data.user.email || 'N/A'}
                    </p>
                  </div>
                  <div className='rounded-xl border border-gray-100 bg-gray-50 p-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                      {t('Phone_Number') || 'Phone Number'}
                    </p>
                    <p className='text-base font-semibold text-primary sm:text-lg'>
                      {data.user.phone || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div className='rounded-xl border border-gray-100 bg-gray-50 p-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                      {t('Date_of_Birth') || 'Date of Birth'}
                    </p>
                    <p className='text-base font-semibold text-primary sm:text-lg'>
                      {formatDate(data.user.date_of_birth)}
                    </p>
                  </div>
                  <div className='rounded-xl border border-gray-100 bg-gray-50 p-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary'>
                      {t('Your_Language') || 'Preferred Language'}
                    </p>
                    <p className='text-base font-semibold text-primary sm:text-lg'>
                      {data.user.preferred_language === 'fr'
                        ? t('French') || 'French'
                        : t('English') || 'English'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ID Documents Section */}
        <div className='mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm'>
          <div className='from-primary/5 to-secondary/5 border-b border-gray-200 bg-gradient-to-r px-4 py-4 sm:px-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary/20 flex h-10 w-10 items-center justify-center rounded-lg'>
                  <svg
                    className='h-6 w-6 text-primary'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    />
                  </svg>
                </div>
                <h2 className='text-lg font-bold text-primary sm:text-xl'>
                  {t('ID_Documents') || 'ID Documents'}
                </h2>
              </div>
              {!showUploadForm && (
                <Button
                  variant='primary'
                  size='small'
                  onClick={() => setShowUploadForm(true)}
                  className='min-h-[44px] px-4'
                >
                  <svg
                    className='mr-2 h-5 w-5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                    />
                  </svg>
                  <span className='hidden sm:inline'>
                    {t('Upload_ID_Document') || 'Upload ID Document'}
                  </span>
                  <span className='sm:hidden'>{t('Upload') || 'Upload'}</span>
                </Button>
              )}
            </div>
          </div>
          <div className='p-4 sm:p-6'>
            {showUploadForm && (
              <form
                onSubmit={handleFileUpload}
                className='mb-6 space-y-5 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 sm:p-6'
              >
                <h3 className='mb-2 text-base font-semibold text-primary sm:text-lg'>
                  {t('Upload_New_Document') || 'Upload New Document'}
                </h3>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('Document_Type') || 'Document Type'}{' '}
                      <span className='text-red-500'>*</span>
                    </label>
                    <Select
                      value={uploadForm.document_type || ''}
                      onValueChange={value =>
                        setUploadForm({
                          ...uploadForm,
                          document_type: value as DocumentType
                        })
                      }
                      placeholder={
                        t('Select_Document_Type') || 'Select Document Type'
                      }
                      options={[
                        {
                          value: 'drivers_license',
                          label: t('Drivers_License') || "Driver's License"
                        },
                        {
                          value: 'passport',
                          label: t('Passport') || 'Passport'
                        },
                        {
                          value: 'health_card',
                          label: t('Health_Card') || 'Health Card'
                        },
                        {
                          value: 'social_insurance',
                          label:
                            t('Social_Insurance_Number') ||
                            'Social Insurance Number'
                        },
                        {
                          value: 'permanent_resident_card',
                          label:
                            t('Permanent_Resident_Card') ||
                            'Permanent Resident Card'
                        },
                        {
                          value: 'citizenship_card',
                          label: t('Citizenship_Card') || 'Citizenship Card'
                        },
                        {
                          value: 'birth_certificate',
                          label: t('Birth_Certificate') || 'Birth Certificate'
                        },
                        { value: 'other', label: t('Other') || 'Other' }
                      ]}
                      className='text-base'
                    />
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('Document_Name') || 'Document Name'}{' '}
                      <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='text'
                      value={uploadForm.document_name}
                      onChange={e =>
                        setUploadForm({
                          ...uploadForm,
                          document_name: e.target.value
                        })
                      }
                      className='focus:ring-primary/20 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-primary focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100'
                      placeholder={
                        uploadForm.document_type === 'other'
                          ? t('Enter_Document_Name') ||
                            "e.g., Driver's License Front"
                          : ''
                      }
                      required
                      disabled={
                        !!uploadForm.document_type &&
                        uploadForm.document_type !== 'other'
                      }
                    />
                    {uploadForm.document_type &&
                      uploadForm.document_type !== 'other' && (
                        <p className='mt-2 text-xs text-text-secondary'>
                          {t('Document_Name_Auto_Filled') ||
                            'Document name auto-filled based on type'}
                        </p>
                      )}
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('File') || 'File'}{' '}
                      <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='file'
                      accept='image/jpeg,image/jpg,image/png,image/webp,application/pdf'
                      onChange={e => {
                        const file = e.target.files?.[0] || null
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert(
                              t('File_Size_Exceeds_10MB') ||
                                'File size exceeds 10MB limit'
                            )
                            return
                          }
                          setUploadForm({ ...uploadForm, file })
                        }
                      }}
                      className='focus:ring-primary/20 file:bg-primary/10 hover:file:bg-primary/20 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all file:mr-4 file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary focus:border-primary focus:outline-none focus:ring-2'
                      required
                    />
                    <p className='mt-2 text-xs text-text-secondary'>
                      {t('Allowed_Formats') ||
                        'Allowed: JPEG, PNG, WebP, PDF. Max size: 10MB'}
                    </p>
                    {uploadForm.file && (
                      <p className='mt-2 flex items-center gap-2 text-xs font-medium text-primary'>
                        <svg
                          className='h-4 w-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                        {uploadForm.file.name} (
                        {formatFileSize(uploadForm.file.size)})
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-semibold text-primary'>
                      {t('Expiration_Date') || 'Expiration Date'}{' '}
                      <span className='text-xs text-gray-400'>
                        ({t('Optional') || 'Optional'})
                      </span>
                    </label>
                    <input
                      type='date'
                      value={uploadForm.expires_at}
                      onChange={e =>
                        setUploadForm({
                          ...uploadForm,
                          expires_at: e.target.value
                        })
                      }
                      className='focus:ring-primary/20 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-primary focus:outline-none focus:ring-2'
                    />
                  </div>
                </div>

                <div className='flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row'>
                  <Button
                    type='submit'
                    variant='primary'
                    size='medium'
                    disabled={uploadingDocument}
                    className='min-h-[48px] flex-1 sm:flex-none'
                  >
                    {uploadingDocument
                      ? t('Uploading') || 'Uploading...'
                      : t('Upload_Document') || 'Upload Document'}
                  </Button>
                  <Button
                    type='button'
                    variant='secondary'
                    size='medium'
                    onClick={() => {
                      setShowUploadForm(false)
                      setUploadForm({
                        document_type: '' as DocumentType | '',
                        document_name: '',
                        expires_at: '',
                        file: null
                      })
                    }}
                    disabled={uploadingDocument}
                    className='min-h-[48px] flex-1 sm:flex-none'
                  >
                    {t('Cancel') || 'Cancel'}
                  </Button>
                </div>
              </form>
            )}

            {loadingDocuments ? (
              <div className='py-12 text-center'>
                <div className='mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent'></div>
                <p className='text-sm font-medium text-text-secondary'>
                  {t('Loading_Documents') || 'Loading documents...'}
                </p>
              </div>
            ) : idDocuments.length === 0 ? (
              <div className='py-12 text-center'>
                <div className='mb-4 flex justify-center'>
                  <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200'>
                    <svg
                      className='h-10 w-10 text-gray-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                      />
                    </svg>
                  </div>
                </div>
                <p className='mb-2 text-base font-semibold text-text-secondary'>
                  {t('No_Documents_Uploaded') || 'No documents uploaded yet'}
                </p>
                <p className='mx-auto mb-6 max-w-md text-sm text-text-secondary'>
                  {t('Upload_ID_Documents_Message') ||
                    'Upload your identification documents for verification'}
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {idDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className='hover:border-primary/50 rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-all'
                  >
                    <div className='mb-3 flex items-start justify-between gap-4'>
                      <div className='min-w-0 flex-1'>
                        <div className='mb-2 flex items-center gap-2'>
                          <h3 className='truncate text-base font-semibold text-primary'>
                            {getDocumentTypeLabel(doc.document_type)}
                          </h3>
                          {getDocumentStatusBadge(doc.status)}
                        </div>
                        <p className='mb-1 text-sm font-medium text-gray-700'>
                          {doc.document_name}
                        </p>
                        <div className='flex items-center gap-2 text-xs text-text-secondary'>
                          <svg
                            className='h-4 w-4'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                            />
                          </svg>
                          <span className='truncate'>{doc.file_name}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                        </div>
                        <p className='mt-2 text-xs text-text-secondary'>
                          {t('Uploaded_On') || 'Uploaded On'}:{' '}
                          {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className='flex gap-2 border-t border-gray-100 pt-3'>
                      {doc.signed_url && (
                        <a
                          href={doc.signed_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='bg-primary/10 hover:bg-primary/20 flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-primary transition-colors'
                        >
                          <svg
                            className='h-5 w-5'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                            />
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                            />
                          </svg>
                          {t('View') || 'View'}
                        </a>
                      )}
                      {doc.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className='flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-red-50 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100'
                        >
                          <svg
                            className='h-5 w-5'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                            />
                          </svg>
                          {t('Delete') || 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loan Applications Section */}
          <div className='overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm'>
            <div className='from-primary/5 to-secondary/5 border-b border-gray-200 bg-gradient-to-r px-4 py-4 sm:px-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='bg-primary/20 flex h-10 w-10 items-center justify-center rounded-lg'>
                    <svg
                      className='h-6 w-6 text-primary'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                  </div>
                  <h2 className='text-lg font-bold text-primary sm:text-xl'>
                    {t('My_Loan_Applications') || 'My Loan Applications'}
                  </h2>
                </div>
                <Link href='/apply'>
                  <Button
                    variant='primary'
                    size='small'
                    className='min-h-[44px] px-4'
                  >
                    <svg
                      className='mr-2 h-5 w-5'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 4v16m8-8H4'
                      />
                    </svg>
                    <span className='hidden sm:inline'>
                      {t('Apply_Now') || 'Apply Now'}
                    </span>
                    <span className='sm:hidden'>{t('Apply') || 'Apply'}</span>
                  </Button>
                </Link>
              </div>
            </div>
            <div className='p-4 sm:p-6'>
              {data.loanApplications.length === 0 ? (
                <div className='py-12 text-center'>
                  <div className='mb-4 flex justify-center'>
                    <div className='from-primary/10 to-secondary/10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br'>
                      <svg
                        className='h-10 w-10 text-primary'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                    </div>
                  </div>
                  <p className='mb-2 text-base font-semibold text-text-secondary'>
                    {t('No_Applications_Yet') || 'No applications yet'}
                  </p>
                  <p className='mx-auto mb-6 max-w-md text-sm text-text-secondary'>
                    {t('Start_Application_Message') ||
                      'Start a new application to get started'}
                  </p>
                  <Link href='/apply'>
                    <Button
                      variant='primary'
                      size='medium'
                      className='min-h-[48px] px-8'
                    >
                      {t('Apply_Now') || 'Apply Now'}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className='space-y-3'>
                  {data.loanApplications.map(application => (
                    <div
                      key={application.id}
                      className='hover:border-primary/50 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 transition-all hover:shadow-md'
                    >
                      <div className='mb-4 flex items-start justify-between gap-4'>
                        <div className='flex-1'>
                          <div className='mb-3 flex flex-col gap-3 sm:flex-row sm:items-center'>
                            <h3 className='text-2xl font-bold text-primary sm:text-3xl'>
                              {formatCurrency(application.loan_amount)}
                            </h3>
                            {getStatusBadge(application.application_status)}
                          </div>
                          <div className='space-y-2'>
                            <div className='flex items-center gap-2 text-sm'>
                              <svg
                                className='h-4 w-4 text-text-secondary'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                />
                              </svg>
                              <span className='text-text-secondary'>
                                {t('Income_Source') || 'Income Source'}:{' '}
                              </span>
                              <span className='font-semibold text-primary'>
                                {formatIncomeSource(application.income_source)}
                              </span>
                            </div>
                            <div className='flex items-center gap-2 text-sm'>
                              <svg
                                className='h-4 w-4 text-text-secondary'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                                />
                              </svg>
                              <span className='text-text-secondary'>
                                {t('Submitted_On') || 'Submitted On'}:{' '}
                              </span>
                              <span className='font-semibold text-primary'>
                                {formatDate(
                                  application.submitted_at ||
                                    application.created_at
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
