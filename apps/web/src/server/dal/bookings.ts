import 'server-only'

import { and, desc, eq, isNull, lt, ne, or } from 'drizzle-orm'
import { NotFoundError } from '~/lib/errors'
import type { NewBooking, NewBookingAttendee, NewBookingOrganizer } from '~/lib/schemas/db'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema/index'

/**
 * Data Access Layer for bookings
 * Raw database operations with no caching or auth checks
 */

/**
 * Get all bookings for a mentor with attendee information
 */
export const getBookingsByMentorId = async (mentorId: string) => {
  return db
    .select({
      id: schema.booking.id,
      calcomBookingId: schema.booking.calcomBookingId,
      calcomUid: schema.booking.calcomUid,
      title: schema.booking.title,
      description: schema.booking.description,
      startTime: schema.booking.startTime,
      endTime: schema.booking.endTime,
      status: schema.booking.status,
      meetingUrl: schema.booking.meetingUrl,
      attendeeName: schema.bookingAttendee.name,
      attendeeEmail: schema.bookingAttendee.email,
      attendeeTimeZone: schema.bookingAttendee.timeZone,
      createdAt: schema.booking.createdAt,
    })
    .from(schema.booking)
    .innerJoin(schema.bookingAttendee, eq(schema.booking.id, schema.bookingAttendee.bookingId))
    .innerJoin(schema.bookingOrganizer, eq(schema.booking.id, schema.bookingOrganizer.bookingId))
    .where(eq(schema.bookingOrganizer.userId, mentorId))
    .orderBy(desc(schema.booking.startTime))
}

/**
 * Find a booking only when the supplied mentor is its organizer.
 *
 * Returning `null` for both missing and differently-owned bookings keeps the
 * authorization layer from revealing whether another mentor's booking exists.
 */
export const getBookingByCalcomUidAndMentorId = async (
  calcomBookingUid: string,
  mentorId: string
) => {
  const [booking] = await db
    .select({
      id: schema.booking.id,
      calcomUid: schema.booking.calcomUid,
      mentorUserId: schema.bookingOrganizer.userId,
    })
    .from(schema.booking)
    .innerJoin(schema.bookingOrganizer, eq(schema.booking.id, schema.bookingOrganizer.bookingId))
    .where(
      and(
        eq(schema.booking.calcomUid, calcomBookingUid),
        eq(schema.bookingOrganizer.userId, mentorId)
      )
    )
    .limit(1)

  return booking ?? null
}

/** Resolve trusted local ownership for transitional webhook deliveries. */
export const getBookingLifecycleContextByCalcomUid = async (calcomBookingUid: string) => {
  const [context] = await db
    .select({
      expectedMentorUserId: schema.bookingOrganizer.userId,
      expectedCalcomUserId: schema.calcomToken.calcomUserId,
    })
    .from(schema.booking)
    .innerJoin(schema.bookingOrganizer, eq(schema.bookingOrganizer.bookingId, schema.booking.id))
    .innerJoin(schema.calcomToken, eq(schema.calcomToken.userId, schema.bookingOrganizer.userId))
    .where(eq(schema.booking.calcomUid, calcomBookingUid))
    .limit(1)

  return context ?? null
}

/**
 * Create a booking with organizer and attendee
 */
type CreateBookingInput = NewBooking & {
  duration: number
  calcomEventTypeId: number
  calcomUserId?: number
  lifecycleEventCreatedAt?: Date
  rescheduledFromUid?: string
  supersededByUid?: string
  organizer: Omit<NewBookingOrganizer, 'bookingId'>
  attendee: Omit<NewBookingAttendee, 'bookingId'>
  meetingUrl?: string
}

export type BookingLifecycleState = (typeof schema.calcomBookingLifecycle.$inferSelect)['state']
export type BookingFinancialDisposition =
  (typeof schema.calcomBookingLifecycle.$inferSelect)['financialDisposition']
export type BookingLifecycle = typeof schema.calcomBookingLifecycle.$inferSelect

