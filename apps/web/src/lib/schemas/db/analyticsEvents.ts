import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { analyticEvent } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(analyticEvent, ['id', 'createdAt', 'updatedAt']),
}

const insertExcludedFields = {
  ...excludeFields(analyticEvent, ['id', 'createdAt', 'updatedAt', 'processed', 'deletedAt']),
}

export const selectAnalyticsEventSchema = createSelectSchema(analyticEvent)
export const insertAnalyticsEventSchema = createInsertSchema(analyticEvent, insertExcludedFields)
export const updateAnalyticsEventSchema = createUpdateSchema(analyticEvent, excludedFields)

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
