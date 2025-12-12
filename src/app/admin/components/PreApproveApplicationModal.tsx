'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/src/app/components/Modal'

interface PreApproveApplicationModalProps {
  applicationId: string
  defaultAmount?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Optional callback invoked after a successful pre-approval.
   * Typically used to refresh application details in the parent.
   */
  onPreApproved?: () => Promise<void> | void
}

export function PreApproveApplicationModal({
  applicationId,
  defaultAmount,
  open,
  onOpenChange,
  onPreApproved
}: PreApproveApplicationModalProps) {
  const router = useRouter()
  const [processing, setProcessing] = React.useState(false)
  const [preApproveAmount, setPreApproveAmount] = React.useState<number | ''>(
    defaultAmount || ''
  )

  React.useEffect(() => {
    if (open && defaultAmount) {
      setPreApproveAmount(defaultAmount)
    }
  }, [open, defaultAmount])

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

      if (onPreApproved) {
        await onPreApproved()
      }

      // Reset local state and close modal
      setPreApproveAmount(defaultAmount || '')
      onOpenChange(false)
      alert('Application pre-approved and pending loan created.')

      // Navigate to the newly created loan if present
      if (data?.loan?.id) {
        router.push(`/admin/loan/${data.loan.id}`)
        return
      }
    } catch (err: any) {
      console.error('Error approving application:', err)
      alert(`Error: ${err.message || 'Failed to approve application'}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset local state when closing
      setPreApproveAmount(defaultAmount || '')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title='Pre-Approve Application'
      description='Set the pre-approved amount. A pending loan will be created.'
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
            onClick={handleApprove}
            disabled={processing}
            className='flex-1 rounded border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50'
          >
            {processing ? 'Processing...' : 'Confirm Pre-Approval'}
          </button>
        </div>
      }
    >
      <div className='space-y-3'>
        <div>
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
            disabled={processing}
            className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50'
          />
          {defaultAmount && (
            <p className='mt-1 text-[10px] text-gray-500'>
              Defaults to requested amount:{' '}
              {new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD'
              }).format(defaultAmount)}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}

