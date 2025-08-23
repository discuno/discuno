import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { mentorEventTypes } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(mentorEventTypes, ['id', 'createdAt', 'updatedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(mentorEventTypes, [
    'title',
    'description',
    'duration',
    'calcomEventTypeId',
    'mentorUserId',
  ]),
}

export const selectMentorEventTypeSchema = createSelectSchema(mentorEventTypes)
export const insertMentorEventTypeSchema = createInsertSchema(
  mentorEventTypes,
  insertExcludedFields
)
export const updateMentorEventTypeSchema = createUpdateSchema(
  mentorEventTypes,
  updateExcludedFields
)

export type MentorEventType = z.infer<typeof selectMentorEventTypeSchema>
export type NewMentorEventType = Omit<
  z.infer<typeof insertMentorEventTypeSchema>,
  keyof typeof insertExcludedFields
>
export type UpdateMentorEventType = Omit<
  z.infer<typeof updateMentorEventTypeSchema>,
  keyof typeof updateExcludedFields
>
