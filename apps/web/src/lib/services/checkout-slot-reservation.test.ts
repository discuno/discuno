import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ReservationRecord = {
  bookingAttemptId: string
  actorUserId: string
  mentorUserId: string | null
  calcomEventTypeId: number
  startTime: Date
  durationMinutes: number
  calcomReservationUid: string | null
  reservationUntil: Date | null
  reservationAcquisitionStartedAt?: Date | null
  checkoutExpiresAt: Date | null
  checkoutRequestSnapshot: Record<string, unknown> | null
  stripeCheckoutSessionId: string | null
  generation: number
  releasedAt: Date | null
  consumedAt: Date | null
}

const mocks = vi.hoisted(() => ({
  record: null as ReservationRecord | null,
  getCalcomReservedSlot: vi.fn(),
  reserveCalcomSlot: vi.fn(),
  releaseCalcomSlot: vi.fn(),
  resolveCanonicalUserId: vi.fn(),
  insertValues: vi.fn(),
  updateValues: vi.fn(),
  updateReturning: vi.fn(),
  findFirst: vi.fn(),
  providerReservationPost: vi.fn(),
  pendingUpdate: null as Partial<ReservationRecord> | null,
  reservationMarkerWriteDropsRemaining: 0,
  providerStateWriteFailuresRemaining: 0,
  providerStateWriteDropsRemaining: 0,
}))

vi.mock('~/lib/calcom/slot-reservations', () => ({
  CALCOM_CHECKOUT_RESERVATION_MINUTES: 45,
  CALCOM_RESERVATION_ACQUISITION_AMBIGUITY_MINUTES: 50,
  getCalcomReservedSlot: mocks.getCalcomReservedSlot,
  reserveCalcomSlot: mocks.reserveCalcomSlot,
  releaseCalcomSlot: mocks.releaseCalcomSlot,
}))
vi.mock('~/server/db/advisory-lock', () => ({
  withDatabaseAdvisoryLock: (_key: string, operation: () => Promise<unknown>) => operation(),
}))
vi.mock('~/server/dal/user-identities', () => ({
  resolveCanonicalUserId: mocks.resolveCanonicalUserId,
}))

const insertChain = {
  values: mocks.insertValues,
  onConflictDoNothing: vi.fn(),
}
const updateChain = {
  set: mocks.updateValues,
  where: vi.fn(),
}

vi.mock('~/server/db', () => ({
  db: {
    insert: vi.fn(() => insertChain),
    update: vi.fn(() => updateChain),
    query: {
      checkoutSlotReservation: {
        findFirst: mocks.findFirst,
      },
    },
  },
}))

import {
  createCheckoutWithReservedSlot,
  withValidatedCheckoutSlotReservation,
} from '~/lib/services/checkout-slot-reservation'
import { isDefinitiveStripeCheckoutExpiryError } from '~/lib/stripe/checkout'

const attempt = {
  bookingAttemptId: '33333333-3333-4333-8333-333333333333',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  mentorUserId: '22222222-2222-4222-8222-222222222222',
  eventTypeId: 42,
  startTime: '2099-01-02T15:00:00.000Z',
  durationMinutes: 30,
}
const reservationUid = 'abffec74-2f4a-486b-a8c4-9bc403da31d2'
const buildCheckoutRequest = vi.fn(() => ({ mode: 'payment', stable: true }))

