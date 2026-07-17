import 'server-only'

import { and, eq, gt, inArray, isNotNull, isNull, notInArray, or } from 'drizzle-orm'
import { InternalServerError } from '~/lib/errors'
import type { NewCalcomToken } from '~/lib/schemas/db'
import { insertCalcomTokenSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import { withDatabaseAdvisoryLock } from '~/server/db/advisory-lock'
import {
  booking,
  bookingOrganizer,
  calcomToken,
  calcomWebhookCleanup,
  checkoutSlotReservation,
  mentorEventType,
  payment,
} from '~/server/db/schema/index'

export class CalcomConnectionHasProtectedBookingsError extends Error {
  constructor() {
    super('Active or unsettled bookings must finish before changing the Cal.com account')
    this.name = 'CalcomConnectionHasProtectedBookingsError'
  }
}

const getProtectedBookingCondition = () =>
  or(
    and(inArray(booking.status, ['PENDING', 'ACCEPTED']), gt(booking.endTime, new Date())),
    and(
      isNotNull(payment.id),
      or(
        notInArray(payment.platformStatus, ['FAILED', 'REFUNDED', 'TRANSFERRED']),
        eq(payment.requiresManualReview, true)
      )
    )
  )

const getUnsettledMentorPaymentCondition = (userId: string) =>
  and(
    eq(payment.mentorUserId, userId),
    or(
      inArray(payment.platformStatus, ['PROCESSING', 'SUCCEEDED', 'DISPUTED']),
      and(eq(payment.platformStatus, 'PENDING'), eq(payment.stripeStatus, 'complete')),
      eq(payment.requiresManualReview, true)
    )
  )

// The nullable mentor FK is the handoff guard: cleanup clears it only after an
// exact payment row takes over or Stripe proves the Session expired. Local hold
// clocks must never weaken that stronger provider-aware invariant.
const getActiveCheckoutReservationCondition = (userId: string) =>
  and(eq(checkoutSlotReservation.mentorUserId, userId), isNull(checkoutSlotReservation.consumedAt))

export const hasProtectedCalcomBookings = async (userId: string): Promise<boolean> => {
  const [protectedBooking] = await db
    .select({ id: booking.id })
    .from(booking)
    .innerJoin(bookingOrganizer, eq(bookingOrganizer.bookingId, booking.id))
    .leftJoin(payment, eq(payment.id, booking.paymentId))
    .where(and(eq(bookingOrganizer.userId, userId), getProtectedBookingCondition()))
    .limit(1)
  if (protectedBooking) return true

  // A paid Checkout can settle before its Cal.com snapshot exists. Account
  // replacement during that window can strand a live booking under the old
  // credentials, so settled/in-flight financial rows independently block it.
  const [unsettledPayment] = await db
    .select({ id: payment.id })
    .from(payment)
    .where(getUnsettledMentorPaymentCondition(userId))
    .limit(1)
  if (unsettledPayment) return true

  const [activeCheckout] = await db
    .select({ id: checkoutSlotReservation.bookingAttemptId })
    .from(checkoutSlotReservation)
    .where(getActiveCheckoutReservationCondition(userId))
    .limit(1)
  return Boolean(activeCheckout)
}

export type CalcomConnection = {
  id: number
  userId: string
  calcomUserId: number
  calcomUsername: string
  authMode: 'legacy_platform' | 'oauth'
  scopes: string | null
  webhookId: string | null
  accessTokenExpiresAt: Date | null
  connectedAt: Date | null
  disconnectedAt: Date | null
}

export type StoredCalcomCredentials = CalcomConnection & {
  accessToken: string | null
  refreshToken: string | null
  refreshTokenExpiresAt: Date | null
}

const connectionSelection = {
  id: calcomToken.id,
  userId: calcomToken.userId,
  calcomUserId: calcomToken.calcomUserId,
  calcomUsername: calcomToken.calcomUsername,
  authMode: calcomToken.authMode,
  scopes: calcomToken.scopes,
  webhookId: calcomToken.webhookId,
  accessTokenExpiresAt: calcomToken.accessTokenExpiresAt,
  connectedAt: calcomToken.connectedAt,
  disconnectedAt: calcomToken.disconnectedAt,
} as const

const activeOAuthConditions = [
  eq(calcomToken.authMode, 'oauth'),
  isNull(calcomToken.disconnectedAt),
  isNotNull(calcomToken.accessToken),
  isNotNull(calcomToken.refreshToken),
] as const

/**
 * Canonical readiness contract shared by connection resolution and public
 * mentor discovery. A webhook ID without its route/signing identity is still
 * provisioning and must not be treated as bookable.
 */
export const readyCalcomOAuthConditions = [
  ...activeOAuthConditions,
  isNotNull(calcomToken.webhookId),
  isNotNull(calcomToken.webhookSecret),
  isNotNull(calcomToken.webhookRouteKey),
  isNotNull(calcomToken.webhookRouteKeyHash),
] as const

export const getConnectionByUserId = async (userId: string): Promise<CalcomConnection | null> => {
  const [connection] = await db
    .select({
      ...connectionSelection,
    })
    .from(calcomToken)
    .where(eq(calcomToken.userId, userId))
    .limit(1)
  return connection ?? null
}

export const getActiveConnectionByUserId = async (
  userId: string
): Promise<CalcomConnection | null> => {
  const [connection] = await db
    .select(connectionSelection)
    .from(calcomToken)
    .where(and(eq(calcomToken.userId, userId), ...activeOAuthConditions))
    .limit(1)
  return connection ?? null
}

export const getReadyConnectionByUserId = async (
  userId: string
): Promise<CalcomConnection | null> => {
  const [connection] = await db
    .select(connectionSelection)
    .from(calcomToken)
    .where(and(eq(calcomToken.userId, userId), ...readyCalcomOAuthConditions))
    .limit(1)
  return connection ?? null
}

export const getStoredCredentialsByUserId = async (
  userId: string
): Promise<StoredCalcomCredentials | null> => {
  const [connection] = await db
    .select({
      ...connectionSelection,
      accessToken: calcomToken.accessToken,
      refreshToken: calcomToken.refreshToken,
      refreshTokenExpiresAt: calcomToken.refreshTokenExpiresAt,
    })
    .from(calcomToken)
    .where(eq(calcomToken.userId, userId))
    .limit(1)
  return connection ?? null
}

export const getUsernameByUserId = async (
  userId: string
): Promise<{ calcomUsername: string; calcomUserId: number } | null> => {
  const connection = await getReadyConnectionByUserId(userId)
  return connection
    ? {
        calcomUsername: connection.calcomUsername,
        calcomUserId: connection.calcomUserId,
      }
    : null
}

export const getConnectionByUsername = async (
  username: string
): Promise<CalcomConnection | null> => {
  const [connection] = await db
    .select({
      ...connectionSelection,
    })
    .from(calcomToken)
    .where(and(eq(calcomToken.calcomUsername, username), ...readyCalcomOAuthConditions))
    .limit(1)
  return connection ?? null
}

export type CalcomConnectionWriteResult = {
  cleanupId: number | null
}

/**
 * Replace a Cal.com connection without orphaning the prior account's webhook.
 * The cleanup row and new connection commit atomically; a worker can therefore
 * retry provider deletion even after the old credentials leave the active row.
 */
export const storeCalcomConnection = async (
  data: NewCalcomToken
): Promise<CalcomConnectionWriteResult> => {
  const validData = insertCalcomTokenSchema.parse(data)
  return withDatabaseAdvisoryLock(`discuno:calcom-connection:${validData.userId}`, () =>
    db.transaction(async tx => {
      const [current] = await tx
        .select()
        .from(calcomToken)
        .where(eq(calcomToken.userId, validData.userId))
        .limit(1)

      let cleanupId: number | null = null
      const supersededAt = new Date()
      const supersededCleanups = await tx
        .update(calcomWebhookCleanup)
        .set({
          accessToken: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          processedAt: supersededAt,
          lastError: 'Cleanup superseded by reconnecting the same Cal.com account',
          updatedAt: supersededAt,
        })
        .where(
          and(
            eq(calcomWebhookCleanup.userId, validData.userId),
            eq(calcomWebhookCleanup.calcomUserId, validData.calcomUserId),
            isNull(calcomWebhookCleanup.processedAt),
            isNull(calcomWebhookCleanup.quarantinedAt),
            isNull(calcomWebhookCleanup.processingStartedAt)
          )
        )
        .returning({ webhookId: calcomWebhookCleanup.webhookId })
      const reusableWebhookId = supersededCleanups[0]?.webhookId ?? null

      if (current && current.calcomUserId !== validData.calcomUserId) {
        const [protectedBooking] = await tx
          .select({ id: booking.id })
          .from(booking)
          .innerJoin(bookingOrganizer, eq(bookingOrganizer.bookingId, booking.id))
          .leftJoin(payment, eq(payment.id, booking.paymentId))
          .where(and(eq(bookingOrganizer.userId, validData.userId), getProtectedBookingCondition()))
          .limit(1)
        if (protectedBooking) throw new CalcomConnectionHasProtectedBookingsError()

        const [unsettledPayment] = await tx
          .select({ id: payment.id })
          .from(payment)
          .where(getUnsettledMentorPaymentCondition(validData.userId))
          .limit(1)
        if (unsettledPayment) throw new CalcomConnectionHasProtectedBookingsError()

        const [activeCheckout] = await tx
          .select({ id: checkoutSlotReservation.bookingAttemptId })
          .from(checkoutSlotReservation)
          .where(getActiveCheckoutReservationCondition(validData.userId))
          .limit(1)
        if (activeCheckout) throw new CalcomConnectionHasProtectedBookingsError()
      }

      if (
        current?.authMode === 'oauth' &&
        current.calcomUserId !== validData.calcomUserId &&
        current.webhookId !== null
      ) {
        const previousWebhookId = current.webhookId
        const [insertedCleanup] = await tx
          .insert(calcomWebhookCleanup)
          .values({
            userId: validData.userId,
            calcomUserId: current.calcomUserId,
            webhookId: previousWebhookId,
            accessToken: current.accessToken,
            refreshToken: current.refreshToken,
            accessTokenExpiresAt: current.accessTokenExpiresAt,
          })
          .onConflictDoNothing({ target: calcomWebhookCleanup.webhookId })
          .returning({ id: calcomWebhookCleanup.id })
        const [existingCleanup] = insertedCleanup
          ? [insertedCleanup]
          : await tx
              .select({ id: calcomWebhookCleanup.id })
              .from(calcomWebhookCleanup)
              .where(eq(calcomWebhookCleanup.webhookId, previousWebhookId))
              .limit(1)
        cleanupId = existingCleanup?.id ?? null
      }

      const canPreserveWebhookReadiness =
        current?.authMode === 'oauth' &&
        !current.disconnectedAt &&
        current.calcomUserId === validData.calcomUserId &&
        current.webhookId !== null
      const activeWebhookId = canPreserveWebhookReadiness ? current.webhookId : reusableWebhookId
      const canPreserveWebhookIdentity =
        canPreserveWebhookReadiness &&
        current.webhookSecret !== null &&
        current.webhookRouteKey !== null &&
        current.webhookRouteKeyHash !== null

      const result = await tx
        .insert(calcomToken)
        .values({
          ...validData,
          webhookId: activeWebhookId ?? validData.webhookId,
          webhookSecret: canPreserveWebhookIdentity ? current.webhookSecret : null,
          webhookRouteKey: canPreserveWebhookIdentity ? current.webhookRouteKey : null,
          webhookRouteKeyHash: canPreserveWebhookIdentity ? current.webhookRouteKeyHash : null,
        })
        .onConflictDoUpdate({
          target: calcomToken.userId,
          set: {
            calcomUserId: validData.calcomUserId,
            calcomUsername: validData.calcomUsername,
            accessToken: validData.accessToken,
            refreshToken: validData.refreshToken,
            accessTokenExpiresAt: validData.accessTokenExpiresAt,
            refreshTokenExpiresAt: validData.refreshTokenExpiresAt,
            authMode: validData.authMode,
            tokenType: validData.tokenType,
            scopes: validData.scopes,
            webhookId: activeWebhookId ?? validData.webhookId,
            webhookSecret: canPreserveWebhookIdentity ? current.webhookSecret : null,
            webhookRouteKey: canPreserveWebhookIdentity ? current.webhookRouteKey : null,
            webhookRouteKeyHash: canPreserveWebhookIdentity ? current.webhookRouteKeyHash : null,
            connectedAt: validData.connectedAt,
            disconnectedAt: validData.disconnectedAt,
            lastRefreshAt: validData.lastRefreshAt,
            updatedAt: new Date(),
          },
        })
        .returning({ userId: calcomToken.userId })

      if (result.length === 0) {
        throw new InternalServerError('Failed to store Cal.com connection')
      }
      return { cleanupId }
    })
  )
}

export const updateCalcomOAuthCredentials = async ({
  userId,
  accessToken,
  refreshToken,
  accessTokenExpiresAt,
  scopes,
}: {
  userId: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  scopes: string
}): Promise<void> => {
  const [updated] = await db
    .update(calcomToken)
    .set({
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      scopes,
      lastRefreshAt: new Date(),
      disconnectedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(calcomToken.userId, userId), eq(calcomToken.authMode, 'oauth')))
    .returning({ id: calcomToken.id })
  if (!updated) throw new InternalServerError('Failed to refresh Cal.com credentials')
}

export const updateCalcomWebhookId = async (
  userId: string,
  webhookId: string | null
): Promise<void> => {
  await db
    .update(calcomToken)
    .set({ webhookId, updatedAt: new Date() })
    .where(and(eq(calcomToken.userId, userId), eq(calcomToken.authMode, 'oauth')))
}

export const disconnectCalcomConnection = async (
  userId: string
): Promise<CalcomConnectionWriteResult> => {
  return withDatabaseAdvisoryLock(`discuno:calcom-connection:${userId}`, () =>
    db.transaction(async tx => {
      const [current] = await tx
        .select()
        .from(calcomToken)
        .where(eq(calcomToken.userId, userId))
        .limit(1)

      const [protectedBooking] = await tx
        .select({ id: booking.id })
        .from(booking)
        .innerJoin(bookingOrganizer, eq(bookingOrganizer.bookingId, booking.id))
        .leftJoin(payment, eq(payment.id, booking.paymentId))
        .where(and(eq(bookingOrganizer.userId, userId), getProtectedBookingCondition()))
        .limit(1)
      if (protectedBooking) throw new CalcomConnectionHasProtectedBookingsError()

      const [unsettledPayment] = await tx
        .select({ id: payment.id })
        .from(payment)
        .where(getUnsettledMentorPaymentCondition(userId))
        .limit(1)
      if (unsettledPayment) throw new CalcomConnectionHasProtectedBookingsError()

      const [activeCheckout] = await tx
        .select({ id: checkoutSlotReservation.bookingAttemptId })
        .from(checkoutSlotReservation)
        .where(getActiveCheckoutReservationCondition(userId))
        .limit(1)
      if (activeCheckout) throw new CalcomConnectionHasProtectedBookingsError()

      let cleanupId: number | null = null
      if (current?.authMode === 'oauth' && current.webhookId !== null) {
        const [insertedCleanup] = await tx
          .insert(calcomWebhookCleanup)
          .values({
            userId,
            calcomUserId: current.calcomUserId,
            webhookId: current.webhookId,
            accessToken: current.accessToken,
            refreshToken: current.refreshToken,
            accessTokenExpiresAt: current.accessTokenExpiresAt,
          })
          .onConflictDoNothing({ target: calcomWebhookCleanup.webhookId })
          .returning({ id: calcomWebhookCleanup.id })
        const [existingCleanup] = insertedCleanup
          ? [insertedCleanup]
          : await tx
              .select({ id: calcomWebhookCleanup.id })
              .from(calcomWebhookCleanup)
              .where(eq(calcomWebhookCleanup.webhookId, current.webhookId))
              .limit(1)
        cleanupId = existingCleanup?.id ?? null
      }

      const now = new Date()
      await tx
        .update(mentorEventType)
        .set({ isEnabled: false, updatedAt: now })
        .where(eq(mentorEventType.mentorUserId, userId))
      await tx
        .update(calcomToken)
        .set({
          accessToken: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          webhookId: null,
          webhookSecret: null,
          webhookRouteKey: null,
          webhookRouteKeyHash: null,
          disconnectedAt: now,
          updatedAt: now,
        })
        .where(eq(calcomToken.userId, userId))

      return { cleanupId }
    })
  )
}

export const markCalcomWebhookCleanupQueued = async (cleanupId: number): Promise<void> => {
  const now = new Date()
  await db
    .update(calcomWebhookCleanup)
    .set({ queuedAt: now, updatedAt: now })
    .where(
      and(
        eq(calcomWebhookCleanup.id, cleanupId),
        isNull(calcomWebhookCleanup.processedAt),
        isNull(calcomWebhookCleanup.quarantinedAt)
      )
    )
}

export const getUserIdByCalcomUserId = async (calcomUserId: number): Promise<string | null> => {
  const [result] = await db
    .select({ userId: calcomToken.userId })
    .from(calcomToken)
    .where(and(eq(calcomToken.calcomUserId, calcomUserId), ...readyCalcomOAuthConditions))
    .limit(1)
  return result?.userId ?? null
}