export type RecordBookingLifecycleInput = {
  calcomUid: string
  calcomBookingId?: number
  mentorUserId: string
  calcomUserId?: number
  state: BookingLifecycleState
  financialDisposition: BookingFinancialDisposition
  mentorPayoutEligible?: boolean
  eventCreatedAt: Date
}

export const assertBookingLifecycleOwnership = (
  lifecycle: Pick<BookingLifecycle, 'mentorUserId' | 'calcomUserId'>,
  expected: { mentorUserId: string; calcomUserId?: number }
) => {
  if (lifecycle.mentorUserId !== expected.mentorUserId) {
    throw new Error('Cal.com lifecycle belongs to a different Discuno mentor')
  }
  if (
    lifecycle.calcomUserId !== null &&
    expected.calcomUserId !== undefined &&
    lifecycle.calcomUserId !== expected.calcomUserId
  ) {
    throw new Error('Cal.com lifecycle belongs to a different Cal.com user')
  }
}

const getLifecycleProjection = (
  lifecycle: Pick<BookingLifecycle, 'state' | 'mentorPayoutEligible'>,
  activeStatus: CreateBookingInput['status'] = 'PENDING'
) => {
  switch (lifecycle.state) {
    case 'CANCELLED':
      return {
        status: 'CANCELLED' as const,
        hostNoShow: false,
        attendeeNoShow: false,
        mentorPayoutEligible: lifecycle.mentorPayoutEligible,
      }
    case 'COMPLETED':
      return {
        status: 'COMPLETED' as const,
        hostNoShow: false,
        attendeeNoShow: false,
        mentorPayoutEligible: false,
      }
    case 'HOST_NO_SHOW':
      return {
        status: 'NO_SHOW' as const,
        hostNoShow: true,
        attendeeNoShow: false,
        mentorPayoutEligible: false,
      }
    case 'ATTENDEE_NO_SHOW':
      return {
        status: 'NO_SHOW' as const,
        hostNoShow: false,
        attendeeNoShow: true,
        mentorPayoutEligible: false,
      }
    case 'ACTIVE':
      return {
        status: activeStatus,
        hostNoShow: false,
        attendeeNoShow: false,
        mentorPayoutEligible: false,
      }
  }
}

const lifecycleSeedForBooking = ({
  status,
  hostNoShow,
}: Pick<CreateBookingInput, 'status' | 'hostNoShow'>): {
  state: BookingLifecycleState
  financialDisposition: BookingFinancialDisposition
  mentorPayoutEligible: boolean
} => {
  switch (status) {
    case 'CANCELLED':
      // A cancelled snapshot without its cancellation event cannot prove who
      // cancelled. Hold it conservatively until the authoritative event lands.
      return {
        state: 'CANCELLED',
        financialDisposition: 'HOLD_LATE_CANCELLATION',
        mentorPayoutEligible: false,
      }
    case 'REJECTED':
      return {
        state: 'CANCELLED',
        financialDisposition: 'REFUND_PROVIDER_REJECTION',
        mentorPayoutEligible: false,
      }
    case 'COMPLETED':
      return {
        state: 'COMPLETED',
        financialDisposition: 'PAYOUT_COMPLETED',
        mentorPayoutEligible: false,
      }
    case 'NO_SHOW':
      return hostNoShow
        ? {
            state: 'HOST_NO_SHOW',
            financialDisposition: 'REFUND_MENTOR_NO_SHOW',
            mentorPayoutEligible: false,
          }
        : {
            state: 'ATTENDEE_NO_SHOW',
            financialDisposition: 'PAYOUT_ATTENDEE_NO_SHOW',
            mentorPayoutEligible: false,
          }
    default:
      return { state: 'ACTIVE', financialDisposition: 'NONE', mentorPayoutEligible: false }
  }
}

