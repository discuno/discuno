import { Skeleton } from '~/components/ui/skeleton'

export function FindResultsSkeleton() {
  return (
    <section className="py-10 sm:py-14" aria-label="Loading mentor results" aria-busy="true">
      <div className="mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-11 w-full lg:hidden" />

        <div className="mt-8 grid gap-8 lg:mt-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <div className="hidden border-r pr-8 lg:block">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-3 h-4 w-48" />
            <div className="mt-7 flex flex-col gap-6">
              {[0, 1, 2].map(item => (
                <div key={item} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="mt-3 h-5 w-full max-w-lg" />

            <div className="mt-7 border-y">
              {[0, 1, 2].map(item => (
                <div
                  key={item}
                  className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-7 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-7"
                >
                  <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                  <div className="flex min-w-0 flex-col gap-3">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
