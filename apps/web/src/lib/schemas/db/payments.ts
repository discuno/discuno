import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { payments } from '~/server/db/schema'

const insertExcludedFields = {
  ...excludeFields(payments, ['id', 'createdAt', 'updatedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(payments, [
    'stripePaymentIntentId',
    'stripeCheckoutSessionId',
    'mentorUserId',
    'customerEmail',
    'customerName',
    'amount',
    'currency',
    'mentorFee',
    'mentorAmount',
  ]),
}

export const selectPaymentSchema = createSelectSchema(payments)
export const insertPaymentSchema = createInsertSchema(payments, insertExcludedFields)
export const updatePaymentSchema = createUpdateSchema(payments, updateExcludedFields)

export type Payment = z.infer<typeof selectPaymentSchema>
export type NewPayment = Omit<
  z.infer<typeof insertPaymentSchema>,
  keyof typeof insertExcludedFields
>
export type UpdatePayment = Omit<
  z.infer<typeof updatePaymentSchema>,
  keyof typeof updateExcludedFields
>
