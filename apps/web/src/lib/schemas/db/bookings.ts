import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { bookings } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(bookings, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

export const selectBookingSchema = createSelectSchema(bookings)
export const insertBookingSchema = createInsertSchema(bookings, excludedFields)

export type Booking = z.infer<typeof insertBookingSchema>
export type NewBooking = Omit<z.infer<typeof insertBookingSchema>, keyof typeof excludedFields>
