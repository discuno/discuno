import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface SchedulingShellProps {
  children: React.ReactNode
}

export const SchedulingShell = ({ children }: SchedulingShellProps) => {
  return (
    <div className="container mx-auto max-w-6xl p-6">
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
