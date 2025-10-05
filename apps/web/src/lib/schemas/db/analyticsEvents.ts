import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { analyticsEvents } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(analyticsEvents, ['id', 'createdAt', 'updatedAt']),
}

const insertExcludedFields = {
  ...excludeFields(analyticsEvents, ['id', 'createdAt', 'updatedAt', 'processed', 'deletedAt']),
}

export const selectAnalyticsEventSchema = createSelectSchema(analyticsEvents)
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents, insertExcludedFields)
export const updateAnalyticsEventSchema = createUpdateSchema(analyticsEvents, excludedFields)

export type AnalyticsEvent = z.infer<typeof selectAnalyticsEventSchema>
export type NewAnalyticsEvent = Omit<
  z.infer<typeof insertAnalyticsEventSchema>,
  keyof typeof insertExcludedFields
>
export type UpdateAnalyticsEvent = Omit<
  z.infer<typeof updateAnalyticsEventSchema>,
  keyof typeof excludedFields
>

export interface ClientAnalyticsEvent {
  eventType: NewAnalyticsEvent['eventType']
  targetUserId: string
  postId?: number
  distinctId: string
}
