'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminDashboardLayout from '../../components/AdminDashboardLayout'
import Button from '@/src/app/[locale]/components/Button'

type LoanStatus = 'active' | 'paid' | 'defaulted' | 'pending' | 'cancelled'

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
  payment_frequency: 'weekly' | 'biweekly' | 'monthly'
  payment_amount: number
  origination_date: string
  status: LoanStatus
  next_payment_date: string | null
  last_payment_date: string | null
  schedule: Payment[]
}

const currency = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
const formatDateTime = (d: string | null) => d ? new Date(d).toLocaleString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

// Mock loan details generator
function generateMockLoan(id: string): LoanDetail {
  const principal = 12000
  const interestRate = 12.99
  const termMonths = 18
  const paymentFrequency: LoanDetail['payment_frequency'] = 'biweekly'
  const paymentIntervalDays = paymentFrequency === 'weekly' ? 7 : paymentFrequency === 'biweekly' ? 14 : 30

  // Simple mock payment amount (not exact amortization)
  const paymentAmount = 780
  const start = addDays(new Date(), -60)

  const schedule: Payment[] = Array.from({ length: 12 }, (_, i) => {
    const due = addDays(start, paymentIntervalDays * (i + 1))
    const paid = i < 3 // first 3 payments paid
    const late = i === 4 // mark one as late
    return {
      id: `pmt-${i + 1}`,
      due_date: due.toISOString(),
      amount_due: paymentAmount,
      amount_paid: paid ? paymentAmount : 0,
      status: paid ? 'paid' : (late && due < new Date() ? 'late' : 'upcoming')
    }
  })

  const paidSoFar = schedule.filter(s => s.status === 'paid').reduce((sum, p) => sum + p.amount_paid, 0)
  const remaining = Math.max(0, principal - Math.round(paidSoFar * 0.7)) // fake remaining balance
  const nextPayment = schedule.find(s => s.status !== 'paid') || null
  const lastPayment = schedule.filter(s => s.status === 'paid').slice(-1)[0] || null

  return {
    id,
    loan_number: `LN-${id.replace(/[^0-9]/g, '').padStart(6, '0').slice(0, 6)}`,
    borrower: {
      id: 'user_mock_1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (514) 555-1234',
      province: 'Quebec'
    },
    principal,
    remaining_balance: remaining,
    interest_rate: interestRate,
    term_months: termMonths,
    payment_frequency: paymentFrequency,
    payment_amount: paymentAmount,
    origination_date: addDays(new Date(), -120).toISOString(),
    status: 'active',
    next_payment_date: nextPayment ? nextPayment.due_date : null,
    last_payment_date: lastPayment ? lastPayment.due_date : null,
    schedule
  }
}

