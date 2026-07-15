export * from './user'
export * from './reference'
export * from './mentor'
export * from './post'
export * from './booking'
export * from './payment'
export * from './analytics'
export * from './webhook'

import {
  account,
  anonymousUserLink,
  session,
  user,
  userMajor,
  userProfile,
  userSchool,
  verification,
} from './user'
import { major, school } from './reference'
import { mentorEventType, mentorReview, mentorStripeAccount, calcomToken } from './mentor'
import { post } from './post'
import {
  booking,
  bookingAttendee,
  bookingOrganizer,
  calcomBookingLifecycle,
  checkoutSlotReservation,
} from './booking'
import { payment } from './payment'
import { analyticEvent } from './analytics'
import { calcomWebhookCleanup, calcomWebhookInbox, stripeWebhookInbox } from './webhook'

export const allTables = {
  user,
  anonymousUserLink,
  session,
  account,
  verification,
  post,
  userProfile,
  userMajor,
  userSchool,
  major,
  school,
  mentorReview,
  calcomToken,
  mentorStripeAccount,
  mentorEventType,
  booking,
  bookingAttendee,
  bookingOrganizer,
  calcomBookingLifecycle,
  checkoutSlotReservation,
  payment,
  analyticEvent,
  calcomWebhookCleanup,
  calcomWebhookInbox,
  stripeWebhookInbox,
} as const

export const tables = Object.values(allTables)
