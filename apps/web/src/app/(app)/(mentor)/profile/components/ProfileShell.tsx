import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface ProfileShellProps {
  title: string
  description: string
  children: React.ReactNode
}

export const ProfileShell = ({ title, description, children }: ProfileShellProps) => {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Static header that renders immediately */}
      <div className="mb-8">
        <h1 className="text-foreground text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
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
