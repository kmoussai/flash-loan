import type { ApplicationWithDetails } from '../types'

interface DetailsTabProps {
  application: ApplicationWithDetails
}

const DetailsTab = ({ application }: DetailsTabProps) => {
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


