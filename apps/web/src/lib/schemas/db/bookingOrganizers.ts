import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { bookingOrganizers } from '~/server/db/schema'

const excludedFields = {
  ...excludeFields(bookingOrganizers, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
}

export const selectBookingOrganizerSchema = createSelectSchema(bookingOrganizers)
export const insertBookingOrganizerSchema = createInsertSchema(bookingOrganizers, excludedFields)

export type BookingOrganizer = z.infer<typeof insertBookingOrganizerSchema>
export type NewBookingOrganizer = Omit<
  z.infer<typeof insertBookingOrganizerSchema>,
  keyof typeof excludedFields
>
