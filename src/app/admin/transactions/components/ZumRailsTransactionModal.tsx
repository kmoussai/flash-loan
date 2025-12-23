'use client'

import { useEffect, useState } from 'react'

interface ZumRailsTransactionModalProps {
  transactionId: string | null
  isOpen: boolean
  onClose: () => void
}

interface ZumRailsTransactionDetails {
  Id: string
  CreatedAt: string
  Memo?: string
  Comment?: string
  Amount: number
  Currency?: string
  ZumRailsType: string
  TransactionMethod: string
  TransactionStatus: string
  ScheduledStartDate?: string
  ClientTransactionId?: string
  User?: {
    FirstName: string
    LastName: string
    Email?: string
  }
  FailedTransactionEvent?: {
    Event: string
    Message?: string
    Date?: string
  }
  TransactionHistory?: Array<{
    Id: string
    CreatedAt: string
    Event: string
    EventDescription?: string
  }>
}

const formatDate = (dateString: string | null, includeTime: boolean = true) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }
  return date.toLocaleDateString('en-US', options)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)
}

export default function ZumRailsTransactionModal({
  transactionId,
  isOpen,
  onClose
}: ZumRailsTransactionModalProps) {
  const [transactionDetails, setTransactionDetails] = useState<ZumRailsTransactionDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && transactionId) {
      setTransactionDetails(null)
      setError(null)
      setLoading(true)

      fetch(`/api/admin/transactions/${transactionId}/zumrails`)
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch transaction details')
          }
          return response.json()
        })
        .then((data) => {
          setTransactionDetails(data.transaction)
        })
        .catch((err: any) => {
          console.error('Error fetching ZumRails transaction details:', err)
          setError(err.message || 'Failed to load transaction details')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, transactionId])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-4'>
      <div className='my-auto w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <h3 className='text-lg font-semibold text-gray-900'>
            ZumRails Transaction Details
          </h3>
          <div className='flex items-center gap-2'>
            {transactionId && (
              <a
                href={`https://app.zumrails.com/#/transactions/${transactionId}`}
                target='_blank'
                rel='noopener noreferrer'
                className='text-xs text-blue-600 hover:text-blue-800'
              >
                Open in ZumRails →
              </a>
            )}
            <button
              type='button'
              onClick={onClose}
              className='rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
              aria-label='Close modal'
            >
              <svg
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='max-h-[70vh] overflow-y-auto px-6 py-5'>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600'></div>
              <span className='ml-3 text-sm text-gray-600'>Loading transaction details...</span>
            </div>
          ) : error ? (
            <div className='rounded-lg bg-red-50 p-4 text-sm text-red-600'>
              <p className='font-medium'>Error loading transaction details</p>
              <p className='mt-1'>{error}</p>
            </div>
          ) : transactionDetails ? (
            <div className='space-y-4'>
              {/* Basic Info */}
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500'>Transaction ID</label>
                  <p className='mt-1 font-mono text-sm text-gray-900'>{transactionDetails.Id}</p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500'>Status</label>
                  <p className='mt-1 text-sm font-semibold text-gray-900'>{transactionDetails.TransactionStatus}</p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500'>Type</label>
                  <p className='mt-1 text-sm text-gray-900'>{transactionDetails.ZumRailsType}</p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500'>Method</label>
                  <p className='mt-1 text-sm text-gray-900'>{transactionDetails.TransactionMethod}</p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500'>Amount</label>
                  <p className='mt-1 text-sm font-semibold text-gray-900'>
                    {formatCurrency(transactionDetails.Amount)} {transactionDetails.Currency || 'CAD'}
                  </p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500'>Created At</label>
                  <p className='mt-1 text-sm text-gray-900'>
                    {formatDate(transactionDetails.CreatedAt)}
                  </p>
                </div>
                {transactionDetails.ScheduledStartDate && (
                  <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                    <label className='text-xs font-medium text-gray-500'>Scheduled Start Date</label>
                    <p className='mt-1 text-sm text-gray-900'>
                      {formatDate(transactionDetails.ScheduledStartDate, false)}
                    </p>
                  </div>
                )}
                {transactionDetails.ClientTransactionId && (
                  <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                    <label className='text-xs font-medium text-gray-500'>Client Transaction ID</label>
                    <p className='mt-1 font-mono text-sm text-gray-900'>{transactionDetails.ClientTransactionId}</p>
                  </div>
                )}
              </div>

              {/* Memo and Comment */}
              {(transactionDetails.Memo || transactionDetails.Comment) && (
                <div className='space-y-2'>
                  {transactionDetails.Memo && (
                    <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                      <label className='text-xs font-medium text-gray-500'>Memo</label>
                      <p className='mt-1 text-sm text-gray-900'>{transactionDetails.Memo}</p>
                    </div>
                  )}
                  {transactionDetails.Comment && (
                    <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                      <label className='text-xs font-medium text-gray-500'>Comment</label>
                      <p className='mt-1 text-sm text-gray-900'>{transactionDetails.Comment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* User Info */}
              {transactionDetails.User && (
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500'>User</label>
                  <p className='mt-1 text-sm text-gray-900'>
                    {transactionDetails.User.FirstName} {transactionDetails.User.LastName}
                  </p>
                  {transactionDetails.User.Email && (
                    <p className='mt-1 text-xs text-gray-600'>{transactionDetails.User.Email}</p>
                  )}
                </div>
              )}

              {/* Failed Transaction Event */}
              {transactionDetails.FailedTransactionEvent && (
                <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
                  <label className='text-xs font-medium text-red-700'>Failed Transaction Event</label>
                  <div className='mt-2 space-y-1 text-sm'>
                    <p className='text-red-900'>
                      <span className='font-medium'>Event:</span> {transactionDetails.FailedTransactionEvent.Event}
                    </p>
                    {transactionDetails.FailedTransactionEvent.Message && (
                      <p className='text-red-800'>
                        <span className='font-medium'>Message:</span> {transactionDetails.FailedTransactionEvent.Message}
                      </p>
                    )}
                    {transactionDetails.FailedTransactionEvent.Date && (
                      <p className='text-red-800'>
                        <span className='font-medium'>Date:</span> {formatDate(transactionDetails.FailedTransactionEvent.Date)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction History */}
              {transactionDetails.TransactionHistory && transactionDetails.TransactionHistory.length > 0 && (
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  <label className='text-xs font-medium text-gray-500 mb-3 block'>Transaction History</label>
                  <div className='space-y-3'>
                    {transactionDetails.TransactionHistory.map((event, index) => (
                      <div key={event.Id || index} className='rounded-lg border border-gray-200 bg-white p-3'>
                        <div className='flex items-start justify-between'>
                          <div className='flex-1'>
                            <p className='text-sm font-semibold text-gray-900'>{event.Event}</p>
                            {event.EventDescription && (
                              <p className='mt-1 text-xs text-gray-600'>{event.EventDescription}</p>
                            )}
                          </div>
                          <div className='ml-4 text-right'>
                            <p className='text-xs text-gray-500'>
                              {formatDate(event.CreatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON (collapsible) */}
              <details className='rounded-lg border border-gray-200 bg-gray-50'>
                <summary className='cursor-pointer px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100'>
                  View Raw JSON
                </summary>
                <pre className='max-h-64 overflow-auto p-4 text-xs'>
                  {JSON.stringify(transactionDetails, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