export const createBooking = async (input: CreateBookingInput) => {
  return db.transaction(async tx => {
    // Look up the internal mentor event type ID from the Cal.com event type ID
    const mentorEventType = await tx.query.mentorEventType.findFirst({
      where: eq(schema.mentorEventType.calcomEventTypeId, input.calcomEventTypeId),
    })

    if (!mentorEventType) {
      throw new NotFoundError(
        `Mentor event type with Cal.com ID ${input.calcomEventTypeId} not found`
      )
    }

    if (mentorEventType.mentorUserId !== input.organizer.userId) {
      throw new Error('Cal.com organizer does not own the requested mentor event type')
    }

    if (input.paymentId) {
      const paymentRecord = await tx.query.payment.findFirst({
        where: eq(schema.payment.id, input.paymentId),
      })
      if (!paymentRecord) {
        throw new Error('Paid booking does not reference a Discuno payment')
      }
      if (
        paymentRecord.platformStatus !== 'SUCCEEDED' &&
        paymentRecord.calcomBookingUid !== input.calcomUid
      ) {
        throw new Error('Terminal payment does not recognize this Cal.com booking')
      }
      if (paymentRecord.mentorUserId !== input.organizer.userId) {
        throw new Error('Paid booking organizer does not match the payment mentor')
      }
      if (paymentRecord.customerEmail.toLowerCase() !== input.attendee.email.toLowerCase()) {
        throw new Error('Paid booking attendee does not match the payment customer')
      }

      const metadata = paymentRecord.metadata
      const checkoutMetadata =
        metadata && typeof metadata === 'object' && 'checkoutSessionMetadata' in metadata
          ? (metadata.checkoutSessionMetadata as Record<string, unknown>)
          : null
      const checkoutStart =
        typeof checkoutMetadata?.startTime === 'string'
          ? new Date(checkoutMetadata.startTime)
          : null
      const checkoutDuration =
        typeof checkoutMetadata?.eventDurationMinutes === 'string'
          ? Number(checkoutMetadata.eventDurationMinutes)
          : Number.NaN
      const rescheduledPredecessor = input.rescheduledFromUid
        ? await tx.query.booking.findFirst({
            where: and(
              eq(schema.booking.paymentId, input.paymentId),
              eq(schema.booking.calcomUid, input.rescheduledFromUid),
              eq(schema.booking.status, 'CANCELLED')
            ),
            columns: { calcomUid: true },
          })
        : null
      const recognizedReschedule = Boolean(
        input.rescheduledFromUid &&
        (rescheduledPredecessor ?? paymentRecord.calcomBookingUid === input.rescheduledFromUid)
      )
      if (
        !checkoutMetadata ||
        checkoutMetadata.eventTypeId !== input.calcomEventTypeId.toString() ||
        checkoutMetadata.mentorUserId !== input.organizer.userId ||
        typeof checkoutMetadata.attendeeEmail !== 'string' ||
        checkoutMetadata.attendeeEmail.toLowerCase() !== input.attendee.email.toLowerCase() ||
        !checkoutStart ||
        Number.isNaN(checkoutStart.getTime()) ||
        (!recognizedReschedule && checkoutStart.getTime() !== input.startTime.getTime()) ||
        (input.rescheduledFromUid !== undefined && !recognizedReschedule) ||
        !Number.isSafeInteger(checkoutDuration) ||
        checkoutDuration !== input.duration ||
        input.endTime.getTime() !== input.startTime.getTime() + input.duration * 60 * 1000
      ) {
        throw new Error('Paid booking does not match its server-authoritative checkout')
      }

      const linkedBooking = await tx.query.booking.findFirst({
        where: and(
          eq(schema.booking.paymentId, input.paymentId),
          or(ne(schema.booking.status, 'CANCELLED'), eq(schema.booking.mentorPayoutEligible, true))
        ),
        columns: { calcomUid: true },
      })
      if (linkedBooking && linkedBooking.calcomUid !== input.calcomUid) {
        if (!input.supersededByUid || linkedBooking.calcomUid !== input.supersededByUid) {
          throw new Error('Payment is already linked to another active booking')
        }
      }
    }

    const existingBookingBeforeInsert = await tx.query.booking.findFirst({
      where: or(
        eq(schema.booking.calcomBookingId, input.calcomBookingId),
        eq(schema.booking.calcomUid, input.calcomUid)
      ),
    })
    if (
      existingBookingBeforeInsert &&
      (existingBookingBeforeInsert.calcomBookingId !== input.calcomBookingId ||
        existingBookingBeforeInsert.calcomUid !== input.calcomUid)
    ) {
      throw new Error(`Conflicting Cal.com identifiers for booking ${input.calcomUid}`)
    }
    if (existingBookingBeforeInsert) {
      const existingOrganizer = await tx.query.bookingOrganizer.findFirst({
        where: eq(schema.bookingOrganizer.bookingId, existingBookingBeforeInsert.id),
        columns: { userId: true },
      })
      if (!existingOrganizer || existingOrganizer.userId !== input.organizer.userId) {
        throw new Error('Existing Cal.com booking belongs to a different Discuno mentor')
      }
    }

    const lifecycleSeed = input.supersededByUid
      ? {
          state: 'CANCELLED' as const,
          financialDisposition: 'NONE' as const,
          mentorPayoutEligible: false,
        }
      : lifecycleSeedForBooking(existingBookingBeforeInsert ?? input)
    const lifecycleNow = new Date()
    await tx
      .insert(schema.calcomBookingLifecycle)
      .values({
        calcomUid: input.calcomUid,
        calcomBookingId: input.calcomBookingId,
        mentorUserId: input.organizer.userId,
        calcomUserId: input.calcomUserId,
        state: lifecycleSeed.state,
        financialDisposition: existingBookingBeforeInsert
          ? 'NONE'
          : lifecycleSeed.financialDisposition,
        mentorPayoutEligible:
          existingBookingBeforeInsert?.mentorPayoutEligible ?? lifecycleSeed.mentorPayoutEligible,
        eventCreatedAt: input.lifecycleEventCreatedAt ?? lifecycleNow,
        // Existing rows predate this ledger and may already have received their
        // financial side effects. Preserve their state without replaying money.
        sideEffectsCompletedAt: existingBookingBeforeInsert ? lifecycleNow : null,
      })
      .onConflictDoNothing({ target: schema.calcomBookingLifecycle.calcomUid })

    const [lifecycle] = await tx
      .select()
      .from(schema.calcomBookingLifecycle)
      .where(eq(schema.calcomBookingLifecycle.calcomUid, input.calcomUid))
      .for('update')

    if (!lifecycle) {
      throw new Error(`Failed to establish lifecycle state for Cal.com booking ${input.calcomUid}`)
    }

    assertBookingLifecycleOwnership(lifecycle, {
      mentorUserId: input.organizer.userId,
      calcomUserId: input.calcomUserId,
    })

    if (lifecycle.calcomBookingId !== null && lifecycle.calcomBookingId !== input.calcomBookingId) {
      throw new Error(`Conflicting Cal.com lifecycle identifiers for booking ${input.calcomUid}`)
    }
    if (lifecycle.calcomBookingId === null || lifecycle.calcomUserId === null) {
      await tx
        .update(schema.calcomBookingLifecycle)
        .set({
          ...(lifecycle.calcomBookingId === null ? { calcomBookingId: input.calcomBookingId } : {}),
          ...(lifecycle.calcomUserId === null && input.calcomUserId !== undefined
            ? { calcomUserId: input.calcomUserId }
            : {}),
          updatedAt: lifecycleNow,
        })
        .where(eq(schema.calcomBookingLifecycle.calcomUid, input.calcomUid))
      lifecycle.calcomBookingId = input.calcomBookingId
      if (input.calcomUserId !== undefined) lifecycle.calcomUserId = input.calcomUserId
    }

    const lifecycleProjection = getLifecycleProjection(lifecycle, input.status)

    // Create the booking record
    const [booking] = await tx
      .insert(schema.booking)
      .values({
        calcomBookingId: input.calcomBookingId,
        calcomUid: input.calcomUid,
        title: input.title,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        // A terminal lifecycle row wins even when BOOKING_CREATED was delivered
        // after it. Otherwise preserve Cal's authoritative create status.
        ...lifecycleProjection,
        mentorEventTypeId: mentorEventType.id,
        paymentId: input.paymentId,
        webhookPayload: input.webhookPayload,
        meetingUrl: input.meetingUrl,
      })
      .onConflictDoNothing()
      .returning()

    if (!booking) {
      const existingBooking =
        existingBookingBeforeInsert ??
        (await tx.query.booking.findFirst({
          where: or(
            eq(schema.booking.calcomBookingId, input.calcomBookingId),
            eq(schema.booking.calcomUid, input.calcomUid)
          ),
        }))

      if (!existingBooking) {
        throw new Error(`Failed to create or find Cal.com booking ${input.calcomUid}`)
      }

      if (
        existingBooking.calcomBookingId !== input.calcomBookingId ||
        existingBooking.calcomUid !== input.calcomUid
      ) {
        throw new Error(`Conflicting Cal.com identifiers for booking ${input.calcomUid}`)
      }

      if (input.paymentId) {
        await tx
          .update(schema.payment)
          .set({
            calcomBookingUid: input.supersededByUid ?? existingBooking.calcomUid,
            updatedAt: new Date(),
          })
          .where(eq(schema.payment.id, input.paymentId))
      }

      return { booking: existingBooking, lifecycle, created: false as const }
    }

    // Create the organizer record
    await tx.insert(schema.bookingOrganizer).values({
      ...input.organizer,
      bookingId: booking.id,
    })

    // Create the attendee record
    await tx.insert(schema.bookingAttendee).values({
      ...input.attendee,
      bookingId: booking.id,
    })

    if (input.paymentId) {
      await tx
        .update(schema.payment)
        .set({
          calcomBookingUid: input.supersededByUid ?? booking.calcomUid,
          updatedAt: new Date(),
        })
        .where(eq(schema.payment.id, input.paymentId))
    }

    return { booking, lifecycle, created: true as const }
  })
}

