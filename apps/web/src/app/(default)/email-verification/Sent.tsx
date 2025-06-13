import { ContinueButton } from '~/app/(default)/email-verification/ContinueButton'

export const SentEmailVerification = async () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-sky-100 to-gray-100 px-4 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="border/40 bg-card text-card-foreground dark:shadow-primary/5 mx-auto max-w-md space-y-6 rounded-lg border p-8 shadow-lg backdrop-blur-md transition-all duration-300 sm:p-12">
        <div className="space-y-2 text-center">
          <h1 className="text-primary text-3xl font-bold">Email Sent</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a verification link to your email address. Please check your inbox and click the link to
            verify your email.
          </p>
        </div>
        <ContinueButton />
      </div>
    </div>
  )
}
