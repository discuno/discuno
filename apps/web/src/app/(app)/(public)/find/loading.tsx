import { Skeleton } from '~/components/ui/skeleton'
import { FindResultsSkeleton } from './components/FindResultsSkeleton'

export default function FindLoading() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <section className="border-b">
        <div className="mx-auto w-full max-w-[76rem] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Skeleton className="h-12 w-full max-w-xl sm:h-14" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
          <div className="mt-8 border-t pt-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-9 w-full max-w-3xl" />
          </div>
        </div>
      </section>
      <FindResultsSkeleton />
    </div>
  )
}
