import { and, eq, exists, isNotNull, lt, notExists, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { isAuthorizedCronRequest, runExclusiveCron } from '~/lib/cron'
import { scrubLegacyBookingWebhookPayloads } from '~/server/dal/booking-audit'
import {
  purgeTerminalCheckoutSlotReservations,
  releaseExpiredCheckoutSlotReservations,
} from '~/server/dal/checkout-slot-reservations'
import { db } from '~/server/db'
import {
  calcomWebhookCleanup,
  calcomWebhookInbox,
  anonymousUserLink,
  session,
  stripeWebhookInbox,
  user,
  verification,
} from '~/server/db/schema/index'

export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const result = await runExclusiveCron({
    name: 'cleanup-auth',
    task: async () => {
      const now = new Date()
      const expiredSessions = await db
        .delete(session)
        .where(lt(session.expiresAt, now))
        .returning({ id: session.id })
      const expiredVerifications = await db
        .delete(verification)
        .where(lt(verification.expiresAt, now))
        .returning({ id: verification.id })

      // The anonymous-link callback revokes guest sessions transactionally.
      // This durable fallback removes a guest row if Better Auth's subsequent
      // best-effort delete failed after the identity migration committed.
      const linkedAnonymousUsers = await db
        .delete(user)
        .where(
          and(
            eq(user.isAnonymous, true),
            exists(
              db
                .select({ anonymousUserId: anonymousUserLink.anonymousUserId })
                .from(anonymousUserLink)
                .where(eq(anonymousUserLink.anonymousUserId, user.id))
            )
          )
        )
        .returning({ id: user.id })

      // Anonymous browsing identities are disposable. Retain them for 90 days,
      // then remove only users with no remaining session; dependent rows use the
      // schema's cascade/set-null policies.
      const anonymousCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const expiredAnonymousUsers = await db
        .delete(user)
        .where(
          and(
            eq(user.isAnonymous, true),
            lt(user.createdAt, anonymousCutoff),
            notExists(
              db.select({ id: session.id }).from(session).where(eq(session.userId, user.id))
            )
          )
        )
        .returning({ id: user.id })

      // Older booking rows duplicated Cal.com's full signed payload indefinitely.
      // Scrub a bounded, idempotent batch on every run until the legacy backlog is gone.
      const scrubbedLegacyBookingWebhookPayloads = await scrubLegacyBookingWebhookPayloads()

      // Provider holds and Stripe Checkout Sessions expire independently. Once
      // both deadlines are past, clear the nullable mentor reference so a stale
      // prepayment attempt cannot block an otherwise-safe account deletion.
      const releasedExpiredCheckoutReservationRows = await releaseExpiredCheckoutSlotReservations({
        now,
      })

      const webhookInboxCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const expiredCalcomWebhookRows = await db
        .delete(calcomWebhookInbox)
        .where(
          or(
            and(
              isNotNull(calcomWebhookInbox.processedAt),
              lt(calcomWebhookInbox.processedAt, webhookInboxCutoff)
            ),
            and(
              isNotNull(calcomWebhookInbox.quarantinedAt),
              lt(calcomWebhookInbox.quarantinedAt, webhookInboxCutoff)
            )
          )
        )
        .returning({ id: calcomWebhookInbox.id })

      const expiredCalcomWebhookCleanupRows = await db
        .delete(calcomWebhookCleanup)
        .where(
          or(
            and(
              isNotNull(calcomWebhookCleanup.processedAt),
              lt(calcomWebhookCleanup.processedAt, webhookInboxCutoff)
            ),
            and(
              isNotNull(calcomWebhookCleanup.quarantinedAt),
              lt(calcomWebhookCleanup.quarantinedAt, webhookInboxCutoff)
            )
          )
        )
        .returning({ id: calcomWebhookCleanup.id })

      const expiredCheckoutReservationRows = await purgeTerminalCheckoutSlotReservations({ now })

      const expiredStripeWebhookRows = await db
        .delete(stripeWebhookInbox)
        .where(
          or(
            and(
              isNotNull(stripeWebhookInbox.processedAt),
              lt(stripeWebhookInbox.processedAt, webhookInboxCutoff)
            ),
            and(
              isNotNull(stripeWebhookInbox.quarantinedAt),
              lt(stripeWebhookInbox.quarantinedAt, webhookInboxCutoff)
            )
          )
        )
        .returning({ id: stripeWebhookInbox.id })

      return {
        expiredSessions: expiredSessions.length,
        expiredVerifications: expiredVerifications.length,
        linkedAnonymousUsers: linkedAnonymousUsers.length,
        expiredAnonymousUsers: expiredAnonymousUsers.length,
        scrubbedLegacyBookingWebhookPayloads,
        releasedExpiredCheckoutReservationRows,
        expiredCalcomWebhookCleanupRows: expiredCalcomWebhookCleanupRows.length,
        expiredCheckoutReservationRows,
        expiredCalcomWebhookRows: expiredCalcomWebhookRows.length,
        expiredStripeWebhookRows: expiredStripeWebhookRows.length,
      }
    },
  })

  if (result.status === 'already_running') {
    return NextResponse.json({ message: 'Cleanup already running', skipped: true })
  }

  return NextResponse.json({
    message: 'Cleanup complete',
    ...result.value,
  })
}
