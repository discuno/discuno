import { type PgTable } from 'drizzle-orm/pg-core'
import { z } from 'zod/v4'

export const excludeFields = <T extends PgTable, K extends keyof T['_']['columns']>(
  _table: T,
  fields: K[]
) => Object.fromEntries(fields.map(key => [key, z.undefined()])) as { [P in K]: z.ZodUndefined }
