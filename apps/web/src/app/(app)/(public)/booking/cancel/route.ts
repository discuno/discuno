import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '~/lib/auth/auth-utils'
import { ExternalApiError } from '~/lib/errors'
import { getSafeErrorName } from '~/lib/operational-logging'
import {
  getCheckoutAttemptLockKey,
  releaseCheckoutSlotReservation,
} from '~/lib/services/checkout-slot-reservation'
import { stripe } from '~/lib/stripe'
import { db } from '~/server/db'
import { withDatabaseAdvisoryLock } from '~/server/db/advisory-lock'
import { checkoutSlotReservation } from '~/server/db/schema'
import { resolveCanonicalUserId } from '~/server/dal/user-identities'

const AttemptIdSchema = z.uuid()
const GenerationSchema = z.coerce.number().int().positive()
const MentorReturnPathSchema = z.string().regex(/^\/mentor\/[a-zA-Z0-9._-]{3,100}$/)

const getReturnPath = (requestUrl: URL): string => {
  const parsed = MentorReturnPathSchema.safeParse(requestUrl.searchParams.get('returnTo'))
  return parsed.success ? parsed.data : '/'
}

const redirectWithStatus = (requestUrl: URL, returnPath: string, status: string) => {
  const destination = new URL(returnPath, requestUrl.origin)
  destination.searchParams.set('checkout', status)
  return NextResponse.redirect(destination)
}

/** Explicit Stripe cancel return: expire Checkout before releasing its Cal.com hold. */
export const GET = async (request: Request) => {
  const requestUrl = new URL(request.url)
  const returnPath = getReturnPath(requestUrl)
  const attemptId = AttemptIdSchema.safeParse(requestUrl.searchParams.get('attempt'))
  const generation = GenerationSchema.safeParse(requestUrl.searchParams.get('generation'))
  if (!attemptId.success || !generation.success) {
    return redirectWithStatus(requestUrl, returnPath, 'cancel_error')
  }

  try {
    const { user } = await requireAuth()
    return await withDatabaseAdvisoryLock(getCheckoutAttemptLockKey(attemptId.data), async () => {
      const record = await db.query.checkoutSlotReservation.findFirst({
        where: eq(checkoutSlotReservation.bookingAttemptId, attemptId.data),
      })
      if (!record || record.generation !== generation.data) {
        return redirectWithStatus(requestUrl, returnPath, 'cancelled')
      }

      const [requestActorId, storedActorId] = await Promise.all([
        resolveCanonicalUserId(user.id),
        resolveCanonicalUserId(record.actorUserId),
      ])
      if ((requestActorId ?? user.id) !== (storedActorId ?? record.actorUserId)) {
        return redirectWithStatus(requestUrl, '/', 'cancel_error')
      }

      if (record.stripeCheckoutSessionId) {
        const session = await stripe.checkout.sessions.retrieve(record.stripeCheckoutSessionId)
        if (session.status === 'complete') {
          const successUrl = new URL('/booking/success', requestUrl.origin)
          successUrl.searchParams.set('session_id', session.id)
          return NextResponse.redirect(successUrl)
        }
        if (session.status === 'open') {
          const expiredSession = await stripe.checkout.sessions.expire(session.id)
          if (expiredSession.status !== 'expired') {
            throw new ExternalApiError('Stripe Checkout expiry could not be confirmed')
          }
        } else if (session.status !== 'expired') {
          // A nullable/unknown provider status is not proof that this Session
          // cannot still settle. Retain the Cal.com hold and retry safely.
          throw new ExternalApiError('Stripe Checkout status could not be confirmed')
        }
      }

      if (
        record.mentorUserId &&
        record.calcomReservationUid &&
        !record.releasedAt &&
        !record.consumedAt
      ) {
        await releaseCheckoutSlotReservation({
          bookingAttemptId: record.bookingAttemptId,
          reservationUid: record.calcomReservationUid,
          mentorUserId: record.mentorUserId,
        })
      }
      return redirectWithStatus(requestUrl, returnPath, 'cancelled')
    })
  } catch (error) {
    console.error('Checkout cancellation cleanup failed', { errorName: getSafeErrorName(error) })
    return redirectWithStatus(requestUrl, returnPath, 'cancel_error')
  }
}
