import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { bookingAttendees } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(bookingAttendees, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

export const selectBookingAttendeeSchema = createSelectSchema(bookingAttendees)
export const insertBookingAttendeeSchema = createInsertSchema(bookingAttendees, excludedFields)

export type BookingAttendee = z.infer<typeof insertBookingAttendeeSchema>
export type NewBookingAttendee = Omit<
  z.infer<typeof insertBookingAttendeeSchema>,
  keyof typeof excludedFields
>
