'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Link, useRouter } from '@/src/navigation'
import Button from '../components/Button'
import Select from '../components/Select'
import type { User, LoanApplication, ApplicationStatus, IdDocument, DocumentType, DocumentStatus } from '@/src/lib/supabase/types'
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
          drivers_license: t('Drivers_License') || 'Driver\'s License',
          passport: t('Passport') || 'Passport',
          health_card: t('Health_Card') || 'Health Card',
          social_insurance: t('Social_Insurance_Number') || 'Social Insurance Number',
          permanent_resident_card: t('Permanent_Resident_Card') || 'Permanent Resident Card',
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
      setData(prev => prev ? { ...prev, user: result.user } : null)
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
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    const statusLabels: Record<ApplicationStatus, string> = {
      pending: t('Status_Pending') || 'Pending',
      processing: t('Status_Processing') || 'Processing',
      approved: t('Status_Approved') || 'Approved',
      rejected: t('Status_Rejected') || 'Rejected',
      cancelled: t('Status_Cancelled') || 'Cancelled'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusClasses[status]}`}>
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
    
    if (!uploadForm.file || !uploadForm.document_type || !uploadForm.document_name) {
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
      
      alert(t('Document_Uploaded_Successfully') || 'Document uploaded successfully')
    } catch (err: any) {
      console.error('Error uploading document:', err)
      alert(err.message || 'Failed to upload document')
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    const confirmMessage = t('Confirm_Delete_Document') || 'Are you sure you want to delete this document?'
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`/api/client/id-documents?id=${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete document')
      }

      // Refresh documents list
      await fetchIdDocuments()
      alert(t('Document_Deleted_Successfully') || 'Document deleted successfully')
    } catch (err: any) {
      console.error('Error deleting document:', err)
      alert(err.message || 'Failed to delete document')
    }
  }

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels: Record<DocumentType, string> = {
      drivers_license: t('Drivers_License') || 'Driver\'s License',
      passport: t('Passport') || 'Passport',
      health_card: t('Health_Card') || 'Health Card',
      social_insurance: t('Social_Insurance_Number') || 'Social Insurance Number',
      permanent_resident_card: t('Permanent_Resident_Card') || 'Permanent Resident Card',
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
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusClasses[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-background py-8'>
        <div className='mx-auto max-w-4xl px-4 sm:px-6'>
          <div className='flex items-center justify-center py-20'>
            <div className='text-center'>
              <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent'></div>
              <p className='text-text-secondary'>{t('Loading') || 'Loading...'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-background py-8'>
        <div className='mx-auto max-w-4xl px-4 sm:px-6'>
          <div className='rounded-lg bg-red-50 border border-red-200 p-6 text-center'>
            <p className='text-red-800 font-semibold mb-2'>{t('Error_Loading_Dashboard') || 'Error Loading Dashboard'}</p>
            <p className='text-red-600 text-sm mb-4'>{error}</p>
            <Button onClick={fetchDashboardData} variant='primary' size='medium'>
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

  return (
    <div className='min-h-screen bg-background py-6 sm:py-8'>
      <div className='mx-auto max-w-4xl px-4 sm:px-6'>
        {/* Header */}
        <div className='mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-primary mb-2'>
              {t('My_Dashboard') || 'My Dashboard'}
            </h1>
            <p className='text-text-secondary text-sm sm:text-base'>
              {t('Dashboard_Subtitle') || 'View your profile and loan applications'}
            </p>
          </div>
          <div className='flex gap-3'>
            <Link href='/'>
              <Button variant='secondary' size='small'>
                {t('Back_To_Home') || '← Back to Home'}
              </Button>
            </Link>
            <Button
              variant='secondary'
              size='small'
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/')
                router.refresh()
              }}
            >
              {t('Sign_Out') || 'Sign Out'}
            </Button>
          </div>
        </div>

        {/* Personal Details Card */}
        <div className='mb-6 sm:mb-8 rounded-lg bg-background-secondary border border-gray-200 p-4 sm:p-6'>
          <div className='flex items-center justify-between mb-4 sm:mb-6'>
            <h2 className='text-xl sm:text-2xl font-bold text-primary'>
              {t('Personal_Details') || 'Personal Details'}
            </h2>
            {!editingProfile && (
              <Button
                variant='secondary'
                size='small'
                onClick={() => setEditingProfile(true)}
              >
                {t('Edit') || 'Edit'}
              </Button>
            )}
          </div>

          {editingProfile ? (
            <form onSubmit={handleUpdateProfile} className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('First_Name') || 'First Name'}
                  </label>
                  <input
                    type='text'
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('Last_Name') || 'Last Name'}
                  </label>
                  <input
                    type='text'
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                    required
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('Email_Address') || 'Email Address'}
                  </label>
                  <input
                    type='email'
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                    required
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('Phone_Number') || 'Phone Number'}
                  </label>
                  <input
                    type='tel'
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                    required
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('Date_of_Birth') || 'Date of Birth'}
                  </label>
                  <input
                    type='date'
                    value={profileForm.date_of_birth}
                    onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('Your_Language') || 'Preferred Language'}
                  </label>
                  <Select
                    value={profileForm.preferred_language}
                    onValueChange={(value) => setProfileForm({ ...profileForm, preferred_language: value })}
                    placeholder={t('Select_Language') || 'Select Language'}
                    options={[
                      { value: 'en', label: t('English') || 'English' },
                      { value: 'fr', label: t('French') || 'French' }
                    ]}
                    className='text-sm'
                  />
                </div>
              </div>

              <div className='flex flex-col sm:flex-row gap-3 pt-2'>
                <Button
                  type='submit'
                  variant='primary'
                  size='medium'
                  disabled={updating}
                >
                  {updating ? (t('Saving') || 'Saving...') : (t('Save_Changes') || 'Save Changes')}
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
                        preferred_language: data.user.preferred_language || 'en',
                        date_of_birth: data.user.date_of_birth || ''
                      })
                    }
                  }}
                  disabled={updating}
                >
                  {t('Cancel') || 'Cancel'}
                </Button>
              </div>
            </form>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
              <div>
                <p className='text-xs sm:text-sm text-text-secondary mb-1'>{t('First_Name') || 'First Name'}</p>
                <p className='text-sm sm:text-base font-medium text-primary'>
                  {data.user.first_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-xs sm:text-sm text-text-secondary mb-1'>{t('Last_Name') || 'Last Name'}</p>
                <p className='text-sm sm:text-base font-medium text-primary'>
                  {data.user.last_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-xs sm:text-sm text-text-secondary mb-1'>{t('Email_Address') || 'Email Address'}</p>
                <p className='text-sm sm:text-base font-medium text-primary'>
                  {data.user.email || 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-xs sm:text-sm text-text-secondary mb-1'>{t('Phone_Number') || 'Phone Number'}</p>
                <p className='text-sm sm:text-base font-medium text-primary'>
                  {data.user.phone || 'N/A'}
                </p>
              </div>
              <div>
                <p className='text-xs sm:text-sm text-text-secondary mb-1'>{t('Date_of_Birth') || 'Date of Birth'}</p>
                <p className='text-sm sm:text-base font-medium text-primary'>
                  {formatDate(data.user.date_of_birth)}
                </p>
              </div>
              <div>
                <p className='text-xs sm:text-sm text-text-secondary mb-1'>{t('Your_Language') || 'Preferred Language'}</p>
                <p className='text-sm sm:text-base font-medium text-primary'>
                  {data.user.preferred_language === 'fr' ? (t('French') || 'French') : (t('English') || 'English')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ID Documents Section */}
        <div className='mb-6 sm:mb-8 rounded-lg bg-background-secondary border border-gray-200 p-4 sm:p-6'>
          <div className='flex items-center justify-between mb-4 sm:mb-6'>
            <h2 className='text-xl sm:text-2xl font-bold text-primary'>
              {t('ID_Documents') || 'ID Documents'}
            </h2>
            {!showUploadForm && (
              <Button
                variant='primary'
                size='small'
                onClick={() => setShowUploadForm(true)}
              >
                {t('Upload_ID_Document') || 'Upload ID Document'}
              </Button>
            )}
          </div>

          {showUploadForm && (
            <form onSubmit={handleFileUpload} className='mb-6 space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-6'>
              <h3 className='text-lg font-semibold text-primary mb-4'>
                {t('Upload_New_Document') || 'Upload New Document'}
              </h3>
              
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('Document_Type') || 'Document Type'} <span className='text-red-500'>*</span>
                  </label>
                  <Select
                    value={uploadForm.document_type || ''}
                    onValueChange={(value) => setUploadForm({ ...uploadForm, document_type: value as DocumentType })}
                    placeholder={t('Select_Document_Type') || 'Select Document Type'}
                    options={[
                      { value: 'drivers_license', label: t('Drivers_License') || 'Driver\'s License' },
                      { value: 'passport', label: t('Passport') || 'Passport' },
                      { value: 'health_card', label: t('Health_Card') || 'Health Card' },
                      { value: 'social_insurance', label: t('Social_Insurance_Number') || 'Social Insurance Number' },
                      { value: 'permanent_resident_card', label: t('Permanent_Resident_Card') || 'Permanent Resident Card' },
                      { value: 'citizenship_card', label: t('Citizenship_Card') || 'Citizenship Card' },
                      { value: 'birth_certificate', label: t('Birth_Certificate') || 'Birth Certificate' },
                      { value: 'other', label: t('Other') || 'Other' }
                    ]}
                    className='text-sm'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('Document_Name') || 'Document Name'} <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={uploadForm.document_name}
                    onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })}
                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:cursor-not-allowed'
                    placeholder={uploadForm.document_type === 'other' ? (t('Enter_Document_Name') || 'e.g., Driver\'s License Front') : ''}
                    required
                    disabled={!!uploadForm.document_type && uploadForm.document_type !== 'other'}
                  />
                  {uploadForm.document_type && uploadForm.document_type !== 'other' && (
                    <p className='mt-1 text-xs text-text-secondary'>
                      {t('Document_Name_Auto_Filled') || 'Document name auto-filled based on type'}
                    </p>
                  )}
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('File')} <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='file'
                    accept='image/jpeg,image/jpg,image/png,image/webp,application/pdf'
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert(t('File_Size_Exceeds_10MB') || 'File size exceeds 10MB limit')
                          return
                        }
                        setUploadForm({ ...uploadForm, file })
                      }
                    }}
                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                    required
                  />
                  <p className='mt-1 text-xs text-text-secondary'>
                    {t('Allowed_Formats') || 'Allowed: JPEG, PNG, WebP, PDF. Max size: 10MB'}
                  </p>
                  {uploadForm.file && (
                    <p className='mt-1 text-xs text-primary'>
                      {t('Selected_File') || 'Selected'}: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-primary mb-1'>
                    {t('Expiration_Date') || 'Expiration Date'} ({t('Optional') || 'Optional'})
                  </label>
                  <input
                    type='date'
                    value={uploadForm.expires_at}
                    onChange={(e) => setUploadForm({ ...uploadForm, expires_at: e.target.value })}
                    className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  />
                </div>
              </div>

              <div className='flex flex-col sm:flex-row gap-3 pt-2'>
                <Button
                  type='submit'
                  variant='primary'
                  size='medium'
                  disabled={uploadingDocument}
                >
                  {uploadingDocument ? (t('Uploading') || 'Uploading...') : (t('Upload_Document') || 'Upload Document')}
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
                >
                  {t('Cancel') || 'Cancel'}
                </Button>
              </div>
            </form>
          )}

          {loadingDocuments ? (
            <div className='text-center py-8'>
              <div className='inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-2'></div>
              <p className='text-text-secondary text-sm'>{t('Loading_Documents') || 'Loading documents...'}</p>
            </div>
          ) : idDocuments.length === 0 ? (
            <div className='text-center py-8 sm:py-12'>
              <div className='mb-4 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
                  <svg className='h-8 w-8 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
              </div>
              <p className='text-sm sm:text-base font-medium text-text-secondary mb-2'>
                {t('No_Documents_Uploaded') || 'No documents uploaded yet'}
              </p>
              <p className='text-xs sm:text-sm text-text-secondary mb-6'>
                {t('Upload_ID_Documents_Message') || 'Upload your identification documents for verification'}
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='text-left py-3 px-4 text-sm font-semibold text-primary'>{t('Document_Type') || 'Document Type'}</th>
                    <th className='text-left py-3 px-4 text-sm font-semibold text-primary'>{t('Document_Name') || 'Document Name'}</th>
                    <th className='text-left py-3 px-4 text-sm font-semibold text-primary'>{t('File')}</th>
                    <th className='text-left py-3 px-4 text-sm font-semibold text-primary'>{t('Status') || 'Status'}</th>
                    <th className='text-left py-3 px-4 text-sm font-semibold text-primary'>{t('Uploaded_On') || 'Uploaded On'}</th>
                    <th className='text-center py-3 px-4 text-sm font-semibold text-primary'>{t('Actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {idDocuments.map((doc) => (
                    <tr key={doc.id} className='border-b border-gray-100 hover:bg-gray-50'>
                      <td className='py-3 px-4 text-sm text-primary'>
                        {getDocumentTypeLabel(doc.document_type)}
                      </td>
                      <td className='py-3 px-4 text-sm text-primary font-medium'>
                        {doc.document_name}
                      </td>
                      <td className='py-3 px-4 text-sm text-text-secondary'>
                        <div className='flex flex-col'>
                          <span className='text-xs'>{doc.file_name}</span>
                          <span className='text-xs text-text-secondary'>{formatFileSize(doc.file_size)}</span>
                        </div>
                      </td>
                      <td className='py-3 px-4'>
                        {getDocumentStatusBadge(doc.status)}
                      </td>
                      <td className='py-3 px-4 text-sm text-text-secondary'>
                        {formatDate(doc.created_at)}
                      </td>
                      <td className='py-3 px-4'>
                        <div className='flex items-center justify-center gap-2'>
                          {doc.signed_url && (
                            <a
                              href={doc.signed_url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-primary hover:text-secondary text-sm font-medium'
                            >
                              {t('View') || 'View'}
                            </a>
                          )}
                          {doc.status === 'pending' && (
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className='text-red-600 hover:text-red-800 text-sm font-medium'
                            >
                              {t('Delete') || 'Delete'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Loan Applications Section */}
        <div className='rounded-lg bg-background-secondary border border-gray-200 p-4 sm:p-6'>
          <div className='flex items-center justify-between mb-4 sm:mb-6'>
            <h2 className='text-xl sm:text-2xl font-bold text-primary'>
              {t('My_Loan_Applications') || 'My Loan Applications'}
            </h2>
            <Link href='/apply'>
              <Button variant='primary' size='small'>
                {t('Apply_Now') || 'Apply Now'}
              </Button>
            </Link>
          </div>

          {data.loanApplications.length === 0 ? (
            <div className='text-center py-8 sm:py-12'>
              <div className='mb-4 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
                  <svg className='h-8 w-8 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
              </div>
              <p className='text-sm sm:text-base font-medium text-text-secondary mb-2'>
                {t('No_Applications_Yet') || 'No applications yet'}
              </p>
              <p className='text-xs sm:text-sm text-text-secondary mb-6'>
                {t('Start_Application_Message') || 'Start a new application to get started'}
              </p>
              <Link href='/apply'>
                <Button variant='primary' size='medium'>
                  {t('Apply_Now') || 'Apply Now'}
                </Button>
              </Link>
            </div>
          ) : (
            <div className='space-y-4'>
              {data.loanApplications.map((application) => (
                <div
                  key={application.id}
                  className='rounded-lg border border-gray-200 bg-white p-4 sm:p-6 transition-shadow hover:shadow-md'
                >
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                    <div className='flex-1'>
                      <div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3'>
                        <h3 className='text-base sm:text-lg font-semibold text-primary'>
                          {formatCurrency(application.loan_amount)}
                        </h3>
                        {getStatusBadge(application.application_status)}
                      </div>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm'>
                        <div>
                          <span className='text-text-secondary'>{t('Loan_Type') || 'Loan Type'}: </span>
                          <span className='font-medium text-primary'>
                            {application.loan_type === 'with-documents' 
                              ? (t('Loan_With_Documents') || 'With Documents') 
                              : (t('Loan_Without_Documents') || 'Without Documents')}
                          </span>
                        </div>
                        <div>
                          <span className='text-text-secondary'>{t('Submitted_On') || 'Submitted On'}: </span>
                          <span className='font-medium text-primary'>
                            {formatDate(application.submitted_at || application.created_at)}
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
  )
}

