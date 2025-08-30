import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface ProfileShellProps {
  title: string
  description: string
  children: React.ReactNode
}

export const ProfileShell = ({ title, description, children }: ProfileShellProps) => {
  return (
    <>
      {/* Static header that renders immediately */}
      <div className="mb-8">
        <h1 className="text-foreground text-4xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 text-lg">{description}</p>
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
    </>
  )
}
