'use client'

import * as React from 'react'
import Button from '@/src/app/[locale]/components/Button'
import { PreApproveApplicationModal } from './PreApproveApplicationModal'
import { sizes, spacing } from '../design-system'
import { RejectApplicationModal } from '../applications/[id]/components/RejectApplicationModal'

interface ApplicationActionsProps {
  applicationId: string
  applicationStatus: string
  defaultLoanAmount?: number
  onActionComplete?: () => Promise<void> | void
  size?: 'sm' | 'md' | 'lg'
}

export function ApplicationActions({
  applicationId,
  applicationStatus,
  defaultLoanAmount,
  onActionComplete,
  size = 'sm'
}: ApplicationActionsProps) {
  const [showApproveModal, setShowApproveModal] = React.useState(false)
  const [showRejectModal, setShowRejectModal] = React.useState(false)

  // Only show actions for pending or processing statuses
  const shouldShowActions =
    applicationStatus === 'pending' || applicationStatus === 'processing'

  if (!shouldShowActions) {
    return null
  }

  const buttonSize = sizes.button[size]
  const gapClass = spacing.gap[size === 'sm' ? 'xs' : 'sm']

  return (
    <>
      <div className={`flex items-center ${gapClass}`}>
        <Button
          onClick={() => setShowApproveModal(true)}
          className={`rounded-lg border border-gray-900 bg-gradient-to-r from-gray-900 to-gray-800 ${buttonSize.padding} ${buttonSize.text} font-semibold text-white transition-all hover:shadow-lg`}
        >
          Pre-Approve Application
        </Button>
        <Button
          onClick={() => setShowRejectModal(true)}
          className={`rounded-lg border border-red-300 bg-white ${buttonSize.padding} ${buttonSize.text} font-semibold text-red-700 transition-colors hover:bg-red-50`}
        >
          Reject Application
        </Button>
      </div>

      <PreApproveApplicationModal
        applicationId={applicationId}
        defaultAmount={defaultLoanAmount}
        open={showApproveModal}
        onOpenChange={setShowApproveModal}
        onPreApproved={onActionComplete}
      />

      <RejectApplicationModal
        applicationId={applicationId}
        open={showRejectModal}
        onOpenChange={setShowRejectModal}
        onRejected={onActionComplete}
      />
    </>
  )
}

