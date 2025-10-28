export type FlinksVerificationStatus = 'pending' | 'verified' | 'failed' | 'cancelled'

export interface FlinksConnection {
  loginId: string
  requestId: string
  institution?: string
  verificationStatus?: FlinksVerificationStatus
}

export const FLINKS_DEMO_ORIGIN = 'https://demo.flinks.com'
export const FLINKS_STORAGE_KEY = 'flinksConnection'

export const FLINKS_IFRAME_CONFIG = {
  src: 'https://demo.flinks.com/v2/?headerEnable=false&demo=true',
  title: 'Flinks Connect Demo',
  allow: 'camera; microphone; geolocation',
  className: 'flinksconnect h-[500px] w-full sm:h-[600px] md:h-[650px]'
}

export function restoreFlinksConnection(): FlinksConnection | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(FLINKS_STORAGE_KEY)
  if (!stored) return null
  try {
    const connection = JSON.parse(stored)
    if (connection?.loginId && connection?.requestId) {
      return {
        loginId: connection.loginId,
        requestId: connection.requestId,
        institution: connection.institution,
        verificationStatus: 'verified'
      }
    }
    return null
  } catch {
    return null
  }
}

export function persistFlinksConnection(connection: FlinksConnection): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    FLINKS_STORAGE_KEY,
    JSON.stringify({ ...connection, connectedAt: new Date().toISOString() })
  )
}

type FlinksHandlers = {
  onSuccess: (connection: FlinksConnection) => void
  onError?: (data?: unknown) => void
  onCancel?: () => void
}

export function addFlinksListener(enabled: boolean, handlers: FlinksHandlers): () => void {
  if (typeof window === 'undefined' || !enabled) return () => {}

  const handleFlinksMessage = (event: MessageEvent) => {
    if (event.origin !== FLINKS_DEMO_ORIGIN) return
    if (!event.data || typeof event.data !== 'object') return

    const { step, ...data } = event.data as any
    switch (step) {
      case 'REDIRECT': {
        const loginId = (data as any).loginId
        const requestId = (data as any).requestId
        const institution = (data as any).institution || 'Unknown'
        if (loginId && requestId) {
          const connection: FlinksConnection = {
            loginId,
            requestId,
            institution,
            verificationStatus: 'verified'
          }
          handlers.onSuccess(connection)
        }
        break
      }
      case 'FLINKS_CONNECT_ERROR': {
        handlers.onError && handlers.onError(data)
        break
      }
      case 'FLINKS_CONNECT_CANCELLED': {
        handlers.onCancel && handlers.onCancel()
        break
      }
      default:
        break
    }
  }

  window.addEventListener('message', handleFlinksMessage)
  return () => window.removeEventListener('message', handleFlinksMessage)
}


