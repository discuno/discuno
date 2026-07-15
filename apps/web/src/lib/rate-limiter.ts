import { Ratelimit } from '@upstash/ratelimit'
import { AUTH_EMAIL_OTP_RECIPIENT_RATE_LIMIT } from '~/lib/auth/security'
import { redis } from '~/lib/redis'

export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
})

export const authOtpRecipientRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    AUTH_EMAIL_OTP_RECIPIENT_RATE_LIMIT.max,
    AUTH_EMAIL_OTP_RECIPIENT_RATE_LIMIT.window
  ),
  analytics: true,
  prefix: 'ratelimit:auth-otp-recipient',
})

export const freeBookingActorRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
  prefix: 'ratelimit:free-booking:actor',
})

export const freeBookingIpRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: true,
  prefix: 'ratelimit:free-booking:ip',
})

export const checkoutIpRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: true,
  prefix: 'ratelimit:checkout:ip',
})

export const slotLookupIpRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: 'ratelimit:calcom-slots:ip',
})
