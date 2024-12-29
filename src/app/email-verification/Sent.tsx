import { Button } from "~/components/ui/button";
import Link from "next/link";

export default function SentEmailVerification() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-50 via-blue-100 to-white px-4">
      <div className="mx-auto max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md sm:p-12">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-blue-700">Email Sent</h1>
          <p className="text-gray-500 dark:text-gray-400">
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
