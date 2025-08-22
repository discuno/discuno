import { createSelectSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { schools } from '~/server/db/schema'

export const selectSchoolSchema = createSelectSchema(schools)

export type School = z.infer<typeof selectSchoolSchema>
