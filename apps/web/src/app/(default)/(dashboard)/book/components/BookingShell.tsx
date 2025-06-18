import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface BookingShellProps {
  username: string
  children: React.ReactNode
}

export const BookingShell = ({ username, children }: BookingShellProps) => {
  return (
    <div className="from-background via-muted/10 to-background min-h-screen bg-gradient-to-br">
      {/* Static header that renders immediately */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-foreground mb-4 text-4xl font-bold">Book a Session</h1>
          <p className="text-muted-foreground text-lg">
            Schedule a mentoring session with {username}
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
    </div>
  )
}
