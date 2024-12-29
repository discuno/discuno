import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function SentEmailVerification() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-50 via-blue-100 to-white px-4">
      <div className="mx-auto max-w-md space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-blue-700">
            Verify Your Email
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            We've sent a verification code to your email address. Enter the code
            below to confirm your identity.
          </p>
        </div>
        <form className="space-y-4">
          <div>
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              type="text"
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" className="w-full">
            Verify Email
          </Button>
        </form>
      </div>
    </div>
  );
}
