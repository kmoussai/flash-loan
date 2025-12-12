'use client'

import React from 'react'
import BackButton from './BackButton'
import RefreshButton from './RefreshButton'
import StatusBadge from './StatusBadge'
import { detailPage } from '../design-system'

interface DetailPageHeaderProps {
  // Back button
  backHref: string
  backTitle?: string
  
  // Title section
  title: string
  subtitle?: string
  subtitlePrefix?: string
  
  // Actions
  onRefresh?: () => void
  refreshLoading?: boolean
  
  // Right side content
  rightContent?: React.ReactNode
  
  // Status badge
  status?: string
  statusVariant?: 'default' | 'compact' | 'large'
  statusType?: 'application' | 'kyc' | 'loan'
  
  // Layout
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function DetailPageHeader({
  backHref,
  backTitle,
  title,
  subtitle,
  subtitlePrefix,
  onRefresh,
  refreshLoading = false,
  rightContent,
  status,
  statusVariant = 'default',
  statusType,
  size = 'md',
  className = ''
}: DetailPageHeaderProps) {
  const sizeConfig = detailPage.header[size]

  return (
    <div
      className={`flex items-center justify-between border-b border-gray-200 bg-white ${sizeConfig.container} ${className}`}
    >
      <div className={`flex items-center ${sizeConfig.gap}`}>
        <BackButton href={backHref} title={backTitle} size={size} />
        {size === 'lg' ? (
          <div>
            <h1 className={sizeConfig.title}>{title}</h1>
            {subtitle && (
              <p className={`${sizeConfig.subtitle} mt-1 ${sizeConfig.subtitleText}`}>
                {subtitlePrefix && `${subtitlePrefix} `}
                {subtitle}
              </p>
            )}
          </div>
        ) : (
          <div className='flex items-center gap-1.5'>
            <h1 className={sizeConfig.title}>{title}</h1>
            {subtitle && (
              <>
                <span className={sizeConfig.subtitle}>•</span>
                {subtitlePrefix && (
                  <span className={sizeConfig.subtitle}>{subtitlePrefix}</span>
                )}
                <span className={sizeConfig.subtitleText}>{subtitle}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className={`flex items-center ${sizeConfig.gap}`}>
        {onRefresh && (
          <RefreshButton
            onClick={onRefresh}
            loading={refreshLoading}
            size={size}
          />
        )}
        {rightContent}
        {status && (
          <StatusBadge status={status} variant={statusVariant} statusType={statusType} />
        )}
      </div>
    </div>
  )
}

export type { DetailPageHeaderProps }