'use client'

import React from 'react'
import AdminDashboardLayout from './AdminDashboardLayout'
import DetailPageHeader from './DetailPageHeader'
import type { DetailPageHeaderProps } from './DetailPageHeader'
import Tabs, { Tab } from './Tabs'
import { detailPage, spacing } from '../design-system'

interface DetailPageLayoutProps {
  // Header props
  header: DetailPageHeaderProps
  
  // Tabs (optional)
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  tabVariant?: 'modern' | 'classic'
  tabSize?: 'sm' | 'md' | 'lg'
  tabActiveColor?: 'indigo' | 'purple' | 'blue'
  
  // Content
  children: React.ReactNode
  
  // Additional sections (e.g., action buttons)
  beforeTabs?: React.ReactNode
  
  // Content wrapper
  contentClassName?: string
  contentMaxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full'
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
}

export default function DetailPageLayout({
  header,
  tabs,
  activeTab,
  onTabChange,
  tabVariant = 'modern',
  tabSize = 'md',
  tabActiveColor = 'indigo',
  beforeTabs,
  children,
  contentClassName = '',
  contentMaxWidth = '7xl'
}: DetailPageLayoutProps) {
  return (
    <AdminDashboardLayout>
      <div className='flex flex-col'>
        {/* Header */}
        <DetailPageHeader {...header} />

        {/* Before Tabs Section (e.g., action buttons) */}
        {beforeTabs}

        {/* Tabs */}
        {tabs && activeTab && onTabChange && (
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            variant={tabVariant}
            size={tabSize}
            activeColor={tabActiveColor}
          />
        )}

        {/* Content */}
        <div className={detailPage.content.background}>
          <div
            className={`mx-auto ${maxWidthClasses[contentMaxWidth]} ${detailPage.content.padding} ${contentClassName}`}
          >
            {children}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

