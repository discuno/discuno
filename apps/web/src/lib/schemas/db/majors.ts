import { createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { majors } from '~/server/db/schema'

export const selectMajorSchema = createSelectSchema(majors)

export type Major = z.infer<typeof selectMajorSchema>
