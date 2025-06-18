import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface MentorEventTypesShellProps {
  children: React.ReactNode
}

export const MentorEventTypesShell = ({ children }: MentorEventTypesShellProps) => {
  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Static header that renders immediately */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-4xl font-bold">Event Types</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage different types of mentoring sessions
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
