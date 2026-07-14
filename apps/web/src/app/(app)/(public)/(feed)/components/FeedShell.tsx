import { Suspense } from 'react'
import { Spinner } from '~/components/ui/spinner'
import { FeedContent } from './FeedContent'

interface FeedShellProps {
  searchParams: { school?: string; major?: string; gradYear?: string }
}

export const FeedShell = ({ searchParams }: FeedShellProps) => {
  return (
    <div className="text-foreground min-h-screen">
      <Suspense
        fallback={
          <div className="flex min-h-[70vh] items-center justify-center gap-3">
            <Spinner />
            <span className="text-muted-foreground text-sm">Finding available mentors…</span>
          </div>
        }
      >
        <FeedContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
