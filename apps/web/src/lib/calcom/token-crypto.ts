import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '~/env'

const TOKEN_VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

const decodeKey = (encoded: string): Buffer => {
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== KEY_LENGTH) {
    throw new Error('CALCOM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  return key
}

const getAdditionalData = (userId: string) =>
  Buffer.from(`discuno:calcom-oauth:${TOKEN_VERSION}:${userId}`, 'utf8')

export const encryptCalcomToken = (plaintext: string, userId: string): string => {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, decodeKey(env.CALCOM_TOKEN_ENCRYPTION_KEY), iv)
  cipher.setAAD(getAdditionalData(userId))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    TOKEN_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')
}

const decryptWithKey = (encrypted: string, userId: string, key: Buffer): string => {
  const [version, encodedIv, encodedTag, encodedCiphertext, ...unexpected] = encrypted.split('.')
  if (
    version !== TOKEN_VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedCiphertext ||
    unexpected.length > 0
  ) {
    throw new Error('Stored Cal.com credential has an unsupported format')
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(encodedIv, 'base64url'))
  decipher.setAAD(getAdditionalData(userId))
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export const decryptCalcomToken = (encrypted: string, userId: string): string => {
  const keys = [env.CALCOM_TOKEN_ENCRYPTION_KEY, env.CALCOM_TOKEN_ENCRYPTION_KEY_PREVIOUS].filter(
    (value): value is string => Boolean(value)
  )

  for (const encodedKey of keys) {
    try {
      return decryptWithKey(encrypted, userId, decodeKey(encodedKey))
    } catch {
      // Continue to the previous rotation key. The caller receives one redacted
      // error if none of the configured keys can decrypt the credential.
    }
  }

  throw new Error('Stored Cal.com credential could not be decrypted')
}
