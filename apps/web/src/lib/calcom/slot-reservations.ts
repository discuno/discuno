import 'server-only'

import { z } from 'zod'
import { CALCOM_API_VERSIONS, calcomRequest } from '~/lib/calcom/client'
import { CALCOM_CHECKOUT_RESERVATION_MINUTES } from '~/lib/calcom/reservation-policy'
import { ExternalApiError } from '~/lib/errors'

export {
  CALCOM_CHECKOUT_RESERVATION_MINUTES,
  CALCOM_RESERVATION_ACQUISITION_AMBIGUITY_MINUTES,
} from '~/lib/calcom/reservation-policy'

// Stripe requires hosted Checkout Sessions to remain open for at least 30
// minutes. Keep a wider provider hold so network/DB latency cannot leave a
// still-payable Checkout without Discuno's temporary Cal.com race guard.
const SlotReservationResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    eventTypeId: z.number().int().positive(),
    slotStart: z.iso.datetime({ offset: true }),
    slotEnd: z.iso.datetime({ offset: true }),
    slotDuration: z.number().int().positive(),
    reservationUid: z.uuid(),
    reservationDuration: z.number().int().positive(),
    reservationUntil: z.iso.datetime({ offset: true }),
  }),
})

const GetSlotReservationResponseSchema = z.object({
  status: z.literal('success'),
  data: SlotReservationResponseSchema.shape.data.omit({ reservationDuration: true }).nullable(),
})

const DeleteSlotReservationResponseSchema = z.object({ status: z.literal('success') })

export type CalcomSlotReservation = z.infer<typeof SlotReservationResponseSchema>['data']
export type CalcomReservedSlot = NonNullable<
  z.infer<typeof GetSlotReservationResponseSchema>['data']
>

/** Hold a paid Checkout slot under the mentor's authenticated Cal.com account. */
export const reserveCalcomSlot = async ({
  eventTypeId,
  slotStart,
  mentorUserId,
  onBeforeReserveAttempt,
}: {
  eventTypeId: number
  slotStart: string
  mentorUserId: string
  onBeforeReserveAttempt?: () => Promise<void>
}): Promise<CalcomSlotReservation> => {
  const response = await calcomRequest<unknown>('/slots/reservations', {
    method: 'POST',
    apiVersion: CALCOM_API_VERSIONS.slots,
    userId: mentorUserId,
    onBeforeRequest: onBeforeReserveAttempt,
    body: JSON.stringify({
      eventTypeId,
      slotStart,
      reservationDuration: CALCOM_CHECKOUT_RESERVATION_MINUTES,
    }),
  })

  const parsed = SlotReservationResponseSchema.safeParse(response)
  if (!parsed.success) throw new ExternalApiError('Cal.com returned an invalid slot reservation')
  return parsed.data.data
}

/** Release a known hold. Cal.com automatically expires it if this best-effort cleanup is delayed. */
export const releaseCalcomSlot = async (
  reservationUid: string,
  mentorUserId: string
): Promise<void> => {
  const response = await calcomRequest<unknown>(
    `/slots/reservations/${encodeURIComponent(reservationUid)}`,
    {
      method: 'DELETE',
      apiVersion: CALCOM_API_VERSIONS.slots,
      userId: mentorUserId,
    }
  )
  if (!DeleteSlotReservationResponseSchema.safeParse(response).success) {
    throw new ExternalApiError('Cal.com returned an invalid slot release response')
  }
}

/** Re-read a temporary hold through the owning mentor's OAuth connection. */
export const getCalcomReservedSlot = async (
  reservationUid: string,
  mentorUserId: string
): Promise<CalcomReservedSlot | null> => {
  const response = await calcomRequest<unknown>(
    `/slots/reservations/${encodeURIComponent(reservationUid)}`,
    {
      apiVersion: CALCOM_API_VERSIONS.slots,
      userId: mentorUserId,
    }
  )
  const parsed = GetSlotReservationResponseSchema.safeParse(response)
  if (!parsed.success) throw new ExternalApiError('Cal.com returned an invalid reserved slot')
  return parsed.data.data
}
