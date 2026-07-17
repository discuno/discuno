import { CalendarCheck, ExternalLink, Link2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { requirePermission } from '~/lib/auth/auth-utils'
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col items-start gap-3">
        <Badge variant="outline">Calendar</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Connect the calendar you already use
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-7">
          Cal.com keeps your availability and existing calendar conflicts in sync. Discuno only
          requests the access needed to show times, create sessions, and keep bookings current.
        </p>
      </header>

      {statusMessage && (
        <Alert role="status">
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Cal.com connection</CardTitle>
              <CardDescription>
                {readyConnection
                  ? `Connected as cal.com/${readyConnection.calcomUsername}`
                  : isConnected
                    ? 'Connection approved; finishing the first sync'
                    : 'Required before students can book you'}
              </CardDescription>
            </div>
            <Badge variant={isReady ? 'secondary' : 'outline'}>
              {isReady ? 'Ready' : isConnected ? 'Finishing setup' : 'Not connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ul className="grid gap-3 text-sm sm:grid-cols-3">
            <li className="bg-muted/50 flex flex-col items-start gap-2 rounded-lg p-3">
              <CalendarCheck className="text-primary size-5" aria-hidden="true" />
              Avoid double bookings
            </li>
            <li className="bg-muted/50 flex flex-col items-start gap-2 rounded-lg p-3">
              <Link2 className="text-primary size-5" aria-hidden="true" />
              Keep times in sync
            </li>
            <li className="bg-muted/50 flex flex-col items-start gap-2 rounded-lg p-3">
              <ShieldCheck className="text-primary size-5" aria-hidden="true" />
              Disconnect after sessions settle
            </li>
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              render={<Link href="/api/integrations/calcom/connect?returnTo=/settings/calendar" />}
              nativeButton={false}
            >
              {isConnected ? 'Reconnect Cal.com' : 'Continue with Cal.com'}
              <ExternalLink aria-hidden="true" data-icon="inline-end" />
            </Button>
            {isConnected && (
              <>
                <Button
                  render={<a href="https://app.cal.com" target="_blank" rel="noreferrer" />}
                  nativeButton={false}
                  variant="outline"
                >
                  Open Cal.com
                  <ExternalLink aria-hidden="true" data-icon="inline-end" />
                </Button>
                <DisconnectCalendarButton disabled={hasProtectedBookings} />
              </>
            )}
          </div>
          {!isConnected && (
            <p className="text-muted-foreground text-sm">
              Sign in or create your Cal.com account, approve access, and you&apos;ll return here
              automatically.
            </p>
          )}
          {hasProtectedBookings && (
            <p className="text-muted-foreground text-sm">
              Keep this connection in place until active sessions and their payments are settled.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
