'use client'

import { useEffect } from 'react'
import Button from './components/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className='min-h-screen bg-background flex items-center justify-center'>
      <div className='max-w-md mx-auto text-center px-6'>
        <div className='mb-8'>
          <h1 className='text-6xl font-bold text-primary mb-4'>⚠️</h1>
          <h2 className='text-3xl font-bold text-primary mb-4'>
            Something went wrong!
          </h2>
          <p className='text-lg text-text-secondary mb-8'>
            We apologize for the inconvenience. An unexpected error occurred.
          </p>
        </div>
        
        <div className='space-y-4'>
          <Button
            onClick={reset}
            variant='primary'
            size='large'
            className='w-full'
          >
            Try again
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant='secondary'
            size='large'
            className='w-full'
          >
            Go to homepage
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className='mt-8 text-left'>
            <summary className='cursor-pointer text-sm text-text-secondary hover:text-primary'>
              Error Details (Development)
            </summary>
            <pre className='mt-2 p-4 bg-background-secondary rounded-lg text-xs text-text-secondary overflow-auto'>
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
