import Stripe from 'stripe'
import { env } from '~/env'

// Create stripe instance only if the secret key is available
export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null

// Type guard to ensure stripe is available
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please check your STRIPE_SECRET_KEY environment variable.')
  }
  return stripe
}
