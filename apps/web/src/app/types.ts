export interface Card {
  id: number | undefined
  userImage?: string | null
  name?: string | null
  description?: string | null
  createdById: string | undefined
  graduationYear?: number | null
  schoolYear?: string | null
  school?: string | null
  major?: string | null
  createdAt: Date | undefined
  updatedAt?: Date | null
  deletedAt?: Date | null
}

export interface PostGridProps {
  posts: Card[]
  schoolId: number | null
  majorId: number | null
  graduationYear: number | null
}

export interface UserProfile {
  id: number
  updatedAt: Date | null
  createdAt: Date
  deletedAt: Date | null
  userId: string
  bio: string | null
  schoolYear: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'
  graduationYear: number
  eduEmail: string | null
  isEduVerified: boolean
}

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

export interface CalcomToken {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}

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
  id: number
  userProfileId: number
  email: string | null
  emailVerified: boolean
  bio: string | null
  schoolYear: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'
  graduationYear: number
  eduEmail: string | null
  isEduVerified: boolean
  image: string | null
  name: string | null
  school: string | null
  major: string | null
  calcomUserId: number | null
  calcomUsername: string | null
  accessToken: string | null
  refreshToken: string | null
}
