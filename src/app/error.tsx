'use client'

import { useEffect } from 'react'

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
          }}>⚠️</h1>
          <h2 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: '#3b82f6',
            marginBottom: '1rem'
          }}>
            Something went wrong!
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: '#64748b',
            marginBottom: '2rem'
          }}>
            We apologize for the inconvenience. An unexpected error occurred.
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '500',
              width: '100%',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#3b82f6',
              border: '1px solid #3b82f6',
              borderRadius: '0.5rem',
              fontWeight: '500',
              width: '100%',
              cursor: 'pointer'
            }}
          >
            Go to homepage
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details style={{ marginTop: '2rem', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
              Error Details (Development)
            </summary>
            <pre style={{
              marginTop: '0.5rem',
              padding: '1rem',
              backgroundColor: '#f1f5f9',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#64748b',
              overflow: 'auto'
            }}>
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
