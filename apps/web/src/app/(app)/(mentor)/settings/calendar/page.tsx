import { CircleAlert, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { buttonVariants } from '~/components/ui/button'
import { requirePermission } from '~/lib/auth/auth-utils'
import { cn } from '~/lib/utils'
import {
  getActiveConnectionByUserId,
  getReadyConnectionByUserId,
  hasProtectedCalcomBookings,
} from '~/server/dal/calcom'
import { DisconnectCalendarButton } from './DisconnectCalendarButton'

type CalendarSettingsPageProps = {
  searchParams: Promise<{ calcom?: string }>
}

const statusMessages: Record<string, string> = {
  connected: 'Your calendar is connected and ready to sync.',
  connected_syncing:
    'Your account is connected. We are finishing the first calendar sync in the background.',
  connected_needs_sync:
    'Your account is connected, but setup could not finish. Reconnect to retry safely.',
  disconnected: 'Your calendar was disconnected and your session types were paused.',
  denied: 'Cal.com access was not granted. Nothing changed.',
  invalid_state: 'That connection attempt expired. Please try again.',
  error: 'Cal.com could not be connected. Please try again.',
  bookings_active:
    'This calendar cannot be changed while sessions or related payments are still active.',
}

export default async function CalendarSettingsPage({ searchParams }: CalendarSettingsPageProps) {
  const [{ user }, params] = await Promise.all([
    requirePermission({ mentor: ['manage'] }),
    searchParams,
  ])
  const [connection, readyConnection, hasProtectedBookings] = await Promise.all([
    getActiveConnectionByUserId(user.id),
    getReadyConnectionByUserId(user.id),
    hasProtectedCalcomBookings(user.id),
  ])
  const isConnected = connection !== null
  const isReady = readyConnection !== null
  const statusMessage = params.calcom ? statusMessages[params.calcom] : undefined

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
          Calendar
        </h1>
        <p className="text-muted-foreground text-sm leading-6">
          Connect the calendar Discuno uses for availability and sessions.
        </p>
      </header>

      {statusMessage && (
        <Alert role="status">
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      <section
        className="border-border flex flex-col gap-6 border-y py-6"
        aria-labelledby="calcom-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="calcom-title" className="text-lg font-semibold">
              Cal.com
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              {readyConnection
                ? `Connected as cal.com/${readyConnection.calcomUsername}`
                : isConnected
                  ? 'Connection approved; finishing the first sync'
                  : 'Required before students can book you'}
            </p>
          </div>
          <Badge variant={isReady ? 'success' : isConnected ? 'warning' : 'outline'}>
            {isReady ? 'Ready' : isConnected ? 'Finishing setup' : 'Not connected'}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/api/integrations/calcom/connect?returnTo=/settings/calendar"
            prefetch={false}
            className={cn(buttonVariants(), 'w-full sm:w-auto')}
          >
            {isConnected ? 'Reconnect Cal.com' : 'Continue with Cal.com'}
            <ExternalLink aria-hidden="true" data-icon="inline-end" />
          </Link>
          {isConnected && (
            <>
              <a
                href="https://app.cal.com"
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}
              >
                Open Cal.com
                <ExternalLink aria-hidden="true" data-icon="inline-end" />
              </a>
              <DisconnectCalendarButton disabled={hasProtectedBookings} />
            </>
          )}
        </div>

        {!isConnected && (
          <p className="text-muted-foreground text-sm leading-6">
            Sign in or create a Cal.com account, approve access, and you&apos;ll return here
            automatically.
          </p>
        )}

        {hasProtectedBookings && (
          <Alert>
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Calendar changes are paused</AlertTitle>
            <AlertDescription>
              Keep this connection in place until active sessions and their payments are settled.
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  )
}
