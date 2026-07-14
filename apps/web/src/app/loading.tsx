import { Brand } from '~/components/shared/Brand'
import { Spinner } from '~/components/ui/spinner'

const RootLoading = () => {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/80 bg-background border-b">
        <div className="page-container flex h-16 items-center">
          <Brand />
        </div>
      </header>

      <main className="page-container py-12 sm:py-16">
        <div className="mx-auto max-w-5xl" aria-live="polite" aria-busy="true">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Spinner className="text-primary size-4" />
            <span>Loading Discuno</span>
          </div>

          <div className="mt-8 max-w-2xl space-y-4" aria-hidden="true">
            <div className="bg-muted h-3 w-24 animate-pulse rounded-full" />
            <div className="bg-muted h-10 w-full max-w-xl animate-pulse rounded-md" />
            <div className="bg-muted h-5 w-full max-w-2xl animate-pulse rounded-md" />
            <div className="bg-muted h-5 w-4/5 max-w-xl animate-pulse rounded-md" />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map(item => (
              <div key={item} className="border-border bg-card rounded-xl border p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-muted size-12 animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-2/3 animate-pulse rounded-md" />
                    <div className="bg-muted h-3 w-1/2 animate-pulse rounded-md" />
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <div className="bg-muted h-3 w-full animate-pulse rounded-md" />
                  <div className="bg-muted h-3 w-4/5 animate-pulse rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default RootLoading
