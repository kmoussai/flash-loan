import crypto from 'crypto'

function getSecret(): string {
  const secret = process.env.DOCUMENT_REQUEST_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Missing DOCUMENT_REQUEST_SECRET')
  return secret
}

function base64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function signRequestToken(requestId: string, expiresAt: number): string {
  const secret = getSecret()
  const payload = `${requestId}:${expiresAt}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64')
  return base64url(`${payload}:${sig}`)
}

export function verifyRequestToken(token: string, requestId: string): boolean {
  try {
    const raw = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    const parts = raw.split(':')
    if (parts.length !== 3) return false
    const [req, expStr, sig] = parts
    if (req !== requestId) return false
    const exp = parseInt(expStr, 10)
    if (!exp || Date.now() > exp) return false
    const secret = getSecret()
    const expected = crypto.createHmac('sha256', secret).update(`${req}:${exp}`).digest('base64')
    // Constant-time string compare fallback
    if (sig.length !== expected.length) return false
    let result = 0
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    return result === 0
  } catch {
    return false
  }
}

/**
 * Sign an authentication token for a client user
 * This creates a reusable token that can be used to authenticate until expiry
 */
export function signAuthToken(clientId: string, expiresAt: number): string {
  const secret = getSecret()
  const payload = `auth:${clientId}:${expiresAt}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64')
  return base64url(`${payload}:${sig}`)
}

/**
 * Verify and extract client ID from authentication token
 * Returns { valid: boolean, clientId?: string, expiresAt?: number }
 */
export function verifyAuthToken(token: string): { valid: boolean; clientId?: string; expiresAt?: number } {
  try {
    const raw = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    const parts = raw.split(':')
    if (parts.length !== 4) return { valid: false } // auth:clientId:exp:signature
    
    const [prefix, clientId, expStr, sig] = parts
    if (prefix !== 'auth') return { valid: false }
    
    const exp = parseInt(expStr, 10)
    if (!exp || Date.now() > exp) return { valid: false }
    
    const secret = getSecret()
    const payload = `auth:${clientId}:${exp}`
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64')
    
    // Constant-time string compare
    if (sig.length !== expected.length) return { valid: false }
    let result = 0
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    
    if (result !== 0) return { valid: false }
    
    return { valid: true, clientId, expiresAt: exp }
  } catch {
    return { valid: false }
  }
}


