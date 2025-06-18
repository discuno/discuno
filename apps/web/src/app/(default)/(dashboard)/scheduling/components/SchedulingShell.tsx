import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface SchedulingShellProps {
  children: React.ReactNode
}

export const SchedulingShell = ({ children }: SchedulingShellProps) => {
  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Static header that renders immediately */}
      <div className="mb-8">
        <h1 className="text-foreground text-4xl font-bold">Scheduling Center</h1>
        <p className="text-muted-foreground mt-2">
          Manage your availability, event types, and booking preferences
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
