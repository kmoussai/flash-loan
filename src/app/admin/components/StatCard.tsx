'use client'

import React from 'react'
import { spacing, typography, colors } from '../design-system'

interface StatCardProps {
  label: string
  value: string | number | React.ReactNode
  gradient?: 'indigo' | 'emerald' | 'amber' | 'teal' | 'blue' | 'purple' | 'rose' | 'cyan' | 'none'
  valueSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  valueWeight?: 'normal' | 'medium' | 'semibold' | 'bold'
  className?: string
  valueClassName?: string
  capitalize?: boolean
}

const gradientClasses = {
  indigo: 'bg-gradient-to-br from-indigo-50 to-purple-50',
  emerald: 'bg-gradient-to-br from-emerald-50 to-teal-50',
  amber: 'bg-gradient-to-br from-amber-50 to-orange-50',
  teal: 'bg-gradient-to-br from-teal-50 to-cyan-50',
  blue: 'bg-gradient-to-br from-blue-50 to-indigo-50',
  purple: 'bg-gradient-to-br from-purple-50 to-pink-50',
  rose: 'bg-gradient-to-br from-rose-50 to-pink-50',
  cyan: 'bg-gradient-to-br from-cyan-50 to-blue-50',
  none: 'bg-white'
}

const valueSizeClasses = {
  sm: typography.fontSize.sm,      // text-xs
  md: typography.fontSize.base,    // text-sm
  lg: typography.fontSize.lg,      // text-lg
  xl: typography.fontSize.xl,      // text-xl
  '2xl': typography.fontSize['2xl'], // text-2xl
  '3xl': typography.fontSize['3xl']   // text-3xl
}

const valueWeightClasses = {
  normal: typography.fontWeight.normal,
  medium: typography.fontWeight.medium,
  semibold: typography.fontWeight.semibold,
  bold: typography.fontWeight.bold
}

export default function StatCard({
  label,
  value,
  gradient = 'none',
  valueSize = 'md',
  valueWeight = 'bold',
  className = '',
  valueClassName = '',
  capitalize = false
}: StatCardProps) {
  const gradientClass = gradientClasses[gradient]
  const valueSizeClass = valueSizeClasses[valueSize]
  const valueWeightClass = valueWeightClasses[valueWeight]

  return (
    <div
      className={`rounded-lg border ${colors.border.default} ${gradientClass} ${spacing.card.sm} ${className}`}
    >
      <label className={`${typography.fontSize.xs} ${typography.fontWeight.semibold} uppercase tracking-wide ${colors.text.tertiary}`}>
        {label}
      </label>
      <p
        className={`mt-1 ${valueSizeClass} ${valueWeightClass} ${colors.text.primary} ${capitalize ? 'capitalize' : ''} ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  )
}

