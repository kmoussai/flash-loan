import Link from 'next/link'
import Button from './components/Button'

export default function NotFound() {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center'>
      <div className='max-w-md mx-auto text-center px-6'>
        <div className='mb-8'>
          <h1 className='text-6xl font-bold text-primary mb-4'>404</h1>
          <h2 className='text-3xl font-bold text-primary mb-4'>
            Page Not Found
          </h2>
          <p className='text-lg text-text-secondary mb-8'>
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className='space-y-4'>
          <Link href='/'>
            <Button
              variant='primary'
              size='large'
              className='w-full'
            >
              Go to homepage
            </Button>
          </Link>
          
          <Link href='/contact'>
            <Button
              variant='secondary'
              size='large'
              className='w-full'
            >
              Contact us
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
