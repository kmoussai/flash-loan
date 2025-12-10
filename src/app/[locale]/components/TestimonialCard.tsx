import React from 'react'

interface TestimonialCardProps {
  text: string
  name: string
  title: string
  initials: string
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  text,
  name,
  title,
  initials
}) => {
  return (
    <div className='rounded-xl bg-white p-8 border border-gray-200 shadow-sm'>
      <div className='mb-4 flex text-yellow-400'>
        {'★★★★★'.split('').map((star, index) => (
          <span key={index}>{star}</span>
        ))}
      </div>
      <p className='mb-6 text-gray-700 leading-relaxed'>
        {text}
      </p>
      <div className='flex items-center'>
        <div className='mr-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center'>
          <span className='text-gray-800 font-semibold'>{initials}</span>
        </div>
        <div>
          <p className='font-semibold text-gray-900'>{name}</p>
          <p className='text-sm text-gray-600'>{title}</p>
        </div>
      </div>
    </div>
  )
}