/**
 * Decide whether an incoming lifecycle event may replace the durable current
 * state. BOOKING_CREATED never calls this function: it can seed ACTIVE, but it
 * cannot overwrite an existing terminal row.
 */
export const shouldReplaceBookingLifecycle = (
  current: Pick<
    BookingLifecycle,
    'state' | 'financialDisposition' | 'mentorPayoutEligible' | 'eventCreatedAt'
  >,
  incoming: RecordBookingLifecycleInput
) => {
  const currentTime = current.eventCreatedAt.getTime()
  const incomingTime = incoming.eventCreatedAt.getTime()
  const isSameDecision =
    current.state === incoming.state &&
    current.financialDisposition === incoming.financialDisposition &&
    current.mentorPayoutEligible === (incoming.mentorPayoutEligible ?? false)

  if (current.state === incoming.state) {
    return incomingTime > currentTime || (incomingTime === currentTime && !isSameDecision)
  }

  // Any lifecycle event can close an ACTIVE create snapshot, regardless of
  // delivery latency. Cal's event timestamp remains authoritative afterwards.
  if (current.state === 'ACTIVE') return incoming.state !== 'ACTIVE'

  // Cal can explicitly clear an attendee no-show. It must never clear a host
  // no-show, completion, or cancellation.
  if (incoming.state === 'ACTIVE') {
    return current.state === 'ATTENDEE_NO_SHOW' && incomingTime >= currentTime
  }

  if (current.state === 'ATTENDEE_NO_SHOW') {
    if (incoming.state === 'COMPLETED') return false
    return incomingTime >= currentTime
  }

  if (current.state === 'COMPLETED') {
    return (
      (incoming.state === 'HOST_NO_SHOW' || incoming.state === 'CANCELLED') &&
      incomingTime >= currentTime
    )
  }

  if (current.state === 'HOST_NO_SHOW') {
    return incoming.state === 'CANCELLED' && incomingTime >= currentTime
  }

  // Cancellation is final. A replay may refine its financial disposition via
  // the same-state branch above, but no other event can resurrect it.
  return false
}

