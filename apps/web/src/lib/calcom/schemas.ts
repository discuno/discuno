import { z } from 'zod'

const CalcomOrganizationProfileSchema = z.object({
  id: z.number().int(),
  organizationId: z.number().int(),
  userId: z.number().int(),
  username: z.string().nullable().optional(),
})

export const CalcomOrganizationUserSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  profile: CalcomOrganizationProfileSchema,
})

export const CreateCalcomUserResponseSchema = z.object({
  status: z.literal('success'),
  data: CalcomOrganizationUserSchema,
})

export const CalcomScheduleSchema = z.object({
  id: z.number().int(),
  ownerId: z.number().int(),
  name: z.string(),
  timeZone: z.string(),
  availability: z.array(
    z.object({
      days: z.array(
        z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      ),
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
  isDefault: z.boolean(),
  overrides: z.array(
    z.object({
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
})

export const GetCalcomSchedulesResponseSchema = z.object({
  status: z.literal('success'),
  data: z.array(CalcomScheduleSchema),
})

export type CalcomSchedule = z.infer<typeof CalcomScheduleSchema>

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
  'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

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
