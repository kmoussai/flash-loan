'use client'

import { useEffect, useState } from 'react'
import AdminDashboardLayout from '../components/AdminDashboardLayout'
import { IconRefresh, IconCheckCircle, IconXCircle, IconSpinner } from '@/src/app/components/icons'

interface QueueStatus {
  pending: number
  loading: boolean
  error: string | null
}

interface ProcessResult {
  processed: number
  errors: number
  message: string
}

export default function NotificationsQueuePage() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    loading: false,
    error: null,
  })
  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<ProcessResult | null>(null)
  const [processLimit, setProcessLimit] = useState(10)

  // Fetch queue status on mount and periodically
  const fetchQueueStatus = async () => {
    try {
      setQueueStatus(prev => ({ ...prev, loading: true, error: null }))
      const response = await fetch('/api/admin/notifications/process-queue', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json()

      if (response.ok) {
        setQueueStatus({
          pending: data.pending || 0,
          loading: false,
          error: null,
        })
      } else {
        setQueueStatus({
          pending: 0,
          loading: false,
          error: data.error || 'Failed to fetch queue status',
        })
      }
    } catch (error: any) {
      setQueueStatus({
        pending: 0,
        loading: false,
        error: error.message || 'Failed to fetch queue status',
      })
    }
  }

  // Process queue manually
  const processQueue = async () => {
    try {
      setProcessing(true)
      setLastResult(null)

      const response = await fetch('/api/admin/notifications/process-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: processLimit,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setLastResult({
          processed: data.processed || 0,
          errors: data.errors || 0,
          message: data.message || 'Queue processed',
        })
        // Refresh queue status after processing
        await fetchQueueStatus()
      } else {
        setLastResult({
          processed: 0,
          errors: 1,
          message: data.error || 'Failed to process queue',
        })
      }
    } catch (error: any) {
      setLastResult({
        processed: 0,
        errors: 1,
        message: error.message || 'Failed to process queue',
      })
    } finally {
      setProcessing(false)
    }
  }

  // Fetch status on mount
  useEffect(() => {
    fetchQueueStatus()

    // Refresh status every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <AdminDashboardLayout>
      <div className='p-6'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900'>
            Notification Queue Manager
          </h1>
          <p className='mt-2 text-sm text-gray-600'>
            Manually process pending notification events from the queue. Events
            are automatically processed by background workers, but you can
            trigger processing manually here.
          </p>
        </div>

        {/* Queue Status Card */}
        <div className='mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-900'>
              Queue Status
            </h2>
            <button
              onClick={fetchQueueStatus}
              disabled={queueStatus.loading}
              className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
            >
              {queueStatus.loading ? (
                <IconSpinner className='h-4 w-4 animate-spin' />
              ) : (
                <IconRefresh className='h-4 w-4' />
              )}
              Refresh
            </button>
          </div>

          {queueStatus.error ? (
            <div className='rounded-lg bg-red-50 p-4'>
              <p className='text-sm text-red-800'>{queueStatus.error}</p>
            </div>
          ) : (
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <div
                  className={`h-3 w-3 rounded-full ${
                    queueStatus.pending > 0 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                ></div>
                <span className='text-sm font-medium text-gray-700'>
                  Pending Events:
                </span>
                <span className='text-lg font-bold text-gray-900'>
                  {queueStatus.pending}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Process Queue Card */}
        <div className='mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <h2 className='mb-4 text-lg font-semibold text-gray-900'>
            Process Queue
          </h2>

          <div className='mb-4'>
            <label
              htmlFor='process-limit'
              className='mb-2 block text-sm font-medium text-gray-700'
            >
              Events to Process (1-100)
            </label>
            <input
              id='process-limit'
              type='number'
              min='1'
              max='100'
              value={processLimit}
              onChange={(e) =>
                setProcessLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))
              }
              className='w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
            />
            <p className='mt-1 text-xs text-gray-500'>
              Number of pending events to process in this batch
            </p>
          </div>

          <button
            onClick={processQueue}
            disabled={processing || queueStatus.pending === 0}
            className='flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {processing ? (
              <>
                <IconSpinner className='h-5 w-5 animate-spin' />
                Processing...
              </>
            ) : (
              <>
                <IconRefresh className='h-5 w-5' />
                Process Queue
              </>
            )}
          </button>

          {/* Last Result */}
          {lastResult && (
            <div
              className={`mt-4 rounded-lg p-4 ${
                lastResult.errors > 0
                  ? 'bg-red-50'
                  : lastResult.processed > 0
                    ? 'bg-green-50'
                    : 'bg-gray-50'
              }`}
            >
              <div className='flex items-start gap-3'>
                {lastResult.errors > 0 ? (
                  <IconXCircle className='h-5 w-5 text-red-600' />
                ) : lastResult.processed > 0 ? (
                  <IconCheckCircle className='h-5 w-5 text-green-600' />
                ) : null}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      lastResult.errors > 0
                        ? 'text-red-800'
                        : lastResult.processed > 0
                          ? 'text-green-800'
                          : 'text-gray-800'
                    }`}
                  >
                    {lastResult.message}
                  </p>
                  {lastResult.processed > 0 && (
                    <p className='mt-1 text-xs text-gray-600'>
                      Processed: {lastResult.processed} | Errors:{' '}
                      {lastResult.errors}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className='rounded-lg bg-gray-50 p-4 text-xs text-gray-600'>
          <p className='mb-2 font-semibold'>How it works:</p>
          <ul className='list-inside list-disc space-y-1'>
            <li>
              The notification queue stores events that need to be processed
            </li>
            <li>
              Background workers automatically process events, but you can
              trigger processing manually here
            </li>
            <li>
              Processing will send emails via the configured provider (Resend or
              SMTP)
            </li>
            <li>
              Failed events will be retried up to the maximum attempt limit
            </li>
            <li>
              Only pending events are processed (not already processing,
              completed, or failed)
            </li>
          </ul>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

