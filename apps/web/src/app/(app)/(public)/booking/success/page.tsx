import { eq } from 'drizzle-orm'
import { CircleAlert, CircleCheckBig, Clock3, Home, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { z } from 'zod'
import { ClearBookingResultQuery } from '~/app/(app)/(public)/booking/success/ClearBookingResultQuery'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { requireAuth } from '~/lib/auth/auth-utils'
import { stripe } from '~/lib/stripe'
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
    eyebrow: 'Payment received',
    title: 'We’re confirming your time',
    description:
      'Your payment went through. Discuno is now finalizing the session with the mentor’s calendar. We’ll email the calendar invitation and meeting details as soon as that finishes.',
    note: 'This usually takes only a few minutes. Please do not start another checkout for the same time.',
    icon: CircleCheckBig,
    iconClassName: 'bg-success/12 text-success',
  },
  processing: {
    eyebrow: 'Payment processing',
    title: 'Your checkout is still settling',
    description:
      'We have your checkout and are waiting for the payment status to finish updating. Your session is not confirmed until the calendar invitation arrives.',
    note: 'Keep an eye on your email and avoid submitting another payment for the same time.',
    icon: Clock3,
    iconClassName: 'bg-warning/12 text-warning-foreground',
  },
  incomplete: {
    eyebrow: 'Checkout incomplete',
    title: 'No session was confirmed',
    description:
      'We could not confirm a completed payment from this checkout. You can return to the mentor’s profile and choose a time again.',
    note: 'If your bank shows a completed charge, contact support before trying another payment.',
    icon: CircleAlert,
    iconClassName: 'bg-muted text-muted-foreground',
  },
  unknown: {
    eyebrow: 'Status unavailable',
    title: 'We couldn’t verify this checkout',
    description:
      'This page does not contain a checkout we can verify. Do not assume a session is booked unless you receive a calendar invitation and meeting details.',
    note: 'If you completed payment, contact support before trying again so we can check it safely.',
    icon: CircleAlert,
    iconClassName: 'bg-destructive/10 text-destructive',
  },
} satisfies Record<
  CheckoutDisplayState,
  {
    eyebrow: string
    title: string
    description: string
    note: string
    icon: typeof CircleAlert
    iconClassName: string
  }
>

const BookingSuccessPage = async ({ searchParams }: BookingSuccessPageProps) => {
  const { attempt: attemptId } = await searchParams
  const state = await getCheckoutDisplayState(attemptId)
  const content = stateContent[state]
  const Icon = content.icon

  return (
    <div className="soft-grid px-4 py-16 sm:py-24">
      <ClearBookingResultQuery />
      <Card className="surface-panel mx-auto w-full max-w-xl overflow-hidden">
        <CardHeader className="items-center px-6 pt-8 text-center sm:px-10 sm:pt-10">
          <div
            className={`mb-4 flex size-14 items-center justify-center rounded-md border ${content.iconClassName}`}
          >
            <Icon className="size-7" />
          </div>
          <p className="eyebrow">{content.eyebrow}</p>
          <CardTitle className="mt-2 text-3xl tracking-[-0.035em]">{content.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 px-6 pb-8 text-center sm:px-10 sm:pb-10">
          <p className="text-muted-foreground max-w-md leading-7">{content.description}</p>

          <div className="paper-panel bg-accent/25 flex w-full items-start gap-3 p-4 text-left">
            <Mail className="text-primary mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground text-sm leading-6">{content.note}</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button render={<Link href="/#mentors" />} nativeButton={false} size="lg">
              <Home data-icon="inline-start" />
              Browse mentors
            </Button>
            {(state === 'unknown' || state === 'incomplete' || state === 'processing') && (
              <Button
                render={<Link href="/support" />}
                nativeButton={false}
                variant="outline"
                size="lg"
              >
                Contact support
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
