import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'
import { FeedContent } from './FeedContent'

interface FeedShellProps {
  searchParams: { school?: string; major?: string; gradYear?: string }
}

export const FeedShell = ({ searchParams }: FeedShellProps) => {
  return (
    <main className="text-foreground min-h-screen">
      {/* Static layout that renders immediately */}
      <div className="relative">
        {/* Suspense boundary for dynamic content */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <FeedContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}
