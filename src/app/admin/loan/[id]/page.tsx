'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import Button from '@/src/app/[locale]/components/Button'
import type {
  Frequency,
  PaymentFrequency,
  ApplicationStatus,
  LoanContract
} from '@/src/lib/supabase/types'
import GenerateContractModal from '../../applications/[id]/components/GenerateContractModal'
import ContractViewer from '../../components/ContractViewer'
import { BankAccount, GenerateContractPayload } from '@/src/app/types/contract'

type LoanStatusDB =
  | 'pending_disbursement'
  | 'active'
  | 'completed'
  | 'defaulted'
  | 'cancelled'
type LoanStatusUI = 'active' | 'paid' | 'defaulted' | 'pending' | 'cancelled'

interface Payment {
  id: string
  due_date: string
  amount_due: number
  amount_paid: number
  status: 'upcoming' | 'paid' | 'late'
}

interface LoanDetail {
  id: string
  loan_number: string
  borrower: {
    id: string
    name: string
    email: string
    phone: string
    province: string
  }
  principal: number
  remaining_balance: number
  interest_rate: number
  term_months: number
  payment_frequency: Frequency
  payment_amount: number
  origination_date: string
  status: LoanStatusUI
  next_payment_date: string | null
  last_payment_date: string | null
  schedule: Payment[]
}

// API Response interfaces
interface LoanFromAPI {
  id: string
  loan_number?: number
  application_id: string
  user_id: string
  principal_amount: number
  interest_rate: number
  term_months: number
  disbursement_date: string | null
  due_date: string | null
  remaining_balance: number
  status: LoanStatusDB
  created_at: string
  updated_at: string
  loan_applications: {
    id: string
    loan_amount: number
    application_status: string
    income_source?: string
    created_at?: string
    submitted_at?: string | null
    approved_at?: string | null
  } | null
  users?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    preferred_language: string | null
  } | null
}

interface PaymentFromAPI {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  method: string | null
  status: 'pending' | 'confirmed' | 'failed'
  created_at: string
}

interface LoanDetailsResponse {
  loan: LoanFromAPI
  payments: PaymentFromAPI[]
  statistics: {
    totalPaid: number
    totalPending: number
    totalFailed: number
    totalPayments: number
    confirmedPayments: number
    remainingBalance: number
    principalAmount: number
  }
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(
    n
  )
const formatDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'N/A'
const formatDateTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A'

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

// Map database status to UI status
const mapStatusToUI = (status: LoanStatusDB): LoanStatusUI => {
  switch (status) {
    case 'pending_disbursement':
      return 'pending'
    case 'completed':
      return 'paid'
    default:
      return status as LoanStatusUI
  }
}

// Transform API response to UI format
const transformLoanDetails = (apiData: LoanDetailsResponse): LoanDetail => {
  const loan = apiData.loan
  const firstName = loan.users?.first_name || ''
  const lastName = loan.users?.last_name || ''
  const borrowerName = `${firstName} ${lastName}`.trim() || 'N/A'

  // Calculate payment amount (simple estimate: principal + interest / term_months)
  const monthlyInterest =
    (loan.principal_amount * loan.interest_rate) / 100 / 12
  const monthlyPayment =
    loan.principal_amount / loan.term_months + monthlyInterest

  // Transform payments to schedule format
  const schedule: Payment[] = apiData.payments.map((p: PaymentFromAPI) => {
    const dueDate = new Date(p.payment_date)
    const isPaid = p.status === 'confirmed'
    const isLate = p.status === 'pending' && dueDate < new Date()

    return {
      id: p.id,
      due_date: p.payment_date,
      amount_due: monthlyPayment, // Using estimated payment amount
      amount_paid: isPaid ? parseFloat(p.amount.toString()) : 0,
      status: isPaid ? 'paid' : isLate ? 'late' : 'upcoming'
    }
  })

  // Find next and last payment dates
  const confirmedPayments = apiData.payments.filter(
    p => p.status === 'confirmed'
  )
  const lastPayment =
    confirmedPayments.length > 0
      ? confirmedPayments.sort(
          (a, b) =>
            new Date(b.payment_date).getTime() -
            new Date(a.payment_date).getTime()
        )[0]
      : null

  const pendingPayments = apiData.payments.filter(p => p.status === 'pending')
  const nextPayment =
    pendingPayments.length > 0
      ? pendingPayments.sort(
          (a, b) =>
            new Date(a.payment_date).getTime() -
            new Date(b.payment_date).getTime()
        )[0]
      : null

  return {
    id: loan.id,
    loan_number:
      loan.loan_number !== undefined && loan.loan_number !== null
        ? `LN-${String(loan.loan_number).padStart(6, '0')}`
        : `LN-${loan.id
            .replace(/[^0-9]/g, '')
            .padStart(6, '0')
            .slice(0, 6)}`,
    borrower: {
      id: loan.users?.id || loan.user_id,
      name: borrowerName,
      email: loan.users?.email || 'N/A',
      phone: loan.users?.phone || 'N/A',
      province: 'N/A' // Not available in API response
    },
    principal: parseFloat(loan.principal_amount.toString()),
    remaining_balance: parseFloat(loan.remaining_balance.toString()),
    interest_rate: parseFloat(loan.interest_rate.toString()),
    term_months: loan.term_months,
    payment_frequency: 'monthly' as Frequency, // Default, could be enhanced to use actual frequency
    payment_amount: Math.round(monthlyPayment * 100) / 100,
    origination_date: loan.created_at,
    status: mapStatusToUI(loan.status),
    next_payment_date: nextPayment?.payment_date || loan.due_date || null,
    last_payment_date: lastPayment?.payment_date || null,
    schedule
  }
}

export default function LoanDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const loanId = params.id as string

