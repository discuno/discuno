export * from './user'
export * from './reference'
export * from './mentor'
export * from './post'
export * from './booking'
export * from './payment'
export * from './analytics'

import { account, session, user, userMajor, userProfile, userSchool, verification } from './user'
import { major, school } from './reference'
import { mentorEventType, mentorReview, mentorStripeAccount, calcomToken } from './mentor'
import { post } from './post'
import { booking, bookingAttendee, bookingOrganizer } from './booking'
import { payment } from './payment'
import { analyticEvent } from './analytics'

export const allTables = {
  user,
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
  payment,
  analyticEvent,
} as const

export const tables = Object.values(allTables)
