import { Spinner } from '~/components/ui/spinner'

const RootLoading = () => {
  return (
    <div className="animate-in fade-in flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-sky-100 to-gray-100 px-4 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="border/40 bg-card text-card-foreground dark:shadow-primary/5 mx-auto max-w-md space-y-6 rounded-lg border p-8 shadow-lg backdrop-blur-md transition-all duration-300 sm:p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Spinner className="text-primary h-12 w-12" />
            <div className="bg-primary/10 absolute inset-0 animate-pulse rounded-full"></div>
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-primary text-xl font-semibold">Loading</h2>
            <p className="text-muted-foreground text-sm">
              Please wait while we prepare your experience...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RootLoading
