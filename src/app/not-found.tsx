import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '28rem',
        margin: '0 auto',
        textAlign: 'center',
        padding: '1.5rem'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '3.75rem',
            fontWeight: 'bold',
            color: '#3b82f6',
            marginBottom: '1rem'
          }}>404</h1>
          <h2 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: '#3b82f6',
            marginBottom: '1rem'
          }}>
            Page Not Found
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: '#64748b',
            marginBottom: '2rem'
          }}>
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link href='/' style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontWeight: '500',
            width: '100%',
            textAlign: 'center'
          }}>
            Go to homepage
          </Link>
          
          <Link href='/contact' style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'transparent',
            color: '#3b82f6',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontWeight: '500',
            border: '1px solid #3b82f6',
            width: '100%',
            textAlign: 'center'
          }}>
            Contact us
          </Link>
        </div>
      </div>
    </div>
  )
}
