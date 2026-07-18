import { Suspense } from 'react'
import { Skeleton } from '~/components/ui/skeleton'
import { Spinner } from '~/components/ui/spinner'
import { FeedContent } from './FeedContent'

interface FeedShellProps {
  searchParams: { school?: string; major?: string; gradYear?: string }
}

const FeedLoading = () => (
  <div className="min-h-screen" aria-live="polite" aria-busy="true">
    <div className="mx-auto grid w-full max-w-[76rem] gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-16">
      <div className="flex max-w-xl flex-col gap-5">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-16 w-full sm:h-24" />
        <Skeleton className="h-6 w-5/6" />
        <Skeleton className="h-11 w-40" />
      </div>
      <Skeleton className="aspect-[4/3] w-full rounded-xl lg:aspect-[7/6]" />
    </div>

    <div className="border-y">
      <div className="mx-auto grid w-full max-w-[76rem] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)] lg:px-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map(item => (
            <Skeleton key={item} className="h-11 w-full" />
          ))}
        </div>
      </div>
    </div>

    <div className="mx-auto w-full max-w-[76rem] px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
        <Spinner />
        Finding available mentors
      </div>
      <div className="mt-8 flex flex-col divide-y border-y">
        {[0, 1, 2].map(item => (
          <div key={item} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-6">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const FeedShell = ({ searchParams }: FeedShellProps) => {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Suspense fallback={<FeedLoading />}>
        <FeedContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
