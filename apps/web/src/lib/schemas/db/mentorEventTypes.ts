import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { mentorEventType } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(mentorEventType, ['id', 'createdAt', 'updatedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(mentorEventType, [
    'title',
    'description',
    'duration',
    'calcomEventTypeId',
    'mentorUserId',
  ]),
}

export const selectMentorEventTypeSchema = createSelectSchema(mentorEventType)
export const insertMentorEventTypeSchema = createInsertSchema(mentorEventType, insertExcludedFields)
export const updateMentorEventTypeSchema = createUpdateSchema(mentorEventType, updateExcludedFields)

export type MentorEventType = z.infer<typeof selectMentorEventTypeSchema>
export type NewMentorEventType = Omit<
  z.infer<typeof insertMentorEventTypeSchema>,
  keyof typeof insertExcludedFields
>
export type UpdateMentorEventType = Omit<
  z.infer<typeof updateMentorEventTypeSchema>,
  keyof typeof updateExcludedFields
>
