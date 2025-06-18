import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface MentorPaymentsShellProps {
  children: React.ReactNode
}

export const MentorPaymentsShell = ({ children }: MentorPaymentsShellProps) => {
  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Static header that renders immediately */}
      <div className="mb-8">
        <h1 className="text-foreground text-4xl font-bold">Payments & Earnings</h1>
        <p className="text-muted-foreground mt-2">
          Connect Stripe to receive payments and track your earnings
        </p>
      </div>

      {/* Dynamic content wrapped in Suspense */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  )
}
