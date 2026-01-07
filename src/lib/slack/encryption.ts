import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

// Get encryption key from environment, pad/truncate to 32 bytes
function getKey(): Buffer {
  const key = process.env.SLACK_TOKEN_ENCRYPTION_KEY || ''

  if (!key && process.env.NODE_ENV === 'production') {
    console.warn('SLACK_TOKEN_ENCRYPTION_KEY not set in production!')
  }

  // Pad or truncate to 32 bytes for AES-256
  const keyBuffer = Buffer.from(key, 'utf-8')
  if (keyBuffer.length < 32) {
    return Buffer.concat([keyBuffer, Buffer.alloc(32 - keyBuffer.length)])
  }
  return keyBuffer.slice(0, 32)
}

export function encryptToken(token: string): string {
  // Skip encryption in development for easier debugging
  if (process.env.NODE_ENV === 'development') {
    return token
  }

  const iv = crypto.randomBytes(16)
  const key = getKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptToken(encryptedToken: string): string {
  // Handle plain tokens in development
  if (process.env.NODE_ENV === 'development' && !encryptedToken.includes(':')) {
    return encryptedToken
  }

  const parts = encryptedToken.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format')
  }

  const [ivHex, authTagHex, encrypted] = parts

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = getKey()

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
