'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import DetailPageLayout from '../../components/DetailPageLayout'
import type { ApplicationStatus } from '@/src/lib/supabase/types'
import OverviewTab from './components/OverviewTab'
import PaymentsTab from './components/PaymentsTab'
import ScheduleTab from './components/ScheduleTab'
import BorrowerTab from './components/BorrowerTab'
import type { LoanTab, LoanDetail, LoanDetailsResponse } from './types'
import { transformLoanDetails, mapStatusToUI, formatLoanNumber } from './utils'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'

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
    <>
    <DetailPageLayout
      header={{
        backHref: '/admin/loan',
        backTitle: 'Back to Loans',
        title: 'Loan Details',
        subtitle: loan.loan_number,
        status: loan.status,
        statusVariant: 'default',
        size: 'sm'
      }}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId: string) => handleTabChange(tabId as LoanTab)}
      tabVariant='modern'
      tabSize='sm'
      contentMaxWidth='7xl'
    >
            {activeTab === 'overview' && (
              <OverviewTab
                loanId={loanId}
                loan={loan}
                applicationId={applicationId}
                applicationStatus={applicationStatus}
                onLoanUpdate={async () => {
                  // Refresh loan data in the page
                  const response = await fetch(`/api/admin/loans/${loanId}`)
                  if (response.ok) {
                    const data: LoanDetailsResponse = await response.json()
                    setApplicationId(data.loan.application_id)
                    setApplicationStatus(
                      (data.loan.loan_applications?.application_status as ApplicationStatus) || null
                    )
                    const transformedLoan = transformLoanDetails(data)
                    setLoan(transformedLoan)
                  }
                }}
              />
            )}
            {activeTab === 'payments' && <PaymentsTab loanId={loanId} />}
            {activeTab === 'schedule' && <ScheduleTab loanId={loanId} />}
            {activeTab === 'borrower' && <BorrowerTab loanId={loanId} />}
    </DetailPageLayout>
    </>
  )
}
