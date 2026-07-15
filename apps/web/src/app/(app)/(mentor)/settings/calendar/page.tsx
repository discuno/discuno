import { CalendarCheck, ExternalLink, Link2, Link2Off, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { requirePermission } from '~/lib/auth/auth-utils'
import { getConnectionByUserId, hasProtectedCalcomBookings } from '~/server/dal/calcom'
import { disconnectCalcomAccount } from './actions'

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
  const [connection, hasProtectedBookings] = await Promise.all([
    getConnectionByUserId(user.id),
    hasProtectedCalcomBookings(user.id),
  ])
  const isConnected =
    connection?.authMode === 'oauth' && !connection.disconnectedAt && !!connection.connectedAt
  const isReady = isConnected && connection.webhookId !== null
  const statusMessage = params.calcom ? statusMessages[params.calcom] : undefined

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <Badge variant="outline" className="mb-3">
          Calendar
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Connect the calendar you already use
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
          Cal.com keeps your availability and existing calendar conflicts in sync. Discuno only
          requests the access needed to show times, create sessions, and keep bookings current.
        </p>
      </header>

      {statusMessage && (
        <div
          className="border-border bg-muted/40 rounded-lg border px-4 py-3 text-sm"
          role="status"
        >
          {statusMessage}
        </div>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Cal.com connection</CardTitle>
              <CardDescription className="mt-1.5">
                {isReady
                  ? `Connected as cal.com/${connection.calcomUsername}`
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
        <CardContent className="space-y-5">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <CalendarCheck className="text-primary mb-2 size-5" aria-hidden="true" />
              Avoid double bookings
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <Link2 className="text-primary mb-2 size-5" aria-hidden="true" />
              Keep times in sync
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <ShieldCheck className="text-primary mb-2 size-5" aria-hidden="true" />
              Revoke access anytime
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/api/integrations/calcom/connect?returnTo=/settings/calendar">
                {isConnected ? 'Reconnect Cal.com' : 'Continue with Cal.com'}
                <ExternalLink aria-hidden="true" />
              </Link>
            </Button>
            {isConnected && (
              <>
                <Button asChild variant="outline">
                  <a href="https://app.cal.com" target="_blank" rel="noreferrer">
                    Open Cal.com
                    <ExternalLink aria-hidden="true" />
                  </a>
                </Button>
                <form action={disconnectCalcomAccount}>
                  <Button
                    type="submit"
                    variant="ghost"
                    className="w-full sm:w-auto"
                    disabled={hasProtectedBookings}
                  >
                    <Link2Off aria-hidden="true" />
                    Disconnect
                  </Button>
                </form>
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
