import { eq } from 'drizzle-orm'
import { CircleAlert, CircleCheckBig, Clock3, Mail, Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { z } from 'zod'
import { ClearBookingResultQuery } from '~/app/(app)/(public)/booking/success/ClearBookingResultQuery'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { buttonVariants } from '~/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'
import { requireAuth } from '~/lib/auth/auth-utils'
import { stripe } from '~/lib/stripe'
import { cn } from '~/lib/utils'
import { db } from '~/server/db'
import { checkoutSlotReservation } from '~/server/db/schema'
import { resolveCanonicalUserId } from '~/server/dal/user-identities'

interface BookingSuccessPageProps {
  searchParams: Promise<{ attempt?: string }>
}

type CheckoutDisplayState = 'received' | 'processing' | 'incomplete' | 'unknown'

const BookingAttemptIdSchema = z.uuid()

async function getCheckoutDisplayState(
  attemptId: string | undefined
): Promise<CheckoutDisplayState> {
  const parsedAttemptId = BookingAttemptIdSchema.safeParse(attemptId)
  if (!parsedAttemptId.success) return 'unknown'

  try {
    const { user } = await requireAuth()
    const reservation = await db.query.checkoutSlotReservation.findFirst({
      where: eq(checkoutSlotReservation.bookingAttemptId, parsedAttemptId.data),
    })
    if (!reservation?.stripeCheckoutSessionId) return 'unknown'

    const [viewerId, reservationActorId] = await Promise.all([
      resolveCanonicalUserId(user.id),
      resolveCanonicalUserId(reservation.actorUserId),
    ])
    if ((viewerId ?? user.id) !== (reservationActorId ?? reservation.actorUserId)) return 'unknown'

    const session = await stripe.checkout.sessions.retrieve(reservation.stripeCheckoutSessionId)

    if (session.status === 'complete' && session.payment_status === 'paid') return 'received'
    if (session.status === 'complete') return 'processing'
    return 'incomplete'
  } catch {
    return 'unknown'
  }
}

const stateContent = {
  received: {
    label: 'Payment received',
    title: 'We’re confirming your time',
    description:
      'Your payment was received. Discuno is finalizing the session with the mentor’s calendar. The calendar invitation and meeting details will arrive by email when it is confirmed.',
    note: 'Do not start another checkout for this time while confirmation is pending.',
    icon: CircleCheckBig,
    mediaClassName: 'bg-success/12 text-success',
  },
  processing: {
    label: 'Payment processing',
    title: 'Your checkout is still settling',
    description:
      'The checkout is complete, but its payment status is still updating. The session is not confirmed until the calendar invitation arrives.',
    note: 'Keep an eye on your email and avoid submitting another payment for the same time.',
    icon: Clock3,
    mediaClassName: 'bg-warning/12 text-warning-foreground',
  },
  incomplete: {
    label: 'Checkout incomplete',
    title: 'No session was confirmed',
    description:
      'This checkout did not produce a completed payment, so no session was confirmed. Return to the mentor’s profile to choose a time again.',
    note: 'If your bank shows a completed charge, contact support before trying another payment.',
    icon: CircleAlert,
    mediaClassName: 'bg-muted text-muted-foreground',
  },
  unknown: {
    label: 'Status unavailable',
    title: 'We couldn’t verify this checkout',
    description:
      'This page does not contain a checkout we can verify. Do not assume a session is booked unless you receive a calendar invitation and meeting details.',
    note: 'If you completed payment, contact support before trying again so we can check it safely.',
    icon: CircleAlert,
    mediaClassName: 'bg-destructive/10 text-destructive',
  },
} satisfies Record<
  CheckoutDisplayState,
  {
    label: string
    title: string
    description: string
    note: string
    icon: typeof CircleAlert
    mediaClassName: string
  }
>

const BookingSuccessPage = async ({ searchParams }: BookingSuccessPageProps) => {
  const { attempt: attemptId } = await searchParams
  const state = await getCheckoutDisplayState(attemptId)
  const content = stateContent[state]
  const Icon = content.icon

  return (
    <>
      <ClearBookingResultQuery />
      <section
        className="mx-auto flex w-full max-w-xl items-center px-4 py-16 sm:px-6 sm:py-24"
        aria-labelledby="booking-status-title"
      >
        <Empty className="w-full py-0 md:py-0">
          <EmptyHeader className="max-w-md gap-3">
            <EmptyMedia variant="icon" className={content.mediaClassName}>
              <Icon aria-hidden="true" />
            </EmptyMedia>
            <p className="text-muted-foreground text-sm font-medium">{content.label}</p>
            <EmptyTitle
              id="booking-status-title"
              role="heading"
              aria-level={1}
              className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl"
            >
              {content.title}
            </EmptyTitle>
            <EmptyDescription className="text-base leading-7">
              {content.description}
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent className="max-w-md">
            <Alert variant={state === 'unknown' ? 'destructive' : 'default'} className="text-left">
              <Mail aria-hidden="true" />
              <AlertDescription>{content.note}</AlertDescription>
            </Alert>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/find" className={buttonVariants({ size: 'lg' })}>
                <Search data-icon="inline-start" aria-hidden="true" />
                Browse mentors
              </Link>
              {(state === 'unknown' || state === 'incomplete' || state === 'processing') && (
                <Link
                  href="/support"
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
                >
                  Contact support
                </Link>
              )}
            </div>
          </EmptyContent>
        </Empty>
      </section>
    </>
  )
}

export default BookingSuccessPage

export const metadata: Metadata = {
  title: 'Booking status | Discuno',
  description: 'Check the status of your Discuno session checkout.',
  referrer: 'no-referrer',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
}
