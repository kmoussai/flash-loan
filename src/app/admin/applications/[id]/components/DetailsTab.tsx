'use client'

import { useState } from 'react'
import type { ApplicationWithDetails } from '../types'
import AddBankAccountModal from '../../../components/AddBankAccountModal'
interface DetailsTabProps {
  application: ApplicationWithDetails
}
const DetailsTab = ({ application }: DetailsTabProps) => {
  const [showBankAccountModal, setShowBankAccountModal] = useState(false)
  const clientId = application.users?.id

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4'>
          <h3 className='text-lg font-bold text-gray-900'>Additional Information</h3>
        </div>
        <div className='p-6'>
          <div className='grid gap-6 md:grid-cols-2'>
            <InfoItem label='Email' value={application.users?.email || 'N/A'} />
            <InfoItem label='Phone' value={application.users?.phone || 'N/A'} />
            <InfoItem
              label='Language'
              value={application.users?.preferred_language || 'N/A'}
            />
            {application.addresses && application.addresses.length > 0 && (
              <div>
                <InfoItem label='Address' value={formatAddress(application)} />
                {application.addresses[0].moving_date && (
                  <p className='mt-1 text-xs text-gray-500'>
                    Moved in: {formatDate(application.addresses[0].moving_date)}
                  </p>
                )}
              </div>
            )}
          </div>

          {(application.users?.residence_status || application.users?.gross_salary) && (
            <div className='mt-6 border-t border-gray-200 pt-6'>
              <h4 className='mb-4 text-sm font-bold text-gray-900'>Financial Information</h4>
              <div className='grid gap-4 md:grid-cols-2'>
                {application.users?.residence_status && (
                  <InfoItem
                    label='Residence Status'
                    value={application.users.residence_status}
                  />
                )}
                {typeof application.users?.gross_salary === 'number' && (
                  <InfoItem
                    label='Gross Salary'
                    value={formatCurrency(application.users.gross_salary)}
                  />
                )}
                {typeof application.users?.rent_or_mortgage_cost === 'number' && (
                  <InfoItem
                    label='Rent/Mortgage'
                    value={formatCurrency(application.users.rent_or_mortgage_cost)}
                  />
                )}
                {typeof application.users?.heating_electricity_cost === 'number' && (
                  <InfoItem
                    label='Heating/Electricity'
                    value={formatCurrency(application.users.heating_electricity_cost)}
                  />
                )}
                {typeof application.users?.car_loan === 'number' && (
                  <InfoItem
                    label='Car Loan'
                    value={formatCurrency(application.users.car_loan)}
                  />
                )}
                {typeof application.users?.furniture_loan === 'number' && (
                  <InfoItem
                    label='Furniture Loan'
                    value={formatCurrency(application.users.furniture_loan)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bank Account Section */}
      {clientId && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-bold text-gray-900'>Bank Account Information</h3>
              <button
                onClick={() => setShowBankAccountModal(true)}
                className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors'
              >
                <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                </svg>
                {application.users?.bank_account ? 'Edit' : 'Add'} Bank Account
              </button>
            </div>
          </div>
          <div className='p-6'>
            {!application.users?.bank_account ? (
              <div className='rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center'>
                <svg className='mx-auto h-12 w-12 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                </svg>
                <p className='mt-4 text-sm font-medium text-gray-900'>No bank account found</p>
                <p className='mt-1 text-xs text-gray-500'>Bank account information has not been added yet.</p>
              </div>
            ) : (
              <div className='grid gap-4 md:grid-cols-2'>
                <InfoItem
                  label='Bank Name'
                  value={application.users.bank_account.bank_name || 'N/A'}
                />
                <InfoItem
                  label='Account Name'
                  value={application.users.bank_account.account_name || 'N/A'}
                />
                <InfoItem
                  label='Institution Number'
                  value={application.users.bank_account.institution_number || 'N/A'}
                />
                <InfoItem
                  label='Transit Number'
                  value={application.users.bank_account.transit_number || 'N/A'}
                />
                <div className='md:col-span-2'>
                  <InfoItem
                    label='Account Number'
                    value={application.users.bank_account.account_number || 'N/A'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {application.income_fields && Object.keys(application.income_fields).length > 0 && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4'>
            <h3 className='text-lg font-bold text-gray-900'>Income Details</h3>
          </div>
          <div className='p-6'>
            <div className='grid gap-3 md:grid-cols-2'>
              {Object.entries(application.income_fields).map(([key, value]) => (
                <div key={key} className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
                  <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    {key.replace(/_/g, ' ')}
                  </label>
                  <p className='mt-1 text-sm font-medium text-gray-900'>{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {application.references && application.references.length > 0 && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4'>
            <h3 className='text-lg font-bold text-gray-900'>References</h3>
          </div>
          <div className='p-6'>
            <div className='grid gap-4 md:grid-cols-2'>
              {application.references.map(reference => (
                <div key={reference.id} className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <h4 className='mb-2 font-semibold text-gray-900'>
                    {reference.first_name} {reference.last_name}
                  </h4>
                  <div className='space-y-1 text-sm text-gray-600'>
                    <p>Phone: {reference.phone}</p>
                    <p>Relationship: {reference.relationship}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bank Account Modal */}
      {clientId && (
        <AddBankAccountModal
          isOpen={showBankAccountModal}
          onClose={() => setShowBankAccountModal(false)}
          clientId={clientId}
          existingBankAccount={application.users?.bank_account || null}
          onSuccess={() => {
            setShowBankAccountModal(false)
            // Reload page to refresh data
            window.location.reload()
          }}
          title={application.users?.bank_account ? 'Edit Bank Account' : 'Add Bank Account'}
        />
      )}
    </div>
  )
}

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
      {label}
    </label>
    <p className='mt-1 text-sm font-medium text-gray-900'>{value}</p>
  </div>
)

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'

  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
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

export default DetailsTab


