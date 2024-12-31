import { Button } from "~/components/ui/button";
import Link from "next/link";

export default function SentEmailVerification() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-sky-100 to-gray-100 px-4 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="mx-auto max-w-md space-y-6 rounded-lg border border-border/40 bg-card p-8 text-card-foreground shadow-lg backdrop-blur-md transition-all duration-300 dark:shadow-primary/5 sm:p-12">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-primary">Email Sent</h1>
          <p className="text-muted-foreground">
            We've sent a verification link to your email address. Please check
            your inbox and click the link to verify your email.
          </p>
        </div>
        <Link href="/">
          <Button type="button" className="w-full">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