/**
 * Persist the privacy-minimal lifecycle decision, then project it onto the
 * full booking snapshot when that snapshot already exists.
 */
export const recordBookingLifecycleEvent = async (input: RecordBookingLifecycleInput) => {
  if (Number.isNaN(input.eventCreatedAt.getTime())) {
    throw new Error('Cal.com lifecycle event timestamp is invalid')
  }

  return db.transaction(async tx => {
    const now = new Date()
    const existingBookingSnapshot = await tx.query.booking.findFirst({
      where: eq(schema.booking.calcomUid, input.calcomUid),
      columns: { id: true },
    })
    if (existingBookingSnapshot) {
      const existingOrganizer = await tx.query.bookingOrganizer.findFirst({
        where: eq(schema.bookingOrganizer.bookingId, existingBookingSnapshot.id),
        columns: { userId: true },
      })
      if (!existingOrganizer || existingOrganizer.userId !== input.mentorUserId) {
        throw new Error('Cal.com booking lifecycle event belongs to a different Discuno mentor')
      }
    }

    const [inserted] = await tx
      .insert(schema.calcomBookingLifecycle)
      .values({
        calcomUid: input.calcomUid,
        calcomBookingId: input.calcomBookingId,
        mentorUserId: input.mentorUserId,
        calcomUserId: input.calcomUserId,
        state: input.state,
        financialDisposition: input.financialDisposition,
        mentorPayoutEligible: input.mentorPayoutEligible ?? false,
        eventCreatedAt: input.eventCreatedAt,
      })
      .onConflictDoNothing({ target: schema.calcomBookingLifecycle.calcomUid })
      .returning()

    let lifecycle = inserted
    let changed = Boolean(inserted)
    if (!lifecycle) {
      const [current] = await tx
        .select()
        .from(schema.calcomBookingLifecycle)
        .where(eq(schema.calcomBookingLifecycle.calcomUid, input.calcomUid))
        .for('update')
      if (!current) {
        throw new Error(`Cal.com lifecycle row ${input.calcomUid} disappeared during processing`)
      }
      assertBookingLifecycleOwnership(current, {
        mentorUserId: input.mentorUserId,
        calcomUserId: input.calcomUserId,
      })

      lifecycle = current
      if (shouldReplaceBookingLifecycle(current, input)) {
        const [updated] = await tx
          .update(schema.calcomBookingLifecycle)
          .set({
            calcomBookingId: input.calcomBookingId ?? current.calcomBookingId,
            calcomUserId: input.calcomUserId ?? current.calcomUserId,
            state: input.state,
            financialDisposition: input.financialDisposition,
            mentorPayoutEligible: input.mentorPayoutEligible ?? false,
            // Cal exposes a generic updatedAt rather than a dedicated
            // cancelledAt. Preserve the first authenticated provider instant
            // once cancellation is observed; later reads may change updatedAt
            // while refining actor/disposition evidence.
            eventCreatedAt:
              current.state === 'CANCELLED' && input.state === 'CANCELLED'
                ? current.eventCreatedAt
                : input.eventCreatedAt,
            sideEffectsClaimedAt: null,
            sideEffectsCompletedAt: null,
            updatedAt: now,
          })
          .where(eq(schema.calcomBookingLifecycle.calcomUid, input.calcomUid))
          .returning()
        if (!updated) throw new Error(`Failed to update Cal.com lifecycle ${input.calcomUid}`)
        lifecycle = updated
        changed = true
      } else if (
        (current.calcomBookingId === null && input.calcomBookingId !== undefined) ||
        (current.calcomUserId === null && input.calcomUserId !== undefined)
      ) {
        const [identified] = await tx
          .update(schema.calcomBookingLifecycle)
          .set({
            ...(current.calcomBookingId === null && input.calcomBookingId !== undefined
              ? { calcomBookingId: input.calcomBookingId }
              : {}),
            ...(current.calcomUserId === null && input.calcomUserId !== undefined
              ? { calcomUserId: input.calcomUserId }
              : {}),
            updatedAt: now,
          })
          .where(eq(schema.calcomBookingLifecycle.calcomUid, input.calcomUid))
          .returning()
        if (identified) lifecycle = identified
      }
    }

    const projection = getLifecycleProjection(lifecycle, 'ACCEPTED')
    const update = {
      ...projection,
      updatedAt: now,
    }
    const [projectedBooking] =
      lifecycle.state === 'ACTIVE'
        ? await tx
            .update(schema.booking)
            .set(update)
            .where(
              and(
                eq(schema.booking.calcomUid, input.calcomUid),
                eq(schema.booking.status, 'NO_SHOW'),
                eq(schema.booking.attendeeNoShow, true),
                eq(schema.booking.hostNoShow, false)
              )
            )
            .returning({ id: schema.booking.id })
        : await tx
            .update(schema.booking)
            .set(update)
            .where(eq(schema.booking.calcomUid, input.calcomUid))
            .returning({ id: schema.booking.id })

    const existingBooking =
      projectedBooking ??
      (await tx.query.booking.findFirst({
        where: eq(schema.booking.calcomUid, input.calcomUid),
        columns: { id: true },
      }))

    return {
      id: existingBooking?.id ?? null,
      missing: !existingBooking,
      recorded: changed,
      transitioned: changed && Boolean(existingBooking),
      lifecycle,
    }
  })
}

