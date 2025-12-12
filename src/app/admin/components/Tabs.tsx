'use client'

import React from 'react'
import { sizes, spacing, typography } from '../design-system'

export interface Tab {
  id: string
  label: string
  icon?: string | React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: 'modern' | 'classic'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  tabClassName?: string
  activeColor?: 'indigo' | 'purple' | 'blue'
}

const sizeClasses = {
  sm: {
    container: spacing.container.sm.split(' ')[0], // px-4
    button: `${sizes.button.sm.padding} ${sizes.button.sm.text} ${spacing.gap.xs}`,
    icon: sizes.button.sm.text
  },
  md: {
    container: spacing.container.md.split(' ')[0], // px-6
    button: `${sizes.button.md.padding} ${sizes.button.md.text} ${spacing.gap.sm}`,
    icon: sizes.button.md.text
  },
  lg: {
    container: spacing.container.md.split(' ')[0], // px-6
    button: `${sizes.button.lg.padding} ${sizes.button.lg.text} ${spacing.gap.sm}`,
    icon: sizes.button.lg.text
  }
}

const activeColorClasses = {
  indigo: {
    active: 'text-indigo-600',
    indicator: 'bg-gradient-to-r from-indigo-600 to-purple-600',
    classicActive: 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
  },
  purple: {
    active: 'text-purple-600',
    indicator: 'bg-gradient-to-r from-purple-600 to-pink-600',
    classicActive: 'border-purple-500 bg-purple-50/50 text-purple-700'
  },
  blue: {
    active: 'text-blue-600',
    indicator: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    classicActive: 'border-blue-500 bg-blue-50/50 text-blue-700'
  }
}

export default function Tabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'modern',
  size = 'md',
  className = '',
  tabClassName = '',
  activeColor = 'indigo'
}: TabsProps) {
  const sizeConfig = sizeClasses[size]
  const colorConfig = activeColorClasses[activeColor]

  if (variant === 'classic') {
    return (
      <div className={`flex items-center gap-2 border-b border-gray-200 ${className}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === tab.id
                ? `border-b-2 ${colorConfig.classicActive}`
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            } ${tabClassName}`}
          >
            {typeof tab.icon === 'string' ? (
              <span className='mr-2'>{tab.icon}</span>
            ) : (
              tab.icon && <span className='mr-2'>{tab.icon}</span>
            )}
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`border-b border-gray-200 bg-white ${sizeConfig.container} ${className}`}>
      <div className='flex items-center gap-0.5'>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center ${sizeConfig.button} font-medium transition-colors ${
              activeTab === tab.id
                ? colorConfig.active
                : 'text-gray-600 hover:text-gray-900'
            } ${tabClassName}`}
          >
            {tab.icon && (
              <span className={typeof tab.icon === 'string' ? sizeConfig.icon : ''}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 ${colorConfig.indicator}`}
              ></span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

