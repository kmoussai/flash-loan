'use client'

import { IbvRequestHistory, formatDateTime } from './types'

interface IbvCardHistoryProps {
  history: IbvRequestHistory[]
  notifyingId: string | null
  onSendNotification: (requestId: string) => void
}

export default function IbvCardHistory({
  history,
  notifyingId,
  onSendNotification
}: IbvCardHistoryProps) {
  if (history.length === 0) return null

  return (
    <div className='border-t border-gray-100 bg-gray-50 px-4 py-3'>
      <h3 className='text-xs font-semibold text-gray-700'>Verification History</h3>
      <ul className='mt-3 space-y-2'>
        {history.map(entry => (
          <li
            key={entry.id}
            className='rounded-lg border border-gray-200 bg-white p-3 shadow-sm'
          >
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='text-xs font-medium text-gray-800'>
                  {entry.status.toUpperCase()}
                </p>
                <p className='text-[10px] text-gray-500'>
                  Requested {new Date(entry.requested_at).toLocaleString()}
                  {entry.completed_at
                    ? ` • Completed ${new Date(entry.completed_at).toLocaleString()}`
                    : ' • Pending'}
                </p>
              </div>
              {entry.request_guid && (
                <p className='text-[10px] text-gray-500'>
                  GUID: <span className='font-mono'>{entry.request_guid}</span>
                </p>
              )}
            </div>
            {entry.note && (
              <p className='mt-1.5 text-[10px] text-gray-600'>Note: {entry.note}</p>
            )}
            {(entry.provider_data?.last_notification_at ||
              entry.provider_data?.last_notification_to) && (
              <p className='mt-1.5 text-[10px] text-gray-500'>
                Last notification:{' '}
                {formatDateTime(entry.provider_data?.last_notification_at) || 'Unknown'}
                {entry.provider_data?.last_notification_to
                  ? ` • ${entry.provider_data.last_notification_to}`
                  : ''}
              </p>
            )}
            <div className='mt-2 flex flex-wrap items-center gap-1.5'>
              {(() => {
                const verificationUrl =
                  entry.request_url ||
                  entry.provider_data?.start_url ||
                  entry.provider_data?.iframe_url
                if (!verificationUrl) return null
                return (
                  <a
                    href={verificationUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-100'
                  >
                    Open Verification
                  </a>
                )
              })()}
              <button
                onClick={() => onSendNotification(entry.id)}
                disabled={
                  notifyingId === entry.id ||
                  entry.status?.toLowerCase() === 'verified'
                }
                className='inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 transition-all hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {notifyingId === entry.id ? (
                  <>
                    <svg
                      className='h-3 w-3 animate-spin text-amber-600'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                    Sending...
                  </>
                ) : entry.status?.toLowerCase() === 'verified' ? (
                  <>
                    <svg
                      className='h-3 w-3 text-emerald-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    Already Verified
                  </>
                ) : (
                  <>
                    <svg
                      className='h-3 w-3 text-amber-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                      />
                    </svg>
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
