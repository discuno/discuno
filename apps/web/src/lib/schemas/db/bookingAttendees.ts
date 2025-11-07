import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { bookingAttendee } from '~/server/db/schema/index'

const excludedFields = {
  ...excludeFields(bookingAttendee, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

export const selectBookingAttendeeSchema = createSelectSchema(bookingAttendee)
export const insertBookingAttendeeSchema = createInsertSchema(bookingAttendee, excludedFields)

export type BookingAttendee = z.infer<typeof insertBookingAttendeeSchema>
export type NewBookingAttendee = Omit<
  z.infer<typeof insertBookingAttendeeSchema>,
  keyof typeof excludedFields
>