const BOOKING_LIFECYCLE_SIDE_EFFECT_LEASE_MS = 2 * 60 * 1000

/** Atomically claim the exact current decision before touching money. */
export const claimBookingLifecycleSideEffects = async (
  lifecycle: Pick<BookingLifecycle, 'calcomUid' | 'mentorUserId' | 'state' | 'eventCreatedAt'>
) => {
  const claimedAt = new Date()
  const staleBefore = new Date(claimedAt.getTime() - BOOKING_LIFECYCLE_SIDE_EFFECT_LEASE_MS)
  const [claimed] = await db
    .update(schema.calcomBookingLifecycle)
    .set({ sideEffectsClaimedAt: claimedAt, updatedAt: claimedAt })
    .where(
      and(
        eq(schema.calcomBookingLifecycle.calcomUid, lifecycle.calcomUid),
        eq(schema.calcomBookingLifecycle.mentorUserId, lifecycle.mentorUserId),
        eq(schema.calcomBookingLifecycle.state, lifecycle.state),
        eq(schema.calcomBookingLifecycle.eventCreatedAt, lifecycle.eventCreatedAt),
        isNull(schema.calcomBookingLifecycle.sideEffectsCompletedAt),
        or(
          isNull(schema.calcomBookingLifecycle.sideEffectsClaimedAt),
          lt(schema.calcomBookingLifecycle.sideEffectsClaimedAt, staleBefore)
        )
      )
    )
    .returning({ calcomUid: schema.calcomBookingLifecycle.calcomUid })

  return claimed ? claimedAt : null
}