export default function LoanDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const loanId = params.id as string

  const [loan, setLoan] = useState<LoanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'schedule' | 'borrower'>('overview')

  useEffect(() => {
    try {
      setLoading(true)
      const mock = generateMockLoan(loanId || '1')
      setLoan(mock)
      setError(null)
    } catch (e: any) {
      setError(e.message || 'Failed to load loan details')
    } finally {
      setLoading(false)
    }
  }, [loanId])

  const statusBadge = useMemo(() => {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold '
    switch (loan?.status) {
      case 'active': return base + 'bg-blue-100 text-blue-800'
      case 'paid': return base + 'bg-green-100 text-green-800'
      case 'defaulted': return base + 'bg-red-100 text-red-800'
      case 'pending': return base + 'bg-yellow-100 text-yellow-800'
      default: return base + 'bg-gray-100 text-gray-800'
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
              <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
            <div className='flex items-center gap-2'>
              <h1 className='text-base font-medium text-gray-700'>Loan Details</h1>
              <span className='text-xs text-gray-400'>•</span>
              <span className='text-xs font-mono text-gray-500'>{loan.loan_number}</span>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <span className={statusBadge}>{loan.status.toUpperCase()}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className='border-b border-gray-200 bg-white px-6'>
          <div className='flex items-center gap-1'>
            {([
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'payments', label: 'Payments', icon: '💳' },
              { id: 'schedule', label: 'Schedule', icon: '📆' },
              { id: 'borrower', label: 'Borrower', icon: '👤' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'
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
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Principal</label>
                    <p className='mt-2 text-3xl font-bold text-gray-900'>{currency(loan.principal)}</p>
                  </div>
                  <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Remaining Balance</label>
                    <p className='mt-2 text-3xl font-bold text-gray-900'>{currency(loan.remaining_balance)}</p>
                  </div>
                  <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5'>
                    <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>Interest Rate</label>
                    <p className='mt-2 text-3xl font-bold text-gray-900'>{loan.interest_rate}%</p>
                  </div>
                </div>

                {/* Loan Info */}
                <div className='grid gap-6 lg:grid-cols-2'>
                  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <div className='border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4'>
                      <h2 className='text-lg font-bold text-gray-900'>Loan Information</h2>
                    </div>
                    <div className='p-6 grid gap-4 md:grid-cols-2 text-sm'>
                      <p className='text-gray-700'>Loan Number: <span className='font-semibold'>{loan.loan_number}</span></p>
                      <p className='text-gray-700'>Term: <span className='font-semibold'>{loan.term_months} months</span></p>
                      <p className='text-gray-700'>Payment Frequency: <span className='font-semibold capitalize'>{loan.payment_frequency}</span></p>
                      <p className='text-gray-700'>Payment Amount: <span className='font-semibold'>{currency(loan.payment_amount)}</span></p>
                      <p className='text-gray-700'>Originated: <span className='font-semibold'>{formatDate(loan.origination_date)}</span></p>
                      <p className='text-gray-700'>Status: <span className='font-semibold capitalize'>{loan.status}</span></p>
                    </div>
                  </div>

                  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <div className='border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4'>
                      <h2 className='text-lg font-bold text-gray-900'>Payment Summary</h2>
                    </div>
                    <div className='p-6 grid gap-4 md:grid-cols-2 text-sm'>
                      <p className='text-gray-700'>Next Payment: <span className='font-semibold'>{formatDateTime(loan.next_payment_date)}</span></p>
                      <p className='text-gray-700'>Last Payment: <span className='font-semibold'>{formatDateTime(loan.last_payment_date)}</span></p>
                      <p className='text-gray-700'>Next Amount Due: <span className='font-semibold'>{currency(loan.payment_amount)}</span></p>
                      <p className='text-gray-700'>Paid Payments: <span className='font-semibold'>{loan.schedule.filter(s => s.status === 'paid').length}</span></p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='rounded-xl border border-gray-200 bg-white p-6'>
                  <div className='flex items-center justify-center gap-4'>
                    <Button className='rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50'>Record Payment</Button>
                    <Button className='rounded-lg border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-2.5 text-sm font-semibold text-white hover:shadow-lg'>Export Statement</Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className='space-y-6'>
                <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
                  <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4'>
                    <h3 className='text-lg font-bold text-gray-900'>Recent Payments</h3>
                  </div>
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead className='bg-gray-50'>
                        <tr>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Due Date</th>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Amount Due</th>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Amount Paid</th>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>Status</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200 bg-white'>
                        {loan.schedule.slice(0, 8).map(p => (
                          <tr key={p.id} className='transition-colors hover:bg-gray-50'>
                            <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>{formatDate(p.due_date)}</td>
                            <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>{currency(p.amount_due)}</td>
                            <td className='whitespace-nowrap px-4 py-2 text-sm text-gray-900'>{p.amount_paid ? currency(p.amount_paid) : '-'}</td>
                            <td className='whitespace-nowrap px-4 py-2'>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                p.status === 'paid' ? 'bg-green-100 text-green-800' : p.status === 'late' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
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
                    <h3 className='text-lg font-bold text-gray-900'>Payment Schedule</h3>
                  </div>
                  <div className='p-6 grid gap-4 md:grid-cols-2'>
                    {loan.schedule.map(p => (
                      <div key={p.id} className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm font-semibold text-gray-900'>{formatDate(p.due_date)}</p>
                            <p className='text-xs text-gray-500'>Amount: {currency(p.amount_due)}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            p.status === 'paid' ? 'bg-green-100 text-green-800' : p.status === 'late' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
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
                    <h3 className='text-lg font-bold text-gray-900'>Borrower Information</h3>
                  </div>
                  <div className='p-6 grid gap-6 md:grid-cols-2'>
                    <div>
                      <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Full Name</label>
                      <p className='mt-1 text-sm font-medium text-gray-900'>{loan.borrower.name}</p>
                    </div>
                    <div>
                      <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Email</label>
                      <p className='mt-1 text-sm font-medium text-gray-900'>{loan.borrower.email}</p>
                    </div>
                    <div>
                      <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Phone</label>
                      <p className='mt-1 text-sm font-medium text-gray-900'>{loan.borrower.phone}</p>
                    </div>
                    <div>
                      <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Province</label>
                      <p className='mt-1 text-sm font-medium text-gray-900'>{loan.borrower.province}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}


