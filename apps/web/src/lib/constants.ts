/**
 * Pricing constants
 */

/**
 * Minimum price for paid bookings in cents ($5.00)
 */
export const MINIMUM_PAID_BOOKING_PRICE = 500

/** Maximum listed session price in cents ($10,000.00). */
export const MAXIMUM_PAID_BOOKING_PRICE = 1_000_000

/**
 * Hosted Checkout cannot expire in less than 30 minutes. Discuno keeps a
 * 35-minute payment window plus 10 minutes for the paid webhook/booking handoff.
 */
export const MINIMUM_PAID_BOOKING_LEAD_MINUTES = 45
