import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { analyticsEvents } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(analyticsEvents, ['id', 'createdAt', 'updatedAt']),
}

export const selectAnalyticsEventSchema = createSelectSchema(analyticsEvents)
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents, excludedFields)
export const updateAnalyticsEventSchema = createUpdateSchema(analyticsEvents, excludedFields)

export type AnalyticsEvent = z.infer<typeof selectAnalyticsEventSchema>
export type NewAnalyticsEvent = Omit<
  z.infer<typeof insertAnalyticsEventSchema>,
  keyof typeof excludedFields
>
export type UpdateAnalyticsEvent = Omit<
  z.infer<typeof updateAnalyticsEventSchema>,
  keyof typeof excludedFields
>
