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


