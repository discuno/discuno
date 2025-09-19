import { z } from 'zod'

import { type CalcomToken as DbCalcomToken } from '~/lib/schemas/db'

export const CalcomUserSchema = z
  .object({
    id: z.number().int(),
    email: z.string().email(),
    username: z.string(),
    name: z.string(),
    bio: z.string().nullable(),
    timeZone: z.string(),
    weekStart: z.string(),
    createdDate: z.string().datetime(),
    timeFormat: z.number(),
    defaultScheduleId: z.number().int().nullable(),
    locale: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
  })
  .strict()

export const CreateCalcomUserResponseDataSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: CalcomUserSchema,
    accessTokenExpiresAt: z.number(),
    refreshTokenExpiresAt: z.number(),
  })
  .strict()

export const CreateCalcomUserResponseSchema = z
  .object({
    status: z.literal('success'),
    data: CreateCalcomUserResponseDataSchema,
  })
  .strict()

export type CreateCalcomUserResponse = z.infer<typeof CreateCalcomUserResponseSchema>

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
