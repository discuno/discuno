import { Redis } from '@upstash/redis'
import { env } from '~/env'

if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
  throw new Error('Missing Upstash Redis environment variables')
}

export const redis = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
})
