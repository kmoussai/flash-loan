import Link from 'next/link'

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
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
          </p>
        </div>
        
        <div className='space-y-4'>
          <Link href='/' className='block w-full'>
            <button className='w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors'>
              Go to homepage
            </button>
          </Link>
          
          <Link href='/contact' className='block w-full'>
            <button className='w-full px-6 py-3 bg-transparent text-primary rounded-lg font-medium border border-primary hover:bg-primary hover:text-white transition-colors'>
              Contact us
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
