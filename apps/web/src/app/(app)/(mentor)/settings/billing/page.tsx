import { connection } from 'next/dist/server/request/connection'
import Link from 'next/link'
import { getMentorStripeStatus } from '~/app/(app)/(mentor)/settings/actions'
import { StripeDashboard } from '~/app/(app)/(mentor)/settings/billing/StripeDashboard'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export default async function DashboardPage() {
  await connection()
  const stripeStatus = await getMentorStripeStatus()

  if (
    !stripeStatus.success ||
    !stripeStatus.data ||
    !stripeStatus.data.isActive ||
    !stripeStatus.data.onboardingCompleted
  ) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Complete Stripe Setup Required</CardTitle>
            <CardDescription>
              You need to complete your Stripe account setup and verification before accessing
              billing settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To access billing settings and accept payments, you&apos;ll need to complete your
              Stripe account setup through the Event Types settings page.
            </p>
            <Button asChild>
              <Link href="/settings/event-types">Complete Stripe Setup</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Stripe Dashboard</h2>
      </div>
      {/* TODO: handle null accountId */}
      <StripeDashboard accountId={stripeStatus.data.accountId ?? ''} />
    </div>
  )
}
