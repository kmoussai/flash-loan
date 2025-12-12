/**
 * Admin Design System
 * Centralized spacing, typography, and sizing constants
 * Update values here to change styling globally across all admin pages
 */

export const spacing = {
  // Container padding (matching application details page)
  container: {
    xs: 'px-2 py-1',
    sm: 'px-4 py-2',      // Header padding, section headers
    md: 'px-4 py-3',      // Content padding (matches application details)
    lg: 'px-6 py-4',
    xl: 'px-8 py-6'
  },
  
  // Card padding
  card: {
    sm: 'p-3',            // Standard card padding (matches application details)
    md: 'p-4',
    lg: 'p-5',
    xl: 'p-6'
  },
  
  // Gap between elements (matching application details page)
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',          // Standard gap (matches application details)
    lg: 'gap-4',
    xl: 'gap-6'
  },
  
  // Vertical spacing (matching application details page)
  vertical: {
    xs: 'space-y-0.5',
    sm: 'space-y-2.5',    // Form fields spacing
    md: 'space-y-3',      // Standard section spacing (matches application details)
    lg: 'space-y-4',
    xl: 'space-y-6'
  },
  
  // Margin/Padding values
  size: {
    xs: '0.25rem', // 1
    sm: '0.5rem',  // 2
    md: '0.75rem', // 3
    lg: '1rem',    // 4
    xl: '1.5rem',  // 6
    '2xl': '2rem', // 8
    '3xl': '3rem'  // 12
  }
} as const

export const typography = {
  // Font sizes (matching application details page)
  fontSize: {
    xs: 'text-[10px]',      // 10px - labels, badges (matches application details)
    sm: 'text-xs',          // 12px - small text, body content (matches application details)
    base: 'text-sm',        // 14px - section headings, buttons (matches application details)
    md: 'text-base',        // 16px - medium text
    lg: 'text-lg',          // 18px - large text
    xl: 'text-xl',          // 20px - large numbers (matches application details)
    '2xl': 'text-2xl',      // 24px - headings
    '3xl': 'text-3xl',      // 30px - large headings
    '4xl': 'text-4xl'       // 36px - extra large headings
  },
  
  // Font weights
  fontWeight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  },
  
  // Line heights
  lineHeight: {
    tight: 'leading-tight',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed'
  }
} as const

export const sizes = {
  // Button sizes (matching application details page)
  button: {
    xs: {
      padding: 'px-2.5 py-1.5',
      text: 'text-xs',
      icon: 'h-3.5 w-3.5'
    },
    sm: {
      padding: 'px-4 py-1.5',    // Matches application details buttons
      text: 'text-xs',
      icon: 'h-4 w-4'
    },
    md: {
      padding: 'px-4 py-2',
      text: 'text-sm',
      icon: 'h-4 w-4'
    },
    lg: {
      padding: 'px-6 py-3',
      text: 'text-base',
      icon: 'h-5 w-5'
    }
  },
  
  // Icon sizes
  icon: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  },
  
  // Badge sizes
  badge: {
    xs: {
      padding: 'px-1.5 py-0.5',
      text: 'text-[10px]'
    },
    sm: {
      padding: 'px-2 py-0.5',
      text: 'text-xs'
    },
    md: {
      padding: 'px-2.5 py-1',
      text: 'text-sm'
    },
    lg: {
      padding: 'px-4 py-2',
      text: 'text-xs'
    }
  }
} as const

export const detailPage = {
  // Header sizes
  header: {
    sm: {
      container: spacing.container.sm,
      title: `${typography.fontSize.base} ${typography.fontWeight.medium} text-gray-700`,
      subtitle: `${typography.fontSize.xs} text-gray-400`,
      subtitleText: `font-mono ${typography.fontSize.xs} text-gray-500`,
      gap: spacing.gap.sm
    },
    md: {
      container: spacing.container.md,
      title: `${typography.fontSize.md} ${typography.fontWeight.medium} text-gray-700`,
      subtitle: `${typography.fontSize.sm} text-gray-400`,
      subtitleText: `font-mono ${typography.fontSize.sm} text-gray-500`,
      gap: spacing.gap.sm
    },
    lg: {
      container: spacing.container.lg,
      title: `${typography.fontSize['3xl']} ${typography.fontWeight.bold} text-gray-900`,
      subtitle: `${typography.fontSize.sm} text-gray-500`,
      subtitleText: `font-mono ${typography.fontSize.sm} text-gray-500`,
      gap: spacing.gap.lg
    }
  },
  
  // Content spacing (matching application details page)
  content: {
    padding: 'px-4 py-3',        // Matches application details content padding
    maxWidth: 'max-w-7xl',
    background: 'bg-gray-50'
  },
  
  // Section spacing (matching application details page)
  section: {
    spacing: spacing.vertical.md,  // space-y-3
    gap: spacing.gap.md,            // gap-3
    cardPadding: spacing.card.sm    // p-3
  }
} as const

export const colors = {
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    tertiary: 'text-gray-600',
    muted: 'text-gray-500',
    disabled: 'text-gray-400'
  },
  
  background: {
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    tertiary: 'bg-gray-100'
  },
  
  border: {
    default: 'border-gray-200',
    light: 'border-gray-300',
    dark: 'border-gray-400'
  }
} as const

// Helper function to combine classes
export const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

