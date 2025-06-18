import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'
import { EmailVerificationContent } from './EmailVerificationContent'

interface EmailVerificationShellProps {
  searchParams: { status?: string }
}

export const EmailVerificationShell = ({ searchParams }: EmailVerificationShellProps) => {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Static header that renders immediately */}
      <div className="mb-8 text-center">
        <h1 className="text-foreground mb-4 text-4xl font-bold">Verify Your Email</h1>
        <p className="text-muted-foreground text-lg">
          Complete your verification to access mentor features
        </p>
      </div>

      {/* Dynamic content wrapped in Suspense */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <EmailVerificationContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
