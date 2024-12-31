import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-50 via-blue-100 to-white px-4">
      <div className="mx-auto max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md sm:p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Verifying your email...</p>
        </div>
      </div>
    </div>
  );
}
