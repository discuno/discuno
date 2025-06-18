import { Suspense } from 'react'
import { IconLogo } from '~/components/icons/IconLogo'
import { TextLogo } from '~/components/icons/TextLogo'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'

interface AuthShellProps {
  children: React.ReactNode
}

export const AuthShell = ({ children }: AuthShellProps) => {
  return (
    <main className="bg-background min-h-screen">
      {/* Static branding that renders immediately */}
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full">
          {/* Static branding section */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-4">
              <IconLogo size={48} className="text-gray-900 dark:text-white" />
              <TextLogo height="2rem" className="text-foreground" />
            </div>
            <p className="text-muted-foreground text-lg">Connect with college student mentors</p>
          </div>

          {/* Dynamic content wrapped in Suspense */}
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </div>
    </main>
  )
}
