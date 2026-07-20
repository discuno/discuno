import 'server-only'

import Stripe from 'stripe'
import { env } from '~/env'

/**
 * Keep Stripe behavior stable across SDK upgrades. Stripe's Node SDK otherwise
 * defaults to the API version bundled with whichever package version is installed.
 */
export const STRIPE_API_VERSION = '2026-06-24.dahlia' as const

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  appInfo: {
    name: 'Discuno',
    version: '0.1.0',
    url: 'https://discuno.com',
  },
})
