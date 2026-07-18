import { Brand } from '~/components/shared/Brand'
import { Skeleton } from '~/components/ui/skeleton'
import { Spinner } from '~/components/ui/spinner'

const RootLoading = () => {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border/80 bg-background border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-12 sm:px-6 sm:py-16">
        <section
          className="flex w-full flex-col items-center text-center"
          aria-labelledby="loading-title"
          aria-live="polite"
          aria-busy="true"
        >
          <Spinner className="text-primary size-5" />
          <h1
            id="loading-title"
            className="font-display mt-4 text-2xl font-semibold tracking-tight"
          >
            Loading Discuno
          </h1>

          <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-3" aria-hidden="true">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </section>
      </main>
    </div>
  )
}

export default RootLoading