describe('paid Checkout slot reservation bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-01T12:00:00.000Z'))
    mocks.record = null
    mocks.pendingUpdate = null
    mocks.reservationMarkerWriteDropsRemaining = 0
    mocks.providerStateWriteFailuresRemaining = 0
    mocks.providerStateWriteDropsRemaining = 0
    mocks.resolveCanonicalUserId.mockImplementation(async userId => userId)
    mocks.releaseCalcomSlot.mockResolvedValue(undefined)
    mocks.reserveCalcomSlot.mockImplementation(async input => {
      await input.onBeforeReserveAttempt?.()
      mocks.providerReservationPost()
      return {
        eventTypeId: 42,
        slotStart: attempt.startTime,
        slotEnd: '2099-01-02T15:30:00.000Z',
        slotDuration: 30,
        reservationUid,
        reservationDuration: 45,
        reservationUntil: '2099-01-01T12:45:00.000Z',
      }
    })
    mocks.getCalcomReservedSlot.mockImplementation(async uid => ({
      eventTypeId: 42,
      slotStart: attempt.startTime,
      slotEnd: '2099-01-02T15:30:00.000Z',
      slotDuration: 30,
      reservationUid: uid,
      reservationUntil: mocks.record?.reservationUntil?.toISOString() ?? '2099-01-01T12:45:00.000Z',
    }))
    mocks.findFirst.mockImplementation(async () => mocks.record)
    mocks.insertValues.mockImplementation(values => {
      mocks.record ??= {
        ...values,
        calcomReservationUid: null,
        reservationUntil: null,
        reservationAcquisitionStartedAt: null,
        checkoutExpiresAt: null,
        checkoutRequestSnapshot: null,
        stripeCheckoutSessionId: null,
        generation: 1,
        releasedAt: null,
        consumedAt: null,
      }
      return insertChain
    })
    insertChain.onConflictDoNothing.mockResolvedValue([])
    mocks.updateValues.mockImplementation(values => {
      mocks.pendingUpdate = values
      return updateChain
    })
    mocks.updateReturning.mockImplementation(async () => {
      if (!mocks.record) return []
      return [
        {
          bookingAttemptId: mocks.record.bookingAttemptId,
          mentorUserId: mocks.record.mentorUserId,
          generation: mocks.record.generation,
          calcomReservationUid: mocks.record.calcomReservationUid,
          reservationAcquisitionStartedAt: mocks.record.reservationAcquisitionStartedAt,
        },
      ]
    })
    updateChain.where.mockImplementation(() => {
      const pendingUpdate = mocks.pendingUpdate
      mocks.pendingUpdate = null
      const isProviderStateWrite =
        typeof pendingUpdate?.calcomReservationUid === 'string' &&
        pendingUpdate.reservationAcquisitionStartedAt === null
      const isReservationMarkerWrite =
        pendingUpdate?.reservationAcquisitionStartedAt instanceof Date
      if (isProviderStateWrite && mocks.providerStateWriteFailuresRemaining > 0) {
        mocks.providerStateWriteFailuresRemaining -= 1
        throw new Error('provider reservation binding write failed')
      }
      if (isProviderStateWrite && mocks.providerStateWriteDropsRemaining > 0) {
        mocks.providerStateWriteDropsRemaining -= 1
        return { returning: mocks.updateReturning }
      }
      if (isReservationMarkerWrite && mocks.reservationMarkerWriteDropsRemaining > 0) {
        mocks.reservationMarkerWriteDropsRemaining -= 1
        return { returning: mocks.updateReturning }
      }
      if (mocks.record && pendingUpdate) Object.assign(mocks.record, pendingUpdate)
      return { returning: mocks.updateReturning }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('durably reserves before creating a 35-minute hosted Checkout', async () => {
    const createSession = vi.fn().mockResolvedValue({
      id: 'cs_test_reserved',
      url: 'https://checkout.stripe.test/c/pay/cs_test_reserved',
      status: 'open',
    })

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession: vi.fn(),
        expireSession: vi.fn(),
        buildCheckoutRequest,
        createSession,
      })
    ).resolves.toMatchObject({ id: 'cs_test_reserved' })

    expect(mocks.reserveCalcomSlot).toHaveBeenCalledWith({
      eventTypeId: 42,
      slotStart: attempt.startTime,
      mentorUserId: attempt.mentorUserId,
      onBeforeReserveAttempt: expect.any(Function),
    })
    expect(buildCheckoutRequest).toHaveBeenCalledWith({
      reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      generation: 1,
    })
    expect(createSession).toHaveBeenCalledWith({
      checkoutRequest: { mode: 'payment', stable: true },
      idempotencyKey: `discuno:checkout:v4:${attempt.bookingAttemptId}:1`,
      generation: 1,
    })
    expect(mocks.record).toMatchObject({
      calcomReservationUid: reservationUid,
      stripeCheckoutSessionId: 'cs_test_reserved',
    })
  })

  it('reuses its open Checkout and does not create another provider hold', async () => {
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: attempt.actorUserId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      checkoutRequestSnapshot: { mode: 'payment', stable: true },
      stripeCheckoutSessionId: 'cs_test_existing',
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    const retrieveSession = vi.fn().mockResolvedValue({
      id: 'cs_test_existing',
      url: 'https://checkout.stripe.test/c/pay/cs_test_existing',
      status: 'open',
    })
    const createSession = vi.fn()

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession,
        expireSession: vi.fn(),
        buildCheckoutRequest,
        createSession,
      })
    ).resolves.toMatchObject({ id: 'cs_test_existing' })

    expect(mocks.reserveCalcomSlot).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })

  it('rejects reuse when an attempt is bound to another actor', async () => {
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: '44444444-4444-4444-8444-444444444444',
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: null,
      reservationUntil: null,
      checkoutExpiresAt: null,
      checkoutRequestSnapshot: null,
      stripeCheckoutSessionId: null,
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession: vi.fn(),
        expireSession: vi.fn(),
        buildCheckoutRequest,
        createSession: vi.fn(),
      })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(mocks.reserveCalcomSlot).not.toHaveBeenCalled()
  })

  it('never creates a second Checkout after the first one completed', async () => {
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: attempt.actorUserId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T11:59:00.000Z'),
      checkoutExpiresAt: new Date('2099-01-01T11:50:00.000Z'),
      checkoutRequestSnapshot: { mode: 'payment', stable: true },
      stripeCheckoutSessionId: 'cs_test_complete',
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    const createSession = vi.fn()

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession: vi.fn().mockResolvedValue({
          id: 'cs_test_complete',
          url: null,
          status: 'complete',
        }),
        expireSession: vi.fn(),
        buildCheckoutRequest,
        createSession,
      })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })

    expect(mocks.reserveCalcomSlot).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })

  it('replays the persisted request exactly after an ambiguous Stripe response and identity link', async () => {
    const anonymousActorId = '55555555-5555-4555-8555-555555555555'
    const permanentActorId = attempt.actorUserId
    const persistedRequest = {
      customer: 'cus_original',
      expires_at: 4_071_306_900,
      metadata: { actorUserId: anonymousActorId },
    }
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: anonymousActorId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      checkoutRequestSnapshot: persistedRequest,
      stripeCheckoutSessionId: null,
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    mocks.resolveCanonicalUserId.mockImplementation(async userId =>
      userId === anonymousActorId ? permanentActorId : userId
    )
    vi.setSystemTime(new Date('2099-01-01T12:05:00.000Z'))
    const currentBuilder = vi.fn(() => ({ customer: 'cus_changed' }))
    const createSession = vi.fn().mockResolvedValue({
      id: 'cs_test_ambiguous_replay',
      url: 'https://checkout.stripe.test/c/pay/cs_test_ambiguous_replay',
      status: 'open',
    })

    await createCheckoutWithReservedSlot({
      ...attempt,
      actorUserId: permanentActorId,
      retrieveSession: vi.fn(),
      expireSession: vi.fn(),
      buildCheckoutRequest: currentBuilder,
      createSession,
    })

    expect(currentBuilder).not.toHaveBeenCalled()
    expect(createSession).toHaveBeenCalledWith({
      checkoutRequest: persistedRequest,
      idempotencyKey: `discuno:checkout:v4:${attempt.bookingAttemptId}:1`,
      generation: 1,
    })
  })

  it('replays the exact Stripe request first, then rolls once after a definitive expires_at rejection', async () => {
    const replacementReservationUid = 'f2c6ad85-b770-4dd6-a65e-1139fa7a592a'
    const persistedRequest = { mode: 'payment', expires_at: 4_071_306_900 }
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: attempt.actorUserId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      reservationAcquisitionStartedAt: null,
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      checkoutRequestSnapshot: persistedRequest,
      stripeCheckoutSessionId: null,
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    vi.setSystemTime(new Date('2099-01-01T12:10:00.000Z'))
    mocks.reserveCalcomSlot.mockImplementationOnce(async input => {
      await input.onBeforeReserveAttempt?.()
      return {
        eventTypeId: 42,
        slotStart: attempt.startTime,
        slotEnd: '2099-01-02T15:30:00.000Z',
        slotDuration: 30,
        reservationUid: replacementReservationUid,
        reservationDuration: 45,
        reservationUntil: '2099-01-01T12:55:00.000Z',
      }
    })
    const replacementBuilder = vi.fn(({ generation }) => ({
      mode: 'payment',
      expires_at: 4_071_307_500,
      generation,
    }))
    const expiryError = Object.assign(new Error('expires_at is too close'), {
      type: 'StripeInvalidRequestError',
      param: 'expires_at',
      statusCode: 400,
    })
    const createSession = vi.fn().mockRejectedValueOnce(expiryError).mockResolvedValueOnce({
      id: 'cs_test_generation_2',
      url: 'https://checkout.stripe.test/c/pay/cs_test_generation_2',
      status: 'open',
    })

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession: vi.fn(),
        expireSession: vi.fn(),
        buildCheckoutRequest: replacementBuilder,
        createSession,
        isDefinitiveCheckoutExpiryError: isDefinitiveStripeCheckoutExpiryError,
      })
    ).resolves.toMatchObject({ id: 'cs_test_generation_2' })

    expect(createSession).toHaveBeenNthCalledWith(1, {
      checkoutRequest: persistedRequest,
      idempotencyKey: `discuno:checkout:v4:${attempt.bookingAttemptId}:1`,
      generation: 1,
    })
    expect(createSession).toHaveBeenNthCalledWith(2, {
      checkoutRequest: { mode: 'payment', expires_at: 4_071_307_500, generation: 2 },
      idempotencyKey: `discuno:checkout:v4:${attempt.bookingAttemptId}:2`,
      generation: 2,
    })
    expect(mocks.releaseCalcomSlot).toHaveBeenCalledWith(reservationUid, attempt.mentorUserId)
    expect(mocks.reserveCalcomSlot).toHaveBeenCalledOnce()
  })

  it('never rolls or releases a hold after an ambiguous Stripe failure', async () => {
    const persistedRequest = { mode: 'payment', expires_at: 4_071_306_900 }
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: attempt.actorUserId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      reservationAcquisitionStartedAt: null,
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      checkoutRequestSnapshot: persistedRequest,
      stripeCheckoutSessionId: null,
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    vi.setSystemTime(new Date('2099-01-01T12:10:00.000Z'))
    const ambiguousError = new Error('socket closed after request write')
    const createSession = vi.fn().mockRejectedValue(ambiguousError)

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession: vi.fn(),
        expireSession: vi.fn(),
        buildCheckoutRequest,
        createSession,
        isDefinitiveCheckoutExpiryError: () => false,
      })
    ).rejects.toBe(ambiguousError)

    expect(createSession).toHaveBeenCalledWith({
      checkoutRequest: persistedRequest,
      idempotencyKey: `discuno:checkout:v4:${attempt.bookingAttemptId}:1`,
      generation: 1,
    })
    expect(mocks.releaseCalcomSlot).not.toHaveBeenCalled()
    expect(mocks.reserveCalcomSlot).not.toHaveBeenCalled()
    expect(buildCheckoutRequest).not.toHaveBeenCalled()
  })

  it('blocks the Cal reservation POST when its durable acquisition marker updates zero rows', async () => {
    mocks.reservationMarkerWriteDropsRemaining = 1
    const createSession = vi.fn()

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession: vi.fn(),
        expireSession: vi.fn(),
        buildCheckoutRequest,
        createSession,
      })
    ).rejects.toThrow('reservation attempt marker could not be persisted')

    expect(mocks.providerReservationPost).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })

  it('pins the mentor guard and blocks a second Cal POST after an ambiguous rollover attempt', async () => {
    const persistedRequest = { mode: 'payment', expires_at: 4_071_306_900 }
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: attempt.actorUserId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      reservationAcquisitionStartedAt: null,
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      checkoutRequestSnapshot: persistedRequest,
      stripeCheckoutSessionId: null,
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    vi.setSystemTime(new Date('2099-01-01T12:10:00.000Z'))
    const expiryError = new Error('definitive expiry rejection')
    const ambiguousProviderError = new Error('Cal reservation response was lost')
    mocks.reserveCalcomSlot.mockImplementationOnce(async input => {
      await input.onBeforeReserveAttempt?.()
      mocks.providerReservationPost()
      throw ambiguousProviderError
    })
    const createSession = vi.fn().mockRejectedValueOnce(expiryError)
    const checkoutInput = {
      ...attempt,
      retrieveSession: vi.fn(),
      expireSession: vi.fn(),
      buildCheckoutRequest,
      createSession,
      isDefinitiveCheckoutExpiryError: (error: unknown) => error === expiryError,
    }

    await expect(createCheckoutWithReservedSlot(checkoutInput)).rejects.toBe(ambiguousProviderError)
    expect(mocks.record).toMatchObject({
      mentorUserId: attempt.mentorUserId,
      releasedAt: expect.any(Date),
      reservationAcquisitionStartedAt: expect.any(Date),
    })

    await expect(createCheckoutWithReservedSlot(checkoutInput)).rejects.toThrow(
      'reservation status is still being reconciled'
    )
    expect(mocks.providerReservationPost).toHaveBeenCalledOnce()
    expect(createSession).toHaveBeenCalledOnce()
  })

  it.each([
    ['failed', 'providerStateWriteFailuresRemaining'],
    ['zero-row', 'providerStateWriteDropsRemaining'],
  ] as const)(
    'compensates a known Cal hold after a %s local binding and never reaches Stripe',
    async (_scenario, failureCounter) => {
      mocks[failureCounter] = 2
      const createSession = vi.fn()

      await expect(
        createCheckoutWithReservedSlot({
          ...attempt,
          retrieveSession: vi.fn(),
          expireSession: vi.fn(),
          buildCheckoutRequest,
          createSession,
        })
      ).rejects.toThrow()

      expect(mocks.releaseCalcomSlot).toHaveBeenCalledWith(reservationUid, attempt.mentorUserId)
      expect(createSession).not.toHaveBeenCalled()
      expect(mocks.record).toMatchObject({
        calcomReservationUid: null,
        reservationAcquisitionStartedAt: null,
      })
    }
  )

  it('releases a known Cal hold when checkout request construction throws', async () => {
    const requestError = new Error('Stripe customer lookup failed')
    const createSession = vi.fn()

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession: vi.fn(),
        expireSession: vi.fn(),
        buildCheckoutRequest: () => {
          throw requestError
        },
        createSession,
      })
    ).rejects.toBe(requestError)

    expect(mocks.releaseCalcomSlot).toHaveBeenCalledWith(reservationUid, attempt.mentorUserId)
    expect(mocks.record).toMatchObject({
      calcomReservationUid: null,
      reservationAcquisitionStartedAt: null,
    })
    expect(createSession).not.toHaveBeenCalled()
  })

  it('re-attests a reused provider hold and fails closed before Stripe when it vanished', async () => {
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: attempt.actorUserId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      reservationAcquisitionStartedAt: null,
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      checkoutRequestSnapshot: { mode: 'payment' },
      stripeCheckoutSessionId: null,
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    mocks.getCalcomReservedSlot.mockResolvedValueOnce(null)
    const createSession = vi.fn()

    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        retrieveSession: vi.fn(),
        expireSession: vi.fn(),
        buildCheckoutRequest,
        createSession,
      })
    ).rejects.toThrow('Cal.com slot reservation is no longer active')

    expect(createSession).not.toHaveBeenCalled()
    expect(mocks.record).toMatchObject({ mentorUserId: null })
  })

  it('attests the exact local and provider reservation while holding the attempt lock', async () => {
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: attempt.actorUserId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      checkoutRequestSnapshot: { mode: 'payment' },
      stripeCheckoutSessionId: 'cs_test_reserved',
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    mocks.getCalcomReservedSlot.mockResolvedValue({
      eventTypeId: 42,
      slotStart: attempt.startTime,
      slotEnd: '2099-01-02T15:30:00.000Z',
      slotDuration: 30,
      reservationUid,
      reservationUntil: '2099-01-01T12:45:00.000Z',
    })
    const operation = vi.fn().mockResolvedValue('booked')

    await expect(
      withValidatedCheckoutSlotReservation(
        {
          bookingAttemptId: attempt.bookingAttemptId,
          reservationUid,
          reservationUntil: '2099-01-01T12:45:00.000Z',
          generation: 1,
          stripeCheckoutSessionId: 'cs_test_reserved',
          mentorUserId: attempt.mentorUserId,
          eventTypeId: 42,
          startTime: attempt.startTime,
          durationMinutes: 30,
        },
        operation
      )
    ).resolves.toEqual({ valid: true, value: 'booked' })
    expect(operation).toHaveBeenCalledOnce()
  })

  it('rejects a missing provider reservation without creating the booking', async () => {
    mocks.record = {
      bookingAttemptId: attempt.bookingAttemptId,
      actorUserId: attempt.actorUserId,
      mentorUserId: attempt.mentorUserId,
      calcomEventTypeId: 42,
      startTime: new Date(attempt.startTime),
      durationMinutes: 30,
      calcomReservationUid: reservationUid,
      reservationUntil: new Date('2099-01-01T12:45:00.000Z'),
      checkoutExpiresAt: new Date('2099-01-01T12:35:00.000Z'),
      checkoutRequestSnapshot: { mode: 'payment' },
      stripeCheckoutSessionId: 'cs_test_reserved',
      generation: 1,
      releasedAt: null,
      consumedAt: null,
    }
    mocks.getCalcomReservedSlot.mockResolvedValue(null)
    const operation = vi.fn()

    await expect(
      withValidatedCheckoutSlotReservation(
        {
          bookingAttemptId: attempt.bookingAttemptId,
          reservationUid,
          reservationUntil: '2099-01-01T12:45:00.000Z',
          generation: 1,
          stripeCheckoutSessionId: 'cs_test_reserved',
          mentorUserId: attempt.mentorUserId,
          eventTypeId: 42,
          startTime: attempt.startTime,
          durationMinutes: 30,
        },
        operation
      )
    ).resolves.toEqual({ valid: false, reason: 'provider_reservation_missing' })
    expect(operation).not.toHaveBeenCalled()
  })

  it('rejects paid sessions that start inside the hosted Checkout window', async () => {
    await expect(
      createCheckoutWithReservedSlot({
        ...attempt,
        startTime: '2099-01-01T12:44:59.000Z',
        retrieveSession: vi.fn(),
        expireSession: vi.fn(),
        buildCheckoutRequest,
        createSession: vi.fn(),
      })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(mocks.reserveCalcomSlot).not.toHaveBeenCalled()
  })
})
