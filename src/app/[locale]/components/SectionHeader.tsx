import React from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  className = ''
}) => {
  return (
    <div className={`mb-section text-center ${className}`}>
      <h2 className='mb-content text-4xl font-bold text-gray-900'>
        {title}
      </h2>
      {subtitle && (
        <p className='text-xl text-gray-600'>
          {subtitle}
        </p>
      )}
    </div>
  )
}


