import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ calcomRequest: vi.fn() }))

vi.mock('~/lib/calcom/client', () => ({
  CALCOM_API_VERSIONS: { slots: '2024-09-04' },
  calcomRequest: mocks.calcomRequest,
}))

import {
  CALCOM_CHECKOUT_RESERVATION_MINUTES,
  getCalcomReservedSlot,
  releaseCalcomSlot,
  reserveCalcomSlot,
} from '~/lib/calcom/slot-reservations'

const reservation = {
  eventTypeId: 42,
  slotStart: '2099-01-02T15:00:00.000Z',
  slotEnd: '2099-01-02T15:30:00.000Z',
  slotDuration: 30,
  reservationUid: 'abffec74-2f4a-486b-a8c4-9bc403da31d2',
  reservationDuration: CALCOM_CHECKOUT_RESERVATION_MINUTES,
  reservationUntil: '2099-01-01T12:45:00.000Z',
}

describe('Cal.com paid-checkout slot reservations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reserves with the current slot contract under mentor OAuth', async () => {
    mocks.calcomRequest.mockResolvedValue({ status: 'success', data: reservation })

    await expect(
      reserveCalcomSlot({
        eventTypeId: 42,
        slotStart: reservation.slotStart,
        mentorUserId: '22222222-2222-4222-8222-222222222222',
      })
    ).resolves.toEqual(reservation)

    expect(mocks.calcomRequest).toHaveBeenCalledWith('/slots/reservations', {
      method: 'POST',
      apiVersion: '2024-09-04',
      userId: '22222222-2222-4222-8222-222222222222',
      body: JSON.stringify({
        eventTypeId: 42,
        slotStart: reservation.slotStart,
        reservationDuration: CALCOM_CHECKOUT_RESERVATION_MINUTES,
      }),
    })
  })

  it('releases a reservation with the same authenticated account', async () => {
    mocks.calcomRequest.mockResolvedValue({ status: 'success' })

    await releaseCalcomSlot(reservation.reservationUid, '22222222-2222-4222-8222-222222222222')

    expect(mocks.calcomRequest).toHaveBeenCalledWith(
      `/slots/reservations/${reservation.reservationUid}`,
      {
        method: 'DELETE',
        apiVersion: '2024-09-04',
        userId: '22222222-2222-4222-8222-222222222222',
      }
    )
  })

  it('re-reads the live reservation through mentor OAuth before fulfillment', async () => {
    const { reservationDuration: _reservationDuration, ...reservedSlot } = reservation
    mocks.calcomRequest.mockResolvedValue({ status: 'success', data: reservedSlot })

    await expect(
      getCalcomReservedSlot(reservation.reservationUid, '22222222-2222-4222-8222-222222222222')
    ).resolves.toEqual(reservedSlot)

    expect(mocks.calcomRequest).toHaveBeenCalledWith(
      `/slots/reservations/${reservation.reservationUid}`,
      {
        apiVersion: '2024-09-04',
        userId: '22222222-2222-4222-8222-222222222222',
      }
    )
  })

  it('treats a successful null reservation read as an expired/missing hold', async () => {
    mocks.calcomRequest.mockResolvedValue({ status: 'success', data: null })

    await expect(
      getCalcomReservedSlot(reservation.reservationUid, '22222222-2222-4222-8222-222222222222')
    ).resolves.toBeNull()
  })
})
