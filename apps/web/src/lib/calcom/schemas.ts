import { z } from 'zod'

/**
 * Cal.com calls this field `meetingUrl`, but current non-video bookings can
 * contain an address or phone number. Preserve only safe web URLs because the
 * local booking UI renders this value as an external link.
 */
export const CalcomSafeMeetingUrlSchema = z
  .preprocess(
    value => (typeof value === 'string' && !value.trim() ? undefined : value),
    z.string().trim().min(1).max(2_048).nullish()
  )
  .transform(value => {
    if (value == null) return value
    try {
      const url = new URL(value)
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
    } catch {
      return undefined
    }
  })

export const CalcomWebhookResourceSchema = z.object({
  // Cal.com v2 uses UUID strings. Numeric IDs are accepted only so existing
  // pre-v2 cleanup records can be normalized during the rollout.
  id: z.union([z.string().min(1), z.number().int().positive().transform(String)]),
  subscriberUrl: z.url(),
  active: z.boolean(),
})

export type CalcomWebhookResource = z.infer<typeof CalcomWebhookResourceSchema>

export const CalcomWebhookListResponseSchema = z.object({
  status: z.literal('success'),
  data: z.array(CalcomWebhookResourceSchema),
})

export const CalcomWebhookResponseSchema = z.object({
  status: z.literal('success'),
  data: CalcomWebhookResourceSchema,
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

export type DayOfWeek =
  'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
