import { Skeleton } from '~/components/ui/skeleton'

export const BookingEmbedSkeleton = () => {
  return (
    <div
      className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.55fr)] lg:items-start lg:gap-8"
      aria-hidden="true"
    >
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="flex flex-col gap-2 border-b px-5 py-5 sm:px-7 sm:py-6">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <div className="flex flex-col gap-7 p-5 sm:p-7">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full" />
          </div>

          <div className="border-t pt-7">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <div className="mt-5 grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)]">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <div className="rounded-lg border p-4">
                  <Skeleton className="mx-auto h-6 w-32" />
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }).map((_, index) => (
                      <Skeleton key={index} className="aspect-square w-full" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48 max-w-full" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t pt-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t pt-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
