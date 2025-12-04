'use client'

import * as React from 'react'
import useSWR from 'swr'
import { Modal } from '@/src/app/components/Modal'
import Select from '@/src/app/[locale]/components/Select'
import { fetcher } from '@/lib/utils'

interface RejectionReasonOption {
  id: string
  code: string
  label: string
  description?: string | null
  category?: string | null
}

interface RejectApplicationModalProps {
  applicationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Optional callback invoked after a successful rejection.
   * Typically used to refresh application details in the parent.
   */
  onRejected?: () => Promise<void> | void
}

export function RejectApplicationModal({
  applicationId,
  open,
  onOpenChange,
  onRejected
}: RejectApplicationModalProps) {
  const [processing, setProcessing] = React.useState(false)
  const [rejectionReason, setRejectionReason] = React.useState('')
  const [rejectionComment, setRejectionComment] = React.useState('')

  const { data, isLoading } = useSWR<{ reasons: RejectionReasonOption[] }>(
    open ? '/api/admin/rejection-reasons' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0
    }
  )

  const rejectionReasons = (data?.reasons ?? []) as RejectionReasonOption[]
  const loadingRejectionReasons = open && isLoading && !data

  const handleReject = async () => {
    if (!applicationId) return
    const trimmedReason = rejectionReason.trim()
    const trimmedComment = rejectionComment.trim()

    if (!trimmedReason) {
      alert('Please provide a rejection reason.')
      return
    }

    if (trimmedReason === 'Other' && !trimmedComment) {
      alert('Please provide a comment when selecting "Other" as the reason.')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectionReason: trimmedReason,
          rejectionComment: trimmedComment || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to reject application')
      }

      if (onRejected) {
        await onRejected()
      }

      // Reset local state and close modal
      setRejectionReason('')
      setRejectionComment('')
      onOpenChange(false)
      alert('Application rejected.')
    } catch (err: any) {
      console.error('Error rejecting application:', err)
      alert(`Error: ${err.message || 'Failed to reject application'}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset local state when closing
      setRejectionReason('')
      setRejectionComment('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title='Reject Application'
      description='Please provide a reason for rejection:'
      footer={
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={() => handleClose(false)}
            disabled={processing}
            className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleReject}
            disabled={processing}
            className='flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
          >
            {processing ? 'Processing...' : 'Confirm Rejection'}
          </button>
        </div>
      }
    >
      <div className='space-y-3'>
        <div>
          <label className='mb-1 block text-xs font-medium text-gray-700'>
            Select reason
          </label>
          <Select
            value={rejectionReason}
            onValueChange={setRejectionReason}
            disabled={processing || loadingRejectionReasons}
            placeholder={loadingRejectionReasons ? 'Loading reasons...' : 'Choose a reason'}
            options={[
              ...rejectionReasons.map(reason => ({
                value: reason.label,
                label: reason.label
              })),
              { value: 'Other', label: 'Other (specify in notes)' }
            ]}
          />
        </div>
        <div>
          <label className='mb-1 block text-xs font-medium text-gray-700'>
            Additional details (optional)
          </label>
          <textarea
            rows={3}
            className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'
            placeholder={
              rejectionReason === 'Other'
                ? 'Required: explain why this application is rejected.'
                : 'Optional: add more context for this rejection (visible to staff only).'
            }
            value={rejectionComment}
            onChange={e => setRejectionComment(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}


