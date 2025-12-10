'use client'

import { useState } from 'react'
import Button from '@/src/app/[locale]/components/Button'
import { PaymentFrequency } from '@/src/types'
import GenerateContractModal from './GenerateContractModal'
import type { ApplicationWithDetails } from '../types'

interface OverviewTabProps {
  application: ApplicationWithDetails
  loadingContract: boolean
  onGenerateContract: (options: {
    termMonths?: number
    paymentFrequency: PaymentFrequency
    numberOfPayments: number
    loanAmount: number
    nextPaymentDate: string
  }) => Promise<void> | void
  onViewContract: () => void
  onOpenApproveModal: () => void
  onOpenRejectModal: () => void
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)

const formatCurrencyCompact = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    notation: 'compact'
  }).format(amount)

const getStatusLabel = (status: ApplicationWithDetails['application_status']) => {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'processing':
      return 'Processing'
    case 'pre_approved':
      return 'Pre-Approved'
    case 'contract_pending':
      return 'Contract Pending'
    case 'contract_signed':
      return 'Contract Signed'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

const OverviewTab = ({
  application,
  loadingContract,
  onGenerateContract,
  onViewContract,
  onOpenApproveModal,
  onOpenRejectModal
}: OverviewTabProps) => {
  const [showContractModal, setShowContractModal] = useState(false)

  const handleOpenModal = () => {
    setShowContractModal(true)
  }

  const handleCloseModal = () => {
    if (!loadingContract) {
      setShowContractModal(false)
    }
  }

  return (
    <div className='space-y-3'>
      <div className='grid gap-3 md:grid-cols-3'>
        <div className='rounded-lg border border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-3'>
          <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-600'>
            Loan Amount
          </label>
          <p className='mt-1 text-xl font-bold text-gray-900'>
            {formatCurrency(application.loan_amount)}
          </p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3'>
          <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-600'>
            Income Source
          </label>
          <p className='mt-1 text-sm font-bold capitalize text-gray-900'>
            {application.income_source
              ? application.income_source.replace(/-/g, ' ')
              : 'Not provided'}
          </p>
        </div>
        <div className='rounded-lg border border-gray-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3'>
          <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-600'>
            Status
          </label>
          <p className='mt-1 text-sm font-bold text-gray-900'>
            {getStatusLabel(application.application_status)}
          </p>
        </div>
        {application.interest_rate && (
          <div className='rounded-lg border border-gray-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-3'>
            <label className='text-[10px] font-semibold uppercase tracking-wide text-gray-600'>
              Interest Rate
            </label>
            <p className='mt-1 text-sm font-bold text-gray-900'>
              {application.interest_rate}%
            </p>
          </div>
        )}
        {/* {application.ibv_results?.aggregates?.total_deposits && (
          <div className='rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5'>
            <label className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
              Avg Deposits
            </label>
            <p className='mt-2 text-lg font-bold text-gray-900'>
              {formatCurrencyCompact(application.ibv_results.aggregates.total_deposits)}
            </p>
          </div>
        )} */}
      </div>

      <div className='grid gap-3 lg:grid-cols-2'>
        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-2'>
            <h2 className='text-sm font-bold text-gray-900'>Loan Information</h2>
          </div>
          <div className='p-3'>
            <div className='space-y-2.5'>
              <div>
                <label className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>
                  Income Source
                </label>
                <p className='mt-0.5 text-xs font-medium capitalize text-gray-900'>
                  {application.income_source
                    ? application.income_source.replace(/-/g, ' ')
                    : 'Not provided'}
                </p>
              </div>
              <div>
                <label className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>
                  Bankruptcy Plan
                </label>
                <p className='mt-0.5 text-xs font-medium text-gray-900'>
                  {application.bankruptcy_plan ? 'Yes' : 'No'}
                </p>
              </div>
              {application.interest_rate && (
                <div>
                  <label className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>
                    Interest Rate
                  </label>
                  <p className='mt-0.5 text-xs font-medium text-gray-900'>
                    {application.interest_rate}% APR
                  </p>
                </div>
              )}
              {application.income_fields &&
                Object.keys(application.income_fields).length > 0 && (
                  <div>
                    <label className='mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-gray-500'>
                      Income Details
                    </label>
                    <div className='space-y-0.5 text-xs text-gray-700'>
                      {(() => {
                        const fields = Object.entries(application.income_fields)
                        // Prioritize address fields for employed/self-employed (handle both camelCase and snake_case)
                        const addressFields = [
                          'work_address', 'work_province', 
                          'workAddress', 'workProvince',
                          'business_address', 'business_province',
                          'businessAddress', 'businessProvince'
                        ]
                        const addressEntries = fields.filter(([key]) => addressFields.includes(key))
                        const otherEntries = fields.filter(([key]) => !addressFields.includes(key))
                        // Show address fields first, then others
                        const orderedFields = [...addressEntries, ...otherEntries]
                        
                        return orderedFields.map(([key, value]) => {
                          if (!value || String(value).trim() === '') return null
                          // Format address fields nicely (handle both formats)
                          const isWorkAddress = key === 'work_address' || key === 'workAddress'
                          const isBusinessAddress = key === 'business_address' || key === 'businessAddress'
                          if (isWorkAddress || isBusinessAddress) {
                            const provinceKey = isWorkAddress 
                              ? (application.income_fields?.work_province ? 'work_province' : 'workProvince')
                              : (application.income_fields?.business_province ? 'business_province' : 'businessProvince')
                            const province = application.income_fields?.[provinceKey as keyof typeof application.income_fields]
                            const addressParts = [String(value), province].filter(Boolean)
                            return (
                              <p key={key}>
                                <span className='font-medium capitalize'>
                                  {isWorkAddress ? 'Work Address' : 'Business Address'}:
                                </span>{' '}
                                {addressParts.join(', ')}
                              </p>
                            )
                          }
                          // Skip province if we already showed it with address
                          const isProvince = key === 'work_province' || key === 'workProvince' || 
                                            key === 'business_province' || key === 'businessProvince'
                          if (isProvince) {
                            // Check if corresponding address was already shown
                            const hasWorkAddress = application.income_fields?.work_address || application.income_fields?.workAddress
                            const hasBusinessAddress = application.income_fields?.business_address || application.income_fields?.businessAddress
                            if ((key === 'work_province' || key === 'workProvince') && hasWorkAddress) return null
                            if ((key === 'business_province' || key === 'businessProvince') && hasBusinessAddress) return null
                          }
                          return (
                            <p key={key}>
                              <span className='font-medium capitalize'>
                                {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}:
                              </span>{' '}
                              {String(value)}
                            </p>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2'>
            <h2 className='text-sm font-bold text-gray-900'>Client Information</h2>
          </div>
          <div className='p-3'>
            <div className='space-y-2.5'>
              <div>
                <label className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>
                  Email
                </label>
                <p className='mt-0.5 text-xs font-medium text-gray-900'>
                  {application.users?.email || 'N/A'}
                </p>
              </div>
              <div>
                <label className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>
                  Phone
                </label>
                <p className='mt-0.5 text-xs font-medium text-gray-900'>
                  {application.users?.phone || 'N/A'}
                </p>
              </div>
              <div>
                <label className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>
                  Language
                </label>
                <p className='mt-0.5 text-xs font-medium text-gray-900'>
                  {application.users?.preferred_language || 'N/A'}
                </p>
              </div>
              {application.addresses && application.addresses.length > 0 && (
                <div>
                  <label className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>
                    Address
                  </label>
                  <p className='mt-0.5 text-xs text-gray-900'>
                    {formatAddress(application)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(application.application_status === 'pre_approved' ||
        application.application_status === 'contract_pending' ||
        application.application_status === 'contract_signed' ||
        application.application_status === 'approved') && (
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <div className='mb-2'>
            <h3 className='text-sm font-semibold text-gray-900'>Contract Management</h3>
            <p className='mt-0.5 text-xs text-gray-600'>
              Generate, view, and send loan contracts to clients
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {(application.application_status === 'contract_pending' ||
              application.application_status === 'contract_signed' ||
              application.application_status === 'approved') && (
              <Button
                onClick={onViewContract}
                disabled={loadingContract}
                className='rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50'
              >
                {loadingContract ? 'Loading...' : 'View Contract'}
              </Button>
            )}
          </div>
        </div>
      )}

      
    </div>
  )
}

const formatAddress = (application: ApplicationWithDetails) => {
  if (!application.addresses || application.addresses.length === 0) {
    return 'N/A'
  }

  const address = application.addresses[0]
  const { street_number, street_name, apartment_number, city, province, postal_code } = address

  const parts = [
    [street_number, street_name].filter(Boolean).join(' '),
    apartment_number ? `Apt ${apartment_number}` : null,
    [city, province].filter(Boolean).join(', '),
    postal_code
  ]

  return parts.filter(Boolean).join(', ')
}

export default OverviewTab


