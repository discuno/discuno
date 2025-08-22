import {
  type Booking as DbBooking,
  type BookingAttendee as DbBookingAttendee,
  type BookingOrganizer as DbBookingOrganizer,
  type CalcomToken as DbCalcomToken,
  type UserProfile as DbUserProfile,
  type Post,
} from '~/lib/schemas/db'

export interface Card extends Post {
  userImage?: string | null
  schoolYear?: string | null
  school?: string | null
  major?: string | null
  graduationYear?: number | null
}

export interface PostGridProps {
  posts: Card[]
  schoolId: number | null
  majorId: number | null
  graduationYear: number | null
}

export type UserProfile = DbUserProfile

export interface UserProfileWithImage extends UserProfile {
  user: {
    image: string | null
  }
}

export interface DayAvailability {
  mentorId: string
  day: string
  startTime: Date
  endTime: Date
}

export interface TimeRange {
  day: Date
  startTime: string
  endTime: string
}

export interface Toast {
  title: string
  description: string
  variant: 'success' | 'error'
}

export type CalcomToken = DbCalcomToken

export interface CalcomTokenWithId extends CalcomToken {
  userId: string
  calcomUserId: number
  calcomUsername: string
}

export type CalcomLocale =
  | 'ar'
  | 'ca'
  | 'de'
  | 'es'
  | 'eu'
  | 'he'
  | 'id'
  | 'ja'
  | 'lv'
  | 'pl'
  | 'ro'
  | 'sr'
  | 'th'
  | 'vi'
  | 'az'
  | 'cs'
  | 'el'
  | 'es-419'
  | 'fi'
  | 'hr'
  | 'it'
  | 'km'
  | 'nl'
  | 'pt'
  | 'ru'
  | 'sv'
  | 'tr'
  | 'zh-CN'
  | 'bg'
  | 'da'
  | 'en'
  | 'et'
  | 'fr'
  | 'hu'
  | 'iw'
  | 'ko'
  | 'no'
  | 'pt-BR'
  | 'sk'
  | 'ta'
  | 'uk'
  | 'zh-TW'

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

export interface CreateCalcomUserInput {
  userId: string
  email: string
  name: string
  timeFormat?: '12' | '24'
  weekStart?: DayOfWeek
  timeZone?: string
  locale?: CalcomLocale
  avatarUrl?: string
  bio?: string
  metadata?: Record<string, string | number | boolean>
}

export interface UpdateCalcomUserInput extends Partial<CreateCalcomUserInput> {
  userId: string
  calcomUserId: number
}

export interface FullUserProfile {
  userId: string
  userProfileId: number
  email: string | null
  emailVerified: boolean
  bio: string | null
  schoolYear: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'
  graduationYear: number
  image: string | null
  name: string | null
  school: string | null
  major: string | null
  calcomUserId: number | null
  calcomUsername: string | null
  accessToken: string | null
  refreshToken: string | null
}

// Booking related types
export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'rescheduled'

export type BookingAttendee = DbBookingAttendee

export type BookingOrganizer = DbBookingOrganizer

export interface Booking extends DbBooking {
  attendees: BookingAttendee[]
  organizers: BookingOrganizer[]
}

export interface BookingWithMentor extends Booking {
  mentor: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  eventType: {
    id: number
    calcomEventTypeId: number
    title: string
    description: string | null
    duration: number
  }
}

export interface BookingWithEventType extends Booking {
  eventType: {
    id: number
    calcomEventTypeId: number
    title: string
    description: string | null
    duration: number
  }
}