  const [loan, setLoan] = useState<LoanDetail | null>(null)
  const [statistics, setStatistics] = useState<
    LoanDetailsResponse['statistics'] | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'payments' | 'schedule' | 'borrower'
  >('overview')
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [applicationStatus, setApplicationStatus] =
    useState<ApplicationStatus | null>(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [loadingContract, setLoadingContract] = useState(false)
  const [showContractViewer, setShowContractViewer] = useState(false)
  const [contract, setContract] = useState<LoanContract | null>(null)
  const [hasContract, setHasContract] = useState<boolean>(false)
  const [contractStatus, setContractStatus] = useState<string | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [preApproveAmount, setPreApproveAmount] = useState<number | ''>('')
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

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
          (data.loan.loan_applications
            ?.application_status as ApplicationStatus) || null
        )
        const transformedLoan = transformLoanDetails(data)
        setLoan(transformedLoan)
        setStatistics(data.statistics)
      } catch (e: any) {
        console.error('Error fetching loan details:', e)
        setError(e.message || 'Failed to load loan details')
      } finally {
        setLoading(false)
      }
    }

    fetchLoanDetails()
  }, [loanId])

  useEffect(() => {
    if (!applicationId) return
    let isCancelled = false
    const checkContract = async () => {
      try {
        const response = await fetch(
          `/api/admin/applications/${applicationId}/contract`
        )
        if (isCancelled) return
        if (response.ok) {
          const data = await response.json()
          setHasContract(true)
          setContractStatus(data?.contract?.contract_status ?? null)
          setContract(data?.contract ?? null)
        } else if (response.status === 404) {
          setHasContract(false)
          setContractStatus(null)
        } else {
          setHasContract(false)
          setContractStatus(null)
        }
      } catch {
        if (!isCancelled) {
          setHasContract(false)
          setContractStatus(null)
        }
      }
    }
    checkContract()
    return () => {
      isCancelled = true
    }
  }, [applicationId])

  const handleViewContract = async () => {
    if (!applicationId) return
    setLoadingContract(true)
    try {
      const response = await fetch(
        `/api/admin/applications/${applicationId}/contract`
      )
      if (!response.ok) {
        if (response.status === 404) {
          setContract(null)
          setShowContractViewer(true)
          return
        }
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch contract')
      }
      const result = await response.json()
      setContract(result.contract as LoanContract)
      setShowContractViewer(true)
    } catch (e: any) {
      console.error('Error fetching contract:', e)
      alert(e.message || 'Failed to fetch contract')
    } finally {
      setLoadingContract(false)
    }
  }

  const handleApprove = async () => {
    if (!applicationId) return

    setProcessing(true)
    try {
      const payload: { loanAmount?: number } = {}
      const numericAmount =
        typeof preApproveAmount === 'string'
          ? Number(preApproveAmount)
          : preApproveAmount
      if (Number.isFinite(numericAmount) && numericAmount! > 0) {
        payload.loanAmount = Math.round((numericAmount as number) * 100) / 100
      }
      const response = await fetch(
        `/api/admin/applications/${applicationId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )

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
      const response = await fetch(
        `/api/admin/applications/${applicationId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: rejectReason })
        }
      )

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
            <p className='mt-4 text-sm text-gray-600'>
              Loading loan details...
            </p>
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
              <h1 className='text-base font-medium text-gray-700'>
                Loan Details
              </h1>
              <span className='text-xs text-gray-400'>•</span>
              <span className='font-mono text-xs text-gray-500'>
                {loan.loan_number}
              </span>
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
            {(
              [
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'payments', label: 'Payments', icon: '💳' },
                { id: 'schedule', label: 'Schedule', icon: '📆' },
                { id: 'borrower', label: 'Borrower', icon: '👤' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
              <div className='space-y-6'>
                {/* Quick Stats */}
                <div className='grid gap-4 md:grid-cols-3'>
                  <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Principal
                    </label>
                    <p className='mt-2 text-3xl font-bold text-gray-900'>
                      {currency(loan.principal)}
                    </p>
                  </div>
                  <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Remaining Balance
                    </label>
                    <p className='mt-2 text-3xl font-bold text-gray-900'>
                      {currency(loan.remaining_balance)}
                    </p>
                  </div>
                  <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                      Interest Rate
                    </label>
                    <p className='mt-2 text-3xl font-bold text-gray-900'>
                      {loan.interest_rate}%
                    </p>
                  </div>
                </div>

                {/* Loan Info */}
                <div className='grid gap-6 lg:grid-cols-2'>
                  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <div className='border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4'>
                      <h2 className='text-lg font-bold text-gray-900'>
                        Loan Information
                      </h2>
                    </div>
                    <div className='grid gap-4 p-6 text-sm md:grid-cols-2'>
                      <p className='text-gray-700'>
                        Loan Number:{' '}
                        <span className='font-semibold'>
                          {loan.loan_number}
                        </span>
                      </p>
                      <p className='text-gray-700'>
                        Term:{' '}
                        <span className='font-semibold'>
                          {loan.term_months} months
                        </span>
                      </p>
                      <p className='text-gray-700'>
                        Payment Frequency:{' '}
                        <span className='font-semibold capitalize'>
                          {loan.payment_frequency}
                        </span>
                      </p>
                      <p className='text-gray-700'>
                        Payment Amount:{' '}
                        <span className='font-semibold'>
                          {currency(loan.payment_amount)}
                        </span>
                      </p>
                      <p className='text-gray-700'>
                        Originated:{' '}
                        <span className='font-semibold'>
                          {formatDate(loan.origination_date)}
                        </span>
                      </p>
                      <p className='text-gray-700'>
                        Status:{' '}
                        <span className='font-semibold capitalize'>
                          {loan.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <div className='border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4'>
                      <h2 className='text-lg font-bold text-gray-900'>
                        Payment Summary
                      </h2>
                    </div>
                    <div className='grid gap-4 p-6 text-sm md:grid-cols-2'>
                      <p className='text-gray-700'>
                        Next Payment:{' '}
                        <span className='font-semibold'>
                          {formatDateTime(loan.next_payment_date)}
                        </span>
                      </p>
                      <p className='text-gray-700'>
                        Last Payment:{' '}
                        <span className='font-semibold'>
                          {formatDateTime(loan.last_payment_date)}
                        </span>
                      </p>
                      <p className='text-gray-700'>
                        Next Amount Due:{' '}
                        <span className='font-semibold'>
                          {currency(loan.payment_amount)}
                        </span>
                      </p>
                      <p className='text-gray-700'>
                        Paid Payments:{' '}
                        <span className='font-semibold'>
                          {
                            loan.schedule.filter(s => s.status === 'paid')
                              .length
                          }
                        </span>
                      </p>
                      {statistics && (
                        <>
                          <p className='text-gray-700'>
                            Total Paid:{' '}
                            <span className='font-semibold text-green-600'>
                              {currency(statistics.totalPaid)}
                            </span>
                          </p>
                          <p className='text-gray-700'>
                            Pending Amount:{' '}
                            <span className='font-semibold text-yellow-600'>
                              {currency(statistics.totalPending)}
                            </span>
                          </p>
                          <p className='text-gray-700'>
                            Failed Payments:{' '}
                            <span className='font-semibold text-red-600'>
                              {statistics.totalPayments -
                                statistics.confirmedPayments}
                            </span>
                          </p>
                          <p className='text-gray-700'>
                            Total Payments:{' '}
                            <span className='font-semibold'>
                              {statistics.totalPayments}
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='rounded-xl border border-gray-200 bg-white p-6'>
                  <div className='flex items-center justify-center gap-4'>
                    {!hasContract && (
                      <div className='flex flex-col items-center gap-2'>
                        <Button
                          onClick={() => {
                            if (applicationStatus !== 'pre_approved') {
                              return
                            }
                            setShowContractModal(true)
                          }}
                          disabled={
                            loadingContract ||
                            !applicationId ||
                            applicationStatus !== 'pre_approved'
                          }
                          className='rounded-lg border border-blue-600 bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
                        >
                          {loadingContract
                            ? 'Generating...'
                            : 'Generate Contract'}
                        </Button>
                        {applicationStatus !== 'pre_approved' && (
                          <p className='text-xs text-gray-500'>
                            Application must be pre-approved before generating a
                            contract.
                          </p>
                        )}
                      </div>
                    )}
                    {hasContract && contractStatus !== 'signed' && (
                      <div className='flex flex-col items-center gap-2'>
                        <Button
                          onClick={() => setShowContractModal(true)}
                          disabled={loadingContract || !applicationId}
                          className='rounded-lg border border-blue-600 bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
                        >
                          {loadingContract
                            ? 'Regenerating...'
                            : 'Regenerate Contract'}
                        </Button>
                      </div>
                    )}
                    <Button
                      onClick={handleViewContract}
                      disabled={loadingContract || !applicationId}
                      className='rounded-lg border border-indigo-600 bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50'
                    >
                      {loadingContract ? 'Loading...' : 'View Contract'}
                    </Button>
                    <Button className='rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50'>
                      Record Payment
                    </Button>
                    <Button className='rounded-lg border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-2.5 text-sm font-semibold text-white hover:shadow-lg'>
                      Export Statement
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className='space-y-6'>
                <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                  <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4'>
                    <h3 className='text-lg font-bold text-gray-900'>
                      Recent Payments
                    </h3>
                  </div>
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead className='bg-gray-50'>
                        <tr>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                            Due Date
                          </th>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                            Amount Due
                          </th>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                            Amount Paid
                          </th>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200 bg-white'>
                        {loan.schedule.slice(0, 8).map(p => (
                          <tr
                            key={p.id}
                            className='transition-colors hover:bg-gray-50'
                          >
                            <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>
                              {formatDate(p.due_date)}
                            </td>
                            <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>
                              {currency(p.amount_due)}
                            </td>
                            <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>
                              {p.amount_paid ? currency(p.amount_paid) : '-'}
                            </td>
                            <td className='whitespace-nowrap px-4 py-2'>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  p.status === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : p.status === 'late'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {p.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className='space-y-6'>
                <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                  <div className='border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4'>
                    <h3 className='text-lg font-bold text-gray-900'>
                      Payment Schedule
                    </h3>
                  </div>
                  <div className='grid gap-4 p-6 md:grid-cols-2'>
                    {loan.schedule.map(p => (
                      <div
                        key={p.id}
                        className='rounded-lg border border-gray-200 bg-gray-50 p-4'
                      >
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-semibold text-gray-900'>
                              {formatDate(p.due_date)}
                            </p>
                            <p className='text-xs text-gray-500'>
                              Amount: {currency(p.amount_due)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              p.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : p.status === 'late'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {p.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'borrower' && (
              <div className='space-y-6'>
                <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                  <div className='border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4'>
                    <h3 className='text-lg font-bold text-gray-900'>
                      Borrower Information
                    </h3>
                  </div>
                  <div className='grid gap-6 p-6 md:grid-cols-2'>
                    <div>
                      <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Full Name
                      </label>
                      {loan.borrower.id && loan.borrower.id !== 'N/A' ? (
                        <button
                          onClick={() =>
                            router.push(`/admin/clients/${loan.borrower.id}`)
                          }
                          className='mt-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline'
                        >
                          {loan.borrower.name}
                        </button>
                      ) : (
                        <p className='mt-1 text-sm font-medium text-gray-900'>
                          {loan.borrower.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Email
                      </label>
                      <p className='mt-1 text-sm font-medium text-gray-900'>
                        {loan.borrower.email}
                      </p>
                    </div>
                    <div>
                      <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Phone
                      </label>
                      <p className='mt-1 text-sm font-medium text-gray-900'>
                        {loan.borrower.phone}
                      </p>
                    </div>
                    <div>
                      <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Province
                      </label>
                      <p className='mt-1 text-sm font-medium text-gray-900'>
                        {loan.borrower.province}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Contract Modal */}
      {showContractModal && applicationId && (
        <GenerateContractModal
          open={showContractModal}
          loadingContract={loadingContract}
          applicationId={applicationId}
          onSubmit={async ({
            paymentFrequency,
            numberOfPayments,
            loanAmount,
            nextPaymentDate,
            account
          }) => {
            if (!applicationId) return
            setLoadingContract(true)
            try {
              const termMonths = (() => {
                switch (paymentFrequency) {
                  case 'weekly':
                    return Math.max(1, Math.ceil(numberOfPayments / 4))
                  case 'bi-weekly':
                    return Math.max(1, Math.ceil(numberOfPayments / 2))
                  case 'twice-monthly':
                    return Math.max(1, Math.ceil(numberOfPayments / 2))
                  default:
                    return Math.max(1, numberOfPayments)
                }
              })()
              const payload: GenerateContractPayload = {
                paymentFrequency,
                numberOfPayments,
                loanAmount,
                nextPaymentDate,
                account
              }

              if (account) {
                payload.account = account
              }
              const response = await fetch(
                `/api/admin/applications/${applicationId}/contract/generate`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                }
              )
              if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Failed to generate contract')
              }
              setShowContractModal(false)
              setHasContract(true)
              setContractStatus('generated')
            } catch (e: any) {
              console.error(e)
              alert(e.message || 'Failed to generate contract')
            } finally {
              setLoadingContract(false)
            }
          }}
          onClose={() => setShowContractModal(false)}
        />
      )}
      {/* View Contract Modal */}
      {showContractViewer && applicationId && (
        <ContractViewer
          contract={contract}
          applicationId={applicationId}
          onClose={() => {
            setShowContractViewer(false)
            setContract(null)
          }}
          onGenerate={() => setShowContractModal(true)}
          onSend={async () => {
            if (!applicationId) return
            try {
              setLoadingContract(true)
              const response = await fetch(
                `/api/admin/applications/${applicationId}/contract/send`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ method: 'email' })
                }
              )
              if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Failed to send contract')
              }
              alert('Contract sent successfully!')
            } catch (e: any) {
              console.error('Error sending contract:', e)
              alert(e.message || 'Failed to send contract')
            } finally {
              setLoadingContract(false)
            }
          }}
        />
      )}

      {/* Pre-Approve Modal */}
      {showApproveModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6'>
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900'>
                Pre-Approve Application
              </h3>
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
                  {loan ? currency(loan.principal) : '-'}
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
              <h3 className='text-lg font-semibold text-gray-900'>
                Reject Application
              </h3>
              <p className='mt-2 text-sm text-gray-600'>
                Please provide a reason for rejection:
              </p>
              <div className='mt-4'>
                <label className='mb-1 block text-xs font-medium text-gray-700'>
                  Reason
                </label>
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
