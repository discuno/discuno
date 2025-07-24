'use client'

import { loadStripe } from '@stripe/stripe-js'
import { env } from '~/env'

// Memoize stripePromise at module level to avoid reloading on every render
export const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)
