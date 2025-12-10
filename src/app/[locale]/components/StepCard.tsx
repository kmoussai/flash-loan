import React from 'react'
import { Link } from '@/src/navigation'
import { pathnames } from '@/src/navigation-config'
import Button from './Button'

type ValidRoute = keyof typeof pathnames

interface StepCardProps {
  icon: string
  title: string
  description: string
  ctaText: string
  ctaHref: ValidRoute
}

export const StepCard: React.FC<StepCardProps> = ({
  icon,
  title,
  description,
  ctaText,
  ctaHref
}) => {
  return (
    <div className='group rounded-xl bg-white p-8 border border-gray-200 transition-all hover:shadow-xl hover:border-primary/20 hover:-translate-y-2'>
      <div className='mb-6 flex justify-center'>
        <div className='h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110'>
          <span className='text-4xl'>{icon}</span>
        </div>
      </div>
      <h3 className='mb-4 text-xl font-semibold text-gray-900'>
        {title}
      </h3>
      <p className='mb-6 text-gray-600 leading-relaxed'>
        {description}
      </p>
      <Link href={ctaHref}>
        <Button variant='secondary' size='small' className='bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-200'>
          {ctaText}
        </Button>
      </Link>
    </div>
  )
}


