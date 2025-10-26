import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { bookingOrganizer } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(bookingOrganizer, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

export const selectBookingOrganizerSchema = createSelectSchema(bookingOrganizer)
export const insertBookingOrganizerSchema = createInsertSchema(bookingOrganizer, excludedFields)

export type BookingOrganizer = z.infer<typeof insertBookingOrganizerSchema>
export type NewBookingOrganizer = Omit<
  z.infer<typeof insertBookingOrganizerSchema>,
  keyof typeof excludedFields
>
