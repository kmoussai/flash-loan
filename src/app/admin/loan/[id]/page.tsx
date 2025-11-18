'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import Button from '@/src/app/[locale]/components/Button'
import type { ApplicationStatus, LoanContract } from '@/src/lib/supabase/types'
import OverviewTab from './components/OverviewTab'
import PaymentsTab from './components/PaymentsTab'
import ScheduleTab from './components/ScheduleTab'
import BorrowerTab from './components/BorrowerTab'
import type { LoanTab, LoanDetail, LoanDetailsResponse } from './types'
import { transformLoanDetails, mapStatusToUI, formatLoanNumber } from './utils'

export default function LoanDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const loanId = params.id as string

  // Get active tab from search params, default to 'overview'
  const activeTab = (searchParams.get('tab') as LoanTab) || 'overview'

  const [loan, setLoan] = useState<LoanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [preApproveAmount, setPreApproveAmount] = useState<number | ''>('')
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // Fetch basic loan data (always needed for header)
  useEffect(() => {
    if (!loanId) return

    const fetchLoanDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/loans/${loanId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch loan details')
        }

        const data: LoanDetailsResponse = await response.json()
        setApplicationId(data.loan.application_id)
        setApplicationStatus(
          (data.loan.loan_applications?.application_status as ApplicationStatus) || null
        )
        const transformedLoan = transformLoanDetails(data)
        setLoan(transformedLoan)
      } catch (e: any) {
        console.error('Error fetching loan details:', e)
        setError(e.message || 'Failed to load loan details')
      } finally {
        setLoading(false)
      }
    }

    fetchLoanDetails()
  }, [loanId])

  const handleTabChange = (tab: LoanTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/admin/loan/${loanId}?${params.toString()}`)
  }

  const handleApprove = async () => {
    if (!applicationId) return

    setProcessing(true)
    try {
      const payload: { loanAmount?: number } = {}
      const numericAmount =
        typeof preApproveAmount === 'string' ? Number(preApproveAmount) : preApproveAmount
      if (Number.isFinite(numericAmount) && numericAmount! > 0) {
        payload.loanAmount = Math.round((numericAmount as number) * 100) / 100
      }
      const response = await fetch(`/api/admin/applications/${applicationId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve application')
      }

      const data = await response.json()
      setProcessing(false)
      setShowApproveModal(false)
      alert('Application pre-approved and pending loan created.')

      // Refresh loan details to show updated status
      window.location.reload()
    } catch (err: any) {
      console.error('Error approving application:', err)
      setProcessing(false)
      alert(`Error: ${err.message || 'Failed to approve application'}`)
    }
  }

  const handleReject = async () => {
    if (!applicationId) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: rejectReason })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject application')
      }

      setProcessing(false)
      setShowRejectModal(false)
      alert('Application rejected.')
      router.push('/admin/loan')
    } catch (err: any) {
      console.error('Error rejecting application:', err)
      setProcessing(false)
      alert(`Error: ${err.message || 'Failed to reject application'}`)
    }
  }

  const statusBadge = useMemo(() => {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold '
    switch (loan?.status) {
      case 'active':
        return base + 'bg-blue-100 text-blue-800'
      case 'paid':
        return base + 'bg-green-100 text-green-800'
      case 'defaulted':
        return base + 'bg-red-100 text-red-800'
      case 'pending':
        return base + 'bg-yellow-100 text-yellow-800'
      default:
        return base + 'bg-gray-100 text-gray-800'
    }
  }, [loan?.status])

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className='flex h-96 items-center justify-center'>
          <div className='text-center'>
            <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900'></div>
            <p className='mt-4 text-sm text-gray-600'>Loading loan details...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  if (error || !loan) {
    return (
      <AdminDashboardLayout>
        <div className='flex h-96 items-center justify-center'>
          <div className='text-center'>
            <p className='text-gray-600'>{error || 'Loan not found'}</p>
            <button
              onClick={() => router.push('/admin/loan')}
              className='mt-4 rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'
            >
              Back to Loans
            </button>
          </div>
        </div>
      </AdminDashboardLayout>
    )
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'payments' as const, label: 'Payments', icon: '💳' },
    { id: 'schedule' as const, label: 'Schedule', icon: '📆' },
    { id: 'borrower' as const, label: 'Borrower', icon: '👤' }
  ]

  return (
    <AdminDashboardLayout>
      <div className='flex h-[calc(100vh-80px)] flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => router.push('/admin/loan')}
              className='flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700'
              title='Back to Loans'
            >
              <svg
                className='h-3.5 w-3.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
            </button>
            <div className='flex items-center gap-2'>
              <h1 className='text-base font-medium text-gray-700'>Loan Details</h1>
              <span className='text-xs text-gray-400'>•</span>
              <span className='font-mono text-xs text-gray-500'>{loan.loan_number}</span>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <span className={statusBadge}>{loan.status.toUpperCase()}</span>
          </div>
        </div>

        {/* Pre-Approve and Reject Actions */}
        {applicationId &&
          applicationStatus &&
          applicationStatus !== 'pre_approved' &&
          applicationStatus !== 'rejected' && (
            <div className='border-b border-gray-200 bg-white px-6 py-4'>
              <div className='flex items-center justify-center gap-4'>
                <Button
                  onClick={() => {
                    setPreApproveAmount(loan.principal)
                    setShowApproveModal(true)
                  }}
                  disabled={processing}
                  className='rounded-lg border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50'
                >
                  Pre-Approve Application
                </Button>
                <Button
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                  className='rounded-lg border border-red-300 bg-white px-6 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50'
                >
                  Reject Application
                </Button>
              </div>
            </div>
          )}

        {/* Tabs */}
        <div className='border-b border-gray-200 bg-white px-6'>
          <div className='flex items-center gap-1'>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <span className='absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600'></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto bg-gray-50'>
          <div className='mx-auto max-w-7xl px-6 py-6'>
            {activeTab === 'overview' && (
              <OverviewTab
                loanId={loanId}
                loan={loan}
                applicationId={applicationId}
                applicationStatus={applicationStatus}
              />
            )}
            {activeTab === 'payments' && <PaymentsTab loanId={loanId} />}
            {activeTab === 'schedule' && <ScheduleTab loanId={loanId} />}
            {activeTab === 'borrower' && <BorrowerTab loanId={loanId} />}
          </div>
        </div>
      </div>

      {/* Pre-Approve Modal */}
      {showApproveModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6'>
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900'>Pre-Approve Application</h3>
              <p className='mt-2 text-sm text-gray-600'>
                Set the pre-approved amount. A pending loan will be created.
              </p>
              <div className='mt-4'>
                <label className='mb-1 block text-xs font-medium text-gray-700'>
                  Amount (CAD)
                </label>
                <input
                  type='number'
                  min={1}
                  step='0.01'
                  value={preApproveAmount === '' ? '' : preApproveAmount}
                  onChange={e => {
                    const v = e.target.value
                    setPreApproveAmount(v === '' ? '' : Number(v))
                  }}
                  className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
                />
                <p className='mt-1 text-[10px] text-gray-500'>
                  Defaults to loan principal amount:{' '}
                  {loan ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(loan.principal) : '-'}
                </p>
              </div>
            </div>
            <div className='flex gap-3'>
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={processing}
                className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className='flex-1 rounded border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50'
              >
                {processing ? 'Processing...' : 'Confirm Pre-Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6'>
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900'>Reject Application</h3>
              <p className='mt-2 text-sm text-gray-600'>Please provide a reason for rejection:</p>
              <div className='mt-4'>
                <label className='mb-1 block text-xs font-medium text-gray-700'>Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={4}
                  className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'
                  placeholder='Enter rejection reason...'
                />
              </div>
            </div>
            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                disabled={processing}
                className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className='flex-1 rounded border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50'
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  )
}
