import { getMentorStripeStatus } from '~/app/(app)/(mentor)/settings/actions'
import { StripeDashboard } from '~/app/(app)/(mentor)/settings/billing/StripeDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export default async function DashboardPage() {
  const stripeStatus = await getMentorStripeStatus()

  if (!stripeStatus.success || !stripeStatus.data?.hasAccount) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Stripe Account Not Connected</CardTitle>
            <CardDescription>
              Please connect your Stripe account to view your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Navigate to settings to connect your Stripe account and start accepting payments.</p>
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
