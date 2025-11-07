import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { type z } from 'zod/v4'
import { excludeFields } from '~/lib/schemas/db/helpers'
import { payment } from '~/server/db/schema/index'

const insertExcludedFields = {
  ...excludeFields(payment, ['id', 'createdAt', 'updatedAt']),
}

const updateExcludedFields = {
  ...insertExcludedFields,
  ...excludeFields(payment, [
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

export const selectPaymentSchema = createSelectSchema(payment)
export const insertPaymentSchema = createInsertSchema(payment, insertExcludedFields)
export const updatePaymentSchema = createUpdateSchema(payment, updateExcludedFields)

export type Payment = z.infer<typeof selectPaymentSchema>
export type NewPayment = Omit<
  z.infer<typeof insertPaymentSchema>,
  keyof typeof insertExcludedFields
>
export type UpdatePayment = Omit<
  z.infer<typeof updatePaymentSchema>,
  keyof typeof updateExcludedFields
>
