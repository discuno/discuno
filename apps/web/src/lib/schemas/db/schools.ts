import { createSelectSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { school } from '~/server/db/schema/index'

export const selectSchoolSchema = createSelectSchema(school)

export type School = z.infer<typeof selectSchoolSchema>
