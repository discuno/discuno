import { createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { major } from '~/server/db/schema'

export const selectMajorSchema = createSelectSchema(major)

export type Major = z.infer<typeof selectMajorSchema>
