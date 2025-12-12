'use client'

import React from 'react'
import { sizes, typography } from '../design-system'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'compact' | 'large'
  className?: string
  statusType?: 'application' | 'kyc' | 'loan'
}

// KYC statuses (use gradients)
const kycStatusColorMap: Record<string, string> = {
  verified: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
  pending: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  rejected: 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
}

// Application and loan statuses
const statusColorMap: Record<string, string> = {
  // Application statuses
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  processing: 'bg-blue-50 text-blue-700 border border-blue-200',
  pre_approved: 'bg-green-50 text-green-700 border border-green-200',
  contract_pending: 'bg-purple-50 text-purple-700 border border-purple-200',
  contract_signed: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  cancelled: 'bg-gray-50 text-gray-600 border border-gray-200',
  
  // Loan statuses
  active: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  defaulted: 'bg-red-100 text-red-800',
  
  // Default
  default: 'bg-gray-50 text-gray-900 border border-gray-200'
}

const variantClasses = {
  default: `inline-flex rounded ${sizes.badge.xs.padding} ${sizes.badge.xs.text} ${typography.fontWeight.medium} uppercase tracking-wide`,
  compact: `inline-flex rounded ${sizes.badge.xs.padding} ${sizes.badge.xs.text} ${typography.fontWeight.medium} uppercase tracking-wide`,
  large: `inline-flex items-center rounded-full ${sizes.badge.lg.padding} ${sizes.badge.lg.text} ${typography.fontWeight.bold} uppercase tracking-wide shadow-md`
}

// KYC statuses that use gradients (no border)
const kycStatuses = ['verified', 'pending', 'rejected']

const formatStatusLabel = (status: string): string => {
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function StatusBadge({
  status,
  variant = 'default',
  className = '',
  statusType
}: StatusBadgeProps) {
  const statusKey = status.toLowerCase()
  
  // Determine status type: use prop if provided, otherwise infer from status value
  // 'verified' is unique to KYC, so we can infer it
  const inferredType: 'application' | 'kyc' | 'loan' = statusType || 
    (statusKey === 'verified' ? 'kyc' : 
     (statusKey === 'active' || statusKey === 'paid' || statusKey === 'defaulted' ? 'loan' : 'application'))
  
  const isKycStatus = inferredType === 'kyc'
  
  const colorClass = isKycStatus && kycStatusColorMap[statusKey]
    ? kycStatusColorMap[statusKey]
    : statusColorMap[statusKey] || statusColorMap.default
  
  const variantClass = variantClasses[variant]
  
  // For KYC gradient statuses, don't add border classes
  const isGradient = isKycStatus && kycStatuses.includes(statusKey)
  const finalColorClass = isGradient 
    ? colorClass 
    : colorClass.includes('border') 
      ? colorClass 
      : `${colorClass} border`

  return (
    <span className={`${variantClass} ${finalColorClass} ${className}`}>
      {formatStatusLabel(status)}
    </span>
  )
}

