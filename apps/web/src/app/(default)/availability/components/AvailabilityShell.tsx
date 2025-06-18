import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface AvailabilityShellProps {
  children: React.ReactNode
}

export const AvailabilityShell = ({ children }: AvailabilityShellProps) => {
  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Static header that renders immediately */}
      <div className="mb-8">
        <h1 className="text-foreground text-4xl font-bold">Availability Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure when students can book mentoring sessions with you
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
