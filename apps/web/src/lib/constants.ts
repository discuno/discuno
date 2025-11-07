/**
 * Pricing constants
 */

/**
 * Minimum price for paid bookings in cents ($5.00)
 */
export const MINIMUM_PAID_BOOKING_PRICE = 500

/**
 * Cal.com API versions
 * These should match the API version being used by Cal.com
 */
export const CALCOM_API_VERSION_2024_06_14 = '2024-06-14' as const
export const CALCOM_API_VERSION_2024_08_13 = '2024-08-13' as const

// Use the latest version as default
export const CALCOM_API_VERSION = CALCOM_API_VERSION_2024_08_13

/**
 * Stripe constants
 */
export const STRIPE_MERCHANT_CATEGORY_CODE = '8299' as const // Educational services

/**
 * Cache tags for Next.js revalidation
 */
export const CACHE_TAGS = {
  POSTS: 'posts',
  PROFILES: 'profiles',
  BOOKINGS: 'bookings',
  PAYMENTS: 'payments',
} as const