export const getBookingLifecycle = async (calcomUid: string, mentorUserId: string) => {
  return (
    (await db.query.calcomBookingLifecycle.findFirst({
      where: and(
        eq(schema.calcomBookingLifecycle.calcomUid, calcomUid),
        eq(schema.calcomBookingLifecycle.mentorUserId, mentorUserId)
      ),
    })) ?? null
  )
}

/** Mark financial reconciliation complete only for the exact claimed decision. */
export const markBookingLifecycleSideEffectsCompleted = async (
  lifecycle: Pick<BookingLifecycle, 'calcomUid' | 'mentorUserId' | 'state' | 'eventCreatedAt'>,
  claimedAt: Date
) => {
  const completedAt = new Date()
  const [completed] = await db
    .update(schema.calcomBookingLifecycle)
    .set({
      sideEffectsClaimedAt: null,
      sideEffectsCompletedAt: completedAt,
      updatedAt: completedAt,
    })
    .where(
      and(
        eq(schema.calcomBookingLifecycle.calcomUid, lifecycle.calcomUid),
        eq(schema.calcomBookingLifecycle.mentorUserId, lifecycle.mentorUserId),
        eq(schema.calcomBookingLifecycle.state, lifecycle.state),
        eq(schema.calcomBookingLifecycle.eventCreatedAt, lifecycle.eventCreatedAt),
        eq(schema.calcomBookingLifecycle.sideEffectsClaimedAt, claimedAt),
        isNull(schema.calcomBookingLifecycle.sideEffectsCompletedAt)
      )
    )
    .returning({ calcomUid: schema.calcomBookingLifecycle.calcomUid })

  return Boolean(completed)
}

