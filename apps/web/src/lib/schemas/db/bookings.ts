import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { booking } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(booking, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

export const selectBookingSchema = createSelectSchema(booking)
export const insertBookingSchema = createInsertSchema(booking, excludedFields)
export type Booking = z.infer<typeof insertBookingSchema>
export type NewBooking = Omit<z.infer<typeof insertBookingSchema>, keyof typeof excludedFields>
