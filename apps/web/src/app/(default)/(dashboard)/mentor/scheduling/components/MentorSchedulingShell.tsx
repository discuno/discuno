import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface MentorSchedulingShellProps {
  children: React.ReactNode
}

export const MentorSchedulingShell = ({ children }: MentorSchedulingShellProps) => {
  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Static header that renders immediately */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-4xl font-bold">Scheduling Center</h1>
            <p className="text-muted-foreground mt-2">
              Set your availability and create mentoring session types
            </p>
          </div>
        </div>
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
