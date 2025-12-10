import React from 'react'

interface FeatureCardProps {
  number: string
  title: string
  description: string
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  number,
  title,
  description
}) => {
  return (
    <div className='group rounded-xl bg-white p-8 text-center border border-gray-200 transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-1'>
      <div className='mb-6 flex justify-center'>
        <div className='flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary transition-transform group-hover:scale-110'>
          {number}
        </div>
      </div>
      <h3 className='mb-4 text-xl font-semibold text-gray-900'>
        {title}
      </h3>
      <p className='text-gray-600 leading-relaxed'>
        {description}
      </p>
    </div>
  )
}