/** Release a failed lease so the durable inbox retry can claim it immediately. */
export const releaseBookingLifecycleSideEffectsClaim = async (
  lifecycle: Pick<BookingLifecycle, 'calcomUid' | 'mentorUserId' | 'state' | 'eventCreatedAt'>,
  claimedAt: Date
) => {
  await db
    .update(schema.calcomBookingLifecycle)
    .set({ sideEffectsClaimedAt: null, updatedAt: new Date() })
    .where(
      and(
        eq(schema.calcomBookingLifecycle.calcomUid, lifecycle.calcomUid),
        eq(schema.calcomBookingLifecycle.mentorUserId, lifecycle.mentorUserId),
        eq(schema.calcomBookingLifecycle.state, lifecycle.state),
        eq(schema.calcomBookingLifecycle.eventCreatedAt, lifecycle.eventCreatedAt),
        eq(schema.calcomBookingLifecycle.sideEffectsClaimedAt, claimedAt),
        isNull(schema.calcomBookingLifecycle.sideEffectsCompletedAt)
      )
    )
}

const getExistingBooking = async (calcomBookingUid: string) => {
  const existing = await db.query.booking.findFirst({
    where: eq(schema.booking.calcomUid, calcomBookingUid),
    columns: { id: true, status: true },
  })

  return existing ?? null
}

/**
 * Move a booking to a terminal state once. The result lets webhook callers
 * avoid duplicating side effects when Cal.com retries delivery.
 */
const transitionBookingOnce = async (
  calcomBookingUid: string,
  status: 'CANCELLED' | 'COMPLETED',
  fromStatus?: 'ACCEPTED'
) => {
  const statusCondition = fromStatus
    ? eq(schema.booking.status, fromStatus)
    : ne(schema.booking.status, status)
  const [result] = await db
    .update(schema.booking)
    .set({ status })
    .where(and(eq(schema.booking.calcomUid, calcomBookingUid), statusCondition))
    .returning({ id: schema.booking.id })

  if (result) {
    return { ...result, transitioned: true as const, missing: false as const }
  }

  const existing = await getExistingBooking(calcomBookingUid)
  if (!existing) {
    return { id: null, transitioned: false as const, missing: true as const }
  }
  return { id: existing.id, transitioned: false as const, missing: false as const }
}

/**
 * Complete an accepted booking exactly once. A no-show or cancelled booking is
 * not overwritten merely because Cal.com's scheduled end-time webhook fired.
 */
export const completeAcceptedBooking = async (calcomBookingUid: string) => {
  return transitionBookingOnce(calcomBookingUid, 'COMPLETED', 'ACCEPTED')
}

/**
 * Cancel a booking by Cal.com UID
 */
export const cancelBooking = async (calcomBookingUid: string) => {
  return transitionBookingOnce(calcomBookingUid, 'CANCELLED')
}

/** Record the reviewed financial disposition for a cancelled booking. */
export const setBookingMentorPayoutEligibility = async (
  calcomBookingUid: string,
  mentorPayoutEligible: boolean
) => {
  const [result] = await db
    .update(schema.booking)
    .set({ mentorPayoutEligible })
    .where(eq(schema.booking.calcomUid, calcomBookingUid))
    .returning({ id: schema.booking.id })

  if (!result) {
    throw new NotFoundError(`Booking with Cal.com UID ${calcomBookingUid} not found`)
  }

  return result
}

/**
 * Update booking status
 */
export const updateBookingStatus = async (
  calcomBookingUid: string,
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
  options?: {
    hostNoShow?: boolean
    attendeeNoShow?: boolean
  }
) => {
  const [result] = await db
    .update(schema.booking)
    .set({
      status,
      hostNoShow: options?.hostNoShow,
      attendeeNoShow: options?.attendeeNoShow,
    })
    .where(eq(schema.booking.calcomUid, calcomBookingUid))
    .returning({ id: schema.booking.id })

  if (!result) {
    throw new NotFoundError(`Booking with Cal.com UID ${calcomBookingUid} not found`)
  }

  return result
}
