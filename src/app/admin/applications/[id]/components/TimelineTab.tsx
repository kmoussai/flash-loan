import type { ApplicationWithDetails } from '../types'

interface TimelineTabProps {
  application: ApplicationWithDetails
}

const TimelineTab = ({ application }: TimelineTabProps) => {
  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4'>
          <h3 className='text-lg font-bold text-gray-900'>Timeline</h3>
        </div>
        <div className='p-6'>
          <div className='space-y-4'>
            <TimelineItem
              label='Created'
              date={application.created_at}
              iconColor='text-indigo-600'
              containerColor='bg-indigo-100'
              borderColor='border-gray-200'
              iconPath='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />

            {application.submitted_at && (
              <TimelineItem
                label='Submitted'
                date={application.submitted_at}
                iconColor='text-blue-600'
                containerColor='bg-blue-100'
                borderColor='border-gray-200'
                iconPath='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            )}

            {application.approved_at && (
              <TimelineItem
                label={
                  application.application_status === 'approved'
                    ? 'Approved (Loan Created)'
                    : 'Pre-Approved'
                }
                date={application.approved_at}
                iconColor='text-emerald-600'
                containerColor='bg-emerald-100'
                borderColor='border-emerald-200'
                iconPath='M5 13l4 4L19 7'
              />
            )}

            {application.contract_generated_at && (
              <TimelineItem
                label='Contract Generated'
                date={application.contract_generated_at}
                iconColor='text-purple-600'
                containerColor='bg-purple-100'
                borderColor='border-purple-200'
              iconPath='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
            )}

            {application.contract_sent_at && (
              <TimelineItem
                label='Contract Sent'
                date={application.contract_sent_at}
                iconColor='text-blue-600'
                containerColor='bg-blue-100'
                borderColor='border-blue-200'
              iconPath='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
            />
            )}

            {application.contract_signed_at && (
              <TimelineItem
                label='Contract Signed'
                date={application.contract_signed_at}
                iconColor='text-indigo-600'
                containerColor='bg-indigo-100'
                borderColor='border-indigo-200'
              iconPath='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
            />
            )}

            {application.rejected_at && (
              <TimelineItem
                label='Rejected'
                date={application.rejected_at}
                iconColor='text-red-600'
                containerColor='bg-red-100'
                borderColor='border-red-200'
              iconPath='M6 18L18 6M6 6l12 12'
            />
            )}

            <TimelineItem
              label='Last Updated'
              date={application.updated_at}
              iconColor='text-gray-600'
              containerColor='bg-gray-100'
              borderColor='border-gray-200'
              iconPath='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </div>
        </div>
      </div>

      {application.staff_notes && (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4'>
            <h3 className='text-lg font-bold text-gray-900'>Staff Notes</h3>
          </div>
          <div className='p-6'>
            <p className='text-sm leading-relaxed text-gray-700'>{application.staff_notes}</p>
          </div>
        </div>
      )}

      {application.rejection_reason && (
        <div className='rounded-xl border border-red-200 bg-red-50 shadow-sm'>
          <div className='border-b border-red-200 bg-red-100 px-6 py-4'>
            <h3 className='text-lg font-bold text-gray-900'>Rejection Reason</h3>
          </div>
          <div className='p-6'>
            <p className='text-sm leading-relaxed text-gray-700'>{application.rejection_reason}</p>
          </div>
        </div>
      )}
    </div>
  )
}

const TimelineItem = ({
  label,
  date,
  iconColor,
  containerColor,
  borderColor,
  iconPath
}: {
  label: string
  date: string | null
  iconColor: string
  containerColor: string
  borderColor: string
  iconPath: string
}) => (
  <div className={`flex items-center gap-4 rounded-lg border ${borderColor} bg-gray-50 p-4`}>
    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${containerColor}`}>
      <svg className={`h-5 w-5 ${iconColor}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={iconPath} />
      </svg>
    </div>
    <div className='flex-1'>
      <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>{label}</p>
      <p className='mt-1 text-sm font-medium text-gray-900'>{formatDateTime(date)}</p>
    </div>
  </div>
)

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

export default TimelineTab


